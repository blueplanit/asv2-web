// lib/recovery/recovery-queries.ts
import { ddb } from "@/lib/dynamo";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { userPk, syncConfigSk, SyncConfig } from "@blueplanit/asv2-shared";
import { randomUUID } from "crypto";
import { RecoveryRunItem, recoveryRunSk, BACKFILL_RUN_TTL_SECONDS } from "@blueplanit/asv2-shared";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME!;

if (!TABLE_NAME) {
    throw new Error("DYNAMO_TABLE_NAME env var is required");
}

export class RecoveryLockError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "RecoveryLockError";
    }
}

export async function beginRecoveryRun(params: {
    syncConfig: SyncConfig;
    fromCursor: string; // lastSyncedEventId
    leaseSeconds: number;
    requestedAtIso?: string;
}): Promise<{ runId: string; leaseUntilEpoch: number; item: RecoveryRunItem }> {
    const { syncConfig, fromCursor, leaseSeconds } = params;
    
    const { runId, leaseUntilEpoch } = await acquireRecoveryLock(
        syncConfig.userId,
        syncConfig.spreadsheetId,
        syncConfig.syncStatus,
        leaseSeconds,
    );

    console.log("Acquired recovery lock", { runId, leaseUntilEpoch });
    try {
        const { item } = await writeRecoveryRunItem({
            syncConfig,
            fromCursor,
            leaseSeconds,
            runId,
            requestedAtIso: params.requestedAtIso,
        });

        return { runId, leaseUntilEpoch, item };
    } catch (err) {
        await releaseRecoveryLock(syncConfig.userId, syncConfig.spreadsheetId, runId);
        throw err;
    }
}

export async function acquireRecoveryLock(
    userId: string,
    spreadsheetId: string,
    expectedSyncStatus: SyncConfig["syncStatus"],
    leaseSeconds: number,
) {
    const runId = randomUUID();
    const nowMs = Date.now();
    const nowIso = new Date().toISOString();
    // TTL is in Seconds for DynamoDB standard, or just logic check. 
    // We use seconds here to match typical TTL patterns.
    const leaseUntilEpoch = Math.floor(nowMs / 1000) + leaseSeconds;

    const pk = userPk(userId);
    const sk = syncConfigSk(spreadsheetId);

    try {
        await ddb.send(
            new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { pk, sk },
                // Allow update IF:
                // 1. recoveryLeaseUntil doesn't exist (clean state)
                // 2. OR recoveryLeaseUntil is in the past (zombie state / expired lock)
                // 3. AND syncStatus is NOT 'retired' (dead workspace)
                ConditionExpression:
                    "(attribute_not_exists(recoveryLeaseUntil) OR recoveryLeaseUntil = :null OR recoveryLeaseUntil < :nowEpoch) " +
                    "AND syncStatus = :expectedStatus " +
                    "AND syncStatus <> :retired",
                UpdateExpression: [
                    "SET syncStatus = :status",
                    "recoveryRunId = :runId",
                    "recoveryStatus = :requested",
                    "recoveryLeaseUntil = :leaseUntil",
                    "recoveryRequestedAt = :nowIso",
                    "recoveryUpdatedAt = :nowIso",
                    "recoveryCompletedAt = :null",
                    "recoveryLastErrorCode = :null",
                    "recoveryLastErrorMessage = :null",
                    "nextSyncReason = :manual",
                    "lastError = :null",
                    "updatedAt = :nowIso"
                ].join(", "),
                ExpressionAttributeValues: {
                    ":retired": "retired",
                    ":nowEpoch": Math.floor(nowMs / 1000),
                    ":status": "backfill_running",
                    ":runId": runId,
                    ":requested": "requested",
                    ":leaseUntil": leaseUntilEpoch,
                    ":nowIso": nowIso,
                    ":null": null,
                    ":manual": "manual_trigger",
                    ":expectedStatus": expectedSyncStatus,
                },
            })
        );

        return { runId, leaseUntilEpoch };
    } catch (err: any) {
        console.error("Failed to acquire recovery lock", err);
        if (err?.name === "ConditionalCheckFailedException") {
            throw new RecoveryLockError("A recovery is already in progress (Lock held).");
        }
        throw err;
    }
}

/**
 * Best-effort rollback in case SQS enqueue fails
 */
export async function releaseRecoveryLock(userId: string, spreadsheetId: string, runId: string) {
    try {
        await ddb.send(
            new UpdateCommand({
                TableName: TABLE_NAME,
                Key: {
                    pk: userPk(userId),
                    sk: syncConfigSk(spreadsheetId)
                },
                // Only rollback if we are still the owner of the lock
                ConditionExpression: "recoveryRunId = :runId",
                UpdateExpression:
                    "SET syncStatus = :error, " +
                    "recoveryStatus = :failed, " +
                    "recoveryLastErrorMessage = :msg, " +
                    "recoveryLastErrorCode = :code " +
                    "REMOVE recoveryLeaseUntil",
                ExpressionAttributeValues: {
                    ":runId": runId,
                    ":error": "error",
                    ":failed": "failed",
                    ":msg": "Failed to enqueue recovery backfill job. Please try again.",
                    ":code": "sqs_enqueue_failed",
                },
            }),
        );
    } catch (err) {
        console.error("Failed to release recovery lock", err);
    }
}

/**
 * Writes RecoveryRunItem.
 */
export async function writeRecoveryRunItem(params: {
    syncConfig: SyncConfig;
    fromCursor: string; // lastSyncedEventId
    leaseSeconds: number;
    runId: string;
    requestedAtIso?: string;
}): Promise<{ runId: string; leaseUntilEpoch: number; item: RecoveryRunItem }> {
    const { syncConfig, fromCursor, leaseSeconds, runId } = params;

    const now = params.requestedAtIso ? new Date(params.requestedAtIso) : new Date();
    const nowIso = now.toISOString();
    const nowEpoch = Math.floor(now.getTime() / 1000);
    const leaseUntil = nowEpoch + leaseSeconds;

    const recoveryItem: RecoveryRunItem = {
        pk: userPk(syncConfig.userId),
        sk: recoveryRunSk(syncConfig.spreadsheetId, runId),
        type: "RecoveryRun",
        runId,
        spreadsheetId: syncConfig.spreadsheetId,
        stripeAccountId: syncConfig.stripeAccountId,
        fromCursor,
        status: "requested",
        requestedAt: nowIso,
        updatedAt: nowIso,
        attemptCount: 0,
        ttl: nowEpoch + BACKFILL_RUN_TTL_SECONDS,
    };

    // Create RecoveryRunItem (idempotency/audit)
    await ddb.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: recoveryItem,
            ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        }),
    );

    return { runId, leaseUntilEpoch: leaseUntil, item: recoveryItem };
}
