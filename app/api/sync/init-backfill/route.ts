// app/api/sync/init-backfill/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { apiErrorResponse } from "@/lib/api/api-error-response";
import { getSyncConfig } from "@/lib/dynamo/sync-config";
import { assertConnectionsReadyForBackfill } from "@/lib/app-state/connection-guards";
import { triggerInitialBackfill } from "@/lib/sync/trigger-backfill";

export const runtime = "nodejs";

const ROUTE = "POST /api/sync/init-backfill";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).userId) {
        return apiErrorResponse(ROUTE, 401, "Your session expired. Sign in again to continue.");
    }

    const userId = (session.user as any).userId as string;

    const body = await req.json().catch(() => null as any);
    const spreadsheetId = body?.spreadsheetId as string | undefined;

    if (!spreadsheetId) {
        return apiErrorResponse(ROUTE, 400, "We couldn't find a spreadsheet to backfill. Please check your settings and try again.");
    }
   
    const syncConfig = await getSyncConfig(userId, spreadsheetId);
    if (!syncConfig) {
        console.error("Sync config not found for user:", userId, spreadsheetId);
        return new NextResponse("Something went wrong. Please try again.", { status: 404 });
    }

    const guard = await assertConnectionsReadyForBackfill(userId, syncConfig);
    if (!guard.ok) {
        return new NextResponse(guard.message, { status: 409 });
    }

    try {
        await triggerInitialBackfill(userId, spreadsheetId);
        return NextResponse.json({ ok: true });
    } catch (err) {
        return apiErrorResponse(ROUTE, 500, "Failed to start backfill", { userId, error: err });
    }
}
