import "server-only";
import { NextResponse } from "next/server";

/**
 * Logs an API error to stdout (visible in Vercel runtime logs) and returns a plain-text NextResponse.
 */
export function apiErrorResponse(
    route: string,
    status: number,
    message: string,
    extras?: Record<string, any> & { userId?: string; error?: unknown },
): NextResponse {
    const { userId, error } = extras ?? {};
    const logPayload: Record<string, unknown> = { route, status, message };
    if (userId) logPayload.userId = userId;
    if (error !== undefined) {
        logPayload.error = error instanceof Error ? error.message : String(error);
    }

    if (status >= 500) {
        console.error("[api-error]", logPayload, error);
    } else {
        console.warn("[api-error]", logPayload);
    }

    return new NextResponse(message, { status });
}
