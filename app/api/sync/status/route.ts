// app/api/sync/status/route.ts
import "server-only";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSyncConfig } from "@/lib/dynamo/sync-config";

export const runtime = "nodejs";

type RecoveryStatus = "requested" | "pulling" | "writing" | "success" | "failed";

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

    const recoveryStatus = (cfg as any).recoveryStatus as RecoveryStatus | undefined;
    const recoveryRunId = (cfg as any).recoveryRunId as string | undefined;
    const recoveryLeaseUntil = (cfg as any).recoveryLeaseUntil ?? null;

    const recoveryLastErrorMessage =
        (cfg as any).recoveryLastErrorMessage ??
        (cfg as any).lastError ??
        null;

    return NextResponse.json({
        syncStatus: cfg.syncStatus,
        recoveryStatus: recoveryStatus ?? null,
        recoveryRunId: recoveryRunId ?? null,
        recoveryLeaseUntil,
        recoveryLastErrorMessage,
    });
}
