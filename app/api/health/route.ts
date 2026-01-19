import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    // Simple auth: require token either as header or query param
    const url = new URL(req.url);
    const token =
        req.headers.get("x-health-token") ?? url.searchParams.get("token");
    if (!process.env.HEALTHCHECK_TOKEN || token !== process.env.HEALTHCHECK_TOKEN) {
        return NextResponse.json({ ok: false }, { status: 404 });
    }

    const vercelEnv = process.env.VERCEL_ENV ?? "unknown"; // production|preview|development on Vercel

    return NextResponse.json({
        status: 200,
        ok: true,
        vercelEnv,
        nodeEnv: process.env.NODE_ENV,
        deployment: {
            gitCommit: process.env.VERCEL_GIT_COMMIT_SHA,
            gitBranch: process.env.VERCEL_GIT_COMMIT_REF,
        },
        ts: new Date().toISOString(),
    });
}
