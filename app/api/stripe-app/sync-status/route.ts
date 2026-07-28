import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getSyncConfigsByStripeAccountId } from "@/lib/dynamo/sync-config";
import { toSafeSyncConfig } from "@/lib/sync/safe-sync-config";

export const runtime = "nodejs";

function getCorsHeaders(req: NextRequest) {
    const origin = req.headers.get("origin") ?? "*";
    const requestedHeaders =
        req.headers.get("access-control-request-headers") ?? "Content-Type";

    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": requestedHeaders,
        "Access-Control-Allow-Private-Network": "true",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin, Access-Control-Request-Headers, Access-Control-Request-Private-Network",
    };
}

export function OPTIONS(req: NextRequest) {
    return new NextResponse(null, {
        status: 204,
        headers: getCorsHeaders(req),
    });
}

export async function GET(req: NextRequest) {
    const corsHeaders = getCorsHeaders(req);
    const stripeAccountId = req.nextUrl.searchParams.get("stripeAccountId")?.trim();

    if (!stripeAccountId || !stripeAccountId.startsWith("acct_")) {
        return NextResponse.json(
            { error: "Missing or invalid stripeAccountId" },
            {
                status: 400,
                headers: { ...corsHeaders, "Cache-Control": "no-store" },
            },
        );
    }

    console.log("[stripe-app/sync-status] lookup start", {
        origin: req.headers.get("origin"),
        stripeAccountId,
    });

    try {
        const syncConfigs = await getSyncConfigsByStripeAccountId(stripeAccountId);

        // Only return status fields — no spreadsheet IDs, user IDs, or error details
        const safeConfigs = syncConfigs.map(toSafeSyncConfig);

        console.log("[stripe-app/sync-status] lookup result", {
            stripeAccountId,
            configCount: safeConfigs.length,
        });

        return NextResponse.json(
            {
                syncConfigs: safeConfigs,
                configCount: safeConfigs.length,
            },
            {
                headers: { ...corsHeaders, "Cache-Control": "no-store" },
            },
        );
    } catch (error) {
        console.error("[stripe-app/sync-status] lookup failed", {
            stripeAccountId,
            error,
        });

        return NextResponse.json(
            {
                error: "Lookup failed",
                message:
                    error instanceof Error ? error.message : "Unexpected lookup error",
            },
            {
                status: 500,
                headers: { ...corsHeaders, "Cache-Control": "no-store" },
            },
        );
    }
}
