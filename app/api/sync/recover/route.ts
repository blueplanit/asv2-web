// app/api/sync/recover/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { ddb } from "@/lib/dynamo";
import { getSqsClient } from "@/lib/sqs";
import { getSyncConfig } from "@/lib/sync-config";
import type { UserState } from "@/lib/user-state";
import { userPk, syncCursorSk, SyncConfig, BACKFILL_LEASE_DURATION_SECONDS } from "@blueplanit/asv2-shared";
import type { RecoveryBackfillMessage } from "@blueplanit/asv2-shared";
import { beginRecoveryRun, RecoveryLockError, releaseRecoveryLock } from "@/lib/recovery-queries";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { preflightRecovery } from "@/lib/recovery-preflight";

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME;
const BACKFILL_QUEUE_URL = process.env.BACKFILL_STANDARD_QUEUE_URL;

if (!TABLE_NAME) {
    throw new Error("DYNAMO_TABLE_NAME env var is required");
}
if (!BACKFILL_QUEUE_URL) {
    throw new Error("BACKFILL_STANDARD_QUEUE_URL env var is required");
}

export const runtime = "nodejs";

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

    // 1) Load SyncConfig for this user + sheet
    const syncConfig = await getSyncConfig(userId, spreadsheetId);
    if (!syncConfig || !syncConfig.spreadsheetId) {
        return new NextResponse("Sync config not found", { status: 404 });
    }

    const stripeAccountId = (syncConfig as any).stripeAccountId as string | undefined;
    if (!stripeAccountId) {
        return new NextResponse("Stripe account not linked for this workspace", { status: 400 });
    }

    const preflight = await preflightRecovery({
        userId,
        googleUserId,
        stripeAccountId,
    });
    
    if (!preflight.ok) {
        return NextResponse.json(
            { code: preflight.code, message: preflight.message },
            { status: 409 },
        );
    }

    const gateError = gateRecoveryStart(syncConfig);
    if (gateError) {
        console.error("Failed to start recovery", gateError);
        return new NextResponse(gateError.message, { status: gateError.status });
    }

    // 2) Pre-flight: load SyncCursor (must exist to know where to backfill from)
    const cursorKey = {
        pk: userPk(userId),
        sk: syncCursorSk(stripeAccountId, spreadsheetId),
    };

    const cursorResp = await ddb.send(
        new GetCommand({
            TableName: TABLE_NAME,
            Key: cursorKey,
            ConsistentRead: true,
        }),
    );

    const cursorItem = cursorResp.Item as { lastSyncedEventId?: string } | undefined;
    const lastSyncedEventId = cursorItem?.lastSyncedEventId ?? null;

    if (!lastSyncedEventId) {
        return new NextResponse(
            "Cannot start recovery: sync cursor not found for this workspace.",
            { status: 409 },
        );
    }

    // 3) Atomic lock on SyncConfig
    let lockData: { runId: string };
    
    try {
        lockData = await beginRecoveryRun({ syncConfig, fromCursor: lastSyncedEventId, leaseSeconds: BACKFILL_LEASE_DURATION_SECONDS });
    } catch (err) {
        if (err instanceof RecoveryLockError) {
            return new NextResponse(err.message, { status: 409 });
        }
        console.error("Failed to acquire recovery lock", err);
        return new NextResponse("Internal Error: Failed to start recovery", { status: 500 });
    }

    const { runId } = lockData;

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

    const sqs = getSqsClient();

    try {
        await sqs.send(
            new SendMessageCommand({
                QueueUrl: BACKFILL_QUEUE_URL,
                MessageBody: JSON.stringify(message),
            }),
        );
    } catch (err) {
        // Best-effort rollback of the lock so user is not stuck.
        console.error("Failed to enqueue recovery backfill message", err);
        // Rollback lock
        await releaseRecoveryLock(userId, spreadsheetId, runId);
        return new NextResponse("Failed to enqueue recovery job", { status: 502 });
    }

    // 5) Success
    return NextResponse.json({ runId });
}


type GateError = { status: number; message: string };

/**
 * Pure gating function: decides whether a recovery run is allowed for this SyncConfig.
 * Returns null if allowed; otherwise an HTTP error description the handler can return.
 */
function gateRecoveryStart(syncConfig: SyncConfig): GateError | null {
    const {
        syncStatus,
        writerBlocked,
        writerBlockedReason,
        recoveryStatus,
        stripeDataSyncMap,
    } = syncConfig;

    // Retired workspace: never recover. Explicitly dead.
    if (syncStatus === "retired") {
        return {
            status: 409,
            message: "This workspace has been retired and cannot be recovered.",
        };
    }

    // Not fully onboarded: nothing to recover.
    if (syncStatus === "onboarding") {
        return {
            status: 409,
            message:
                "This workspace is still being set up. Complete onboarding before running recovery.",
        };
    }

    // Recovery already in-flight in the recovery state machine.
    if (
        recoveryStatus &&
        (recoveryStatus === "requested" ||
            recoveryStatus === "pulling" ||
            recoveryStatus === "writing")
    ) {
        return {
            status: 409,
            message: "A recovery run is already in progress for this workspace.",
        };
    }

    // Already backfilling at the sync layer.
    if (syncStatus === "backfill_running") {
        return {
            status: 409,
            message:
                "A backfill or recovery is already running for this workspace.",
        };
    }

    // No data enabled: don't start recovery if nothing is configured to sync.
    const hasEnabledStripeData = !!stripeDataSyncMap?.some((entry) => entry.enabled);
    if (!hasEnabledStripeData) {
        return {
            status: 400,
            message:
                "No Stripe data is enabled for this workspace. Enable at least one data set before running recovery.",
        };
    }

    // Do not override a manual pause.
    if (writerBlockedReason === "manual" && syncStatus === "paused") {
        return {
            status: 409,
            message:
                "This workspace is manually paused. Resume syncing instead of running recovery.",
        };
    }

    // Future-proof: block recovery while the environment is obviously invalid.
    if (
        writerBlocked &&
        (writerBlockedReason === "oauth_revoked" ||
            writerBlockedReason === "permission_denied" ||
            writerBlockedReason === "sheet_layout_incompatible" ||
            writerBlockedReason === "config_invalid")
    ) {
        return {
            status: 409,
            message:
                "This workspace is blocked by a configuration or permission issue. Fix the underlying issue before running recovery.",
        };
    }

    // Recovery is a corrective action: only for error or blocked-paused.
    const isRecoverableStatus = syncStatus === "error" || (syncStatus === "paused" && writerBlocked === true);

    if (!isRecoverableStatus) {
        return {
            status: 409,
            message:
                "Recovery is only available when the sync is blocked or in error. Use Resume or Pause instead.",
        };
    }

    return null;
}
