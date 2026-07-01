// app/api/sync/init-backfill/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { apiErrorResponse } from "@/lib/api/api-error-response";
import { getSyncConfig } from "@/lib/dynamo/sync-config";
import { assertConnectionsReadyForBackfill } from "@/lib/app-state/connection-guards";

export const runtime = "nodejs";

const ROUTE = "POST /api/sync/init-backfill";

const lambda = new LambdaClient({
    region: process.env.AWS_REGION,
});

const START_BACKFILL_FUNCTION_NAME = process.env.START_BACKFILL_FUNCTION_NAME;

if (!START_BACKFILL_FUNCTION_NAME) {
    throw new Error("Missing env var START_BACKFILL_FUNCTION_NAME");
}

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
        const payload = JSON.stringify({ userId, spreadsheetId });

        await lambda.send(
            new InvokeCommand({
                FunctionName: START_BACKFILL_FUNCTION_NAME,
                InvocationType: "Event", // async, fire-and-forget
                Payload: new TextEncoder().encode(payload),
            }),
        );

        // We don't wait for the backfill to finish – just confirm the trigger worked
        return NextResponse.json({ ok: true });
    } catch (err) {
        return apiErrorResponse(ROUTE, 500, "Failed to start backfill", { userId, error: err });
    }
}
