// app/api/sync/recover/route.ts
import "server-only";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

import { GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { randomUUID } from "crypto";

import { ddb } from "@/lib/dynamo";
import { getSqsClient } from "@/lib/sqs";
import { getSyncConfig } from "@/lib/sync-config";
import type { UserState } from "@/lib/user-state";

import { userPk, syncConfigSk, syncCursorSk } from "@blueplanit/asv2-shared";

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME; // set to your table
const BACKFILL_QUEUE_URL = process.env.BACKFILL_STANDARD_QUEUE_URL;

if (!TABLE_NAME) {
    throw new Error("DYNAMO_TABLE_NAME env var is required");
}
if (!BACKFILL_QUEUE_URL) {
    throw new Error("BACKFILL_STANDARD_QUEUE_URL env var is required");
}

const LEASE_SECONDS = 15 * 60; // 15 minutes
export const runtime = "nodejs";

type RecoveryBackfillMessage = {
    kind: "recovery_backfill_v1";
    runId: string;
    userId: string;
    spreadsheetId: string;
    stripeAccountId: string;
    googleUserId: string;
    fromCursor: string;
};

type Body = {
    spreadsheetId: string;
    userState: UserState; // to derive googleUserId
} | null;

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }
    const userId = (session.user as any).userId as string;

    const body = (await req.json().catch(() => null)) as Body;
    const spreadsheetId = body?.spreadsheetId;
    const userState = body?.userState;

    if (!spreadsheetId) {
        return new NextResponse("Missing spreadsheetId", { status: 400 });
    }
    if (!userState) {
        return new NextResponse("User state not found", { status: 400 });
    }

    const googleUserId = userState.profile?.googleUserId;
    if (!googleUserId) {
        return new NextResponse("Google user not connected", { status: 400 });
    }

    const sqs = getSqsClient();

    // 1) Load SyncConfig for this user + sheet
    const syncConfig = await getSyncConfig(userId, spreadsheetId);
    if (!syncConfig || !syncConfig.spreadsheetId) {
        return new NextResponse("Sync config not found", { status: 404 });
    }

    const stripeAccountId = (syncConfig as any).stripeAccountId as string | undefined;
    if (!stripeAccountId) {
        return new NextResponse("Stripe account not linked for this workspace", { status: 400 });
    }

    // 2) Pre-flight: load SyncCursor (must exist to know where to backfill from)
    const cursorKey = {
        pk: { S: userPk(userId) },
        sk: { S: syncCursorSk(stripeAccountId, spreadsheetId) },
    };

    const cursorResp = await ddb.send(
        new GetItemCommand({
            TableName: TABLE_NAME,
            Key: cursorKey,
            ConsistentRead: true,
        }),
    );

    const cursorItem = cursorResp.Item;
    const lastSyncedEventId =
        cursorItem && cursorItem.lastSyncedEventId && cursorItem.lastSyncedEventId.S
            ? cursorItem.lastSyncedEventId.S
            : null;

    if (!lastSyncedEventId) {
        return new NextResponse(
            "Cannot start recovery: sync cursor not found for this workspace.",
            { status: 409 },
        );
    }

    // 3) Atomic lock on SyncConfig
    const pk = { S: userPk(userId) };
    const sk = { S: syncConfigSk(spreadsheetId) };

    const nowMs = Date.now();
    const leaseSeconds = Math.floor((nowMs + LEASE_SECONDS * 1000) / 1000); // now + LEASE_SECONDS
    const runId = randomUUID();
    const nowIso = new Date().toISOString();

    try {
        await ddb.send(
            new UpdateItemCommand({
                TableName: TABLE_NAME,
                Key: { pk, sk },
                // Prevent double-trigger when a backfill is already running
                ConditionExpression:
                    "attribute_not_exists(syncStatus) OR syncStatus <> :status",
                UpdateExpression:
                    "SET syncStatus = :status, " +
                    "recoveryRunId = :runId, " +
                    "recoveryStatus = :requested, " +
                    "recoveryLeaseUntil = :leaseUntil, " +
                    "recoveryRequestedAt = :now, " +
                    "recoveryUpdatedAt = :now, " +
                    "writerBlocked = :false, " +
                    "nextSyncReason = :manual, " +
                    "lastError = :null, " +
                    "recoveryLastErrorMessage = :null",
                ExpressionAttributeValues: {
                    ":status": { S: "backfill_running" },
                    ":runId": { S: runId },
                    ":requested": { S: "requested" },
                    ":leaseUntil": { N: leaseSeconds.toString() }, // TTL-style epoch seconds
                    ":now": { S: nowIso },
                    ":null": { NULL: true },
                    ":false": { BOOL: false },
                    ":manual": { S: "manual_trigger" },
                    
                },
            }),
        );
    } catch (err: any) {
        if (err?.name === "ConditionalCheckFailedException") {
            return new NextResponse(
                "A recovery/backfill run is already in progress for this workspace.",
                { status: 409 },
            );
        }
        console.error("Failed to acquire recovery lock", err);
        return new NextResponse("Failed to start recovery", { status: 500 });
    }

    // 4) Enqueue SQS message; if this fails, attempt to mark recovery as failed
    const message: RecoveryBackfillMessage = {
        kind: "recovery_backfill_v1",
        runId,
        userId,
        spreadsheetId,
        stripeAccountId,
        googleUserId,
        fromCursor: lastSyncedEventId,
    };

    try {
        await sqs.send(
            new SendMessageCommand({
                QueueUrl: BACKFILL_QUEUE_URL,
                MessageBody: JSON.stringify(message),
            }),
        );
    } catch (err) {
        console.error("Failed to enqueue recovery backfill message", err);

        // Best-effort rollback of the lock so user is not stuck.
        try {
            await ddb.send(
                new UpdateItemCommand({
                    TableName: TABLE_NAME,
                    Key: { pk, sk },
                    UpdateExpression:
                        "SET syncStatus = :error, " +
                        "recoveryStatus = :failed, " +
                        "recoveryLastErrorMessage = :msg",
                    ExpressionAttributeValues: {
                        ":error": { S: "error" },
                        ":failed": { S: "failed" },
                        ":msg": {
                            S: "Failed to enqueue recovery backfill job. Please try again.",
                        },
                    },
                }),
            );
        } catch (rollbackErr) {
            console.error("Failed to rollback recovery lock after SQS error", rollbackErr);
        }

        return new NextResponse("Failed to enqueue recovery job", { status: 502 });
    }

    // 5) Success
    return NextResponse.json({ runId });
}
