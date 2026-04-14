// app/api/sync/status/route.ts
import "server-only";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSyncConfig } from "@/lib/dynamo/sync-config";
import type { SyncConfig } from "@blueplanit/asv2-shared";

export const runtime = "nodejs";

type RecoveryStatus = "requested" | "pulling" | "writing" | "success" | "failed";

/**
 * When recovery is triggered via stripe-events-pull, Dynamo may keep recoveryStatus as
 * "requested" until we infer completion from sync state (minimal server change).
 */
function deriveDisplayedRecoveryStatus(cfg: SyncConfig): RecoveryStatus | null {
    const raw = cfg.recoveryStatus as RecoveryStatus | undefined | null;
    if (raw == null) {
        return null;
    }

    if (raw === "success" || raw === "failed") {
        return raw;
    }

    // Legacy recovery-backfill lambda still advances through pulling / writing.
    if (raw === "pulling" || raw === "writing") {
        return raw;
    }

    // raw === "requested"
    const syncStatus = cfg.syncStatus;
    if (syncStatus === "error") {
        return "failed";
    }
    if (syncStatus === "gap_backfill_running" || syncStatus === "backfill_running") {
        return "pulling";
    }

    if (syncStatus === "syncing") {
        const lastSyncAt = cfg.lastSyncAt;
        const recoveryRequestedAt = cfg.recoveryRequestedAt;
        if (
            typeof lastSyncAt === "string" &&
            typeof recoveryRequestedAt === "string" &&
            lastSyncAt &&
            recoveryRequestedAt
        ) {
            const lastMs = Date.parse(lastSyncAt);
            const reqMs = Date.parse(recoveryRequestedAt);
            if (!Number.isNaN(lastMs) && !Number.isNaN(reqMs) && lastMs > reqMs) {
                return "success";
            }
        }
    }

    return "requested";
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }
    const userId = (session.user as any).userId as string;

    const url = new URL(req.url);
    const spreadsheetId = url.searchParams.get("spreadsheetId");

    if (!spreadsheetId) {
        return new NextResponse("Missing spreadsheetId", { status: 400 });
    }

    const cfg = await getSyncConfig(userId, spreadsheetId);
    if (!cfg) {
        return new NextResponse("Sync config not found", { status: 404 });
    }

    const recoveryStatus = deriveDisplayedRecoveryStatus(cfg);
    const recoveryRunId = cfg.recoveryRunId ?? null;
    const recoveryLeaseUntil = cfg.recoveryLeaseUntil ?? null;

    const recoveryLastErrorMessage =
        cfg.recoveryLastErrorMessage ?? cfg.lastError ?? null;

    return NextResponse.json({
        syncStatus: cfg.syncStatus,
        recoveryStatus,
        recoveryRunId,
        recoveryLeaseUntil,
        recoveryLastErrorMessage,
    });
}
