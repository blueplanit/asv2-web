import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { getUserProfileByGoogleUserId } from "@/lib/dynamo/user-profile";
import { getSyncConfigs } from "@/lib/dynamo/sync-config";
import { hasCompletedOnboarding } from "@/lib/app-state/onboarding-status";
import { toSafeSyncConfig } from "@/lib/sync/safe-sync-config";

export const runtime = "nodejs";

// Called server-to-server from the Apps Script add-on (UrlFetchApp), so no CORS
// is needed. Identity comes from a verified Google ID token, not a raw email.
const oauthClient = new OAuth2Client();

// The add-on's GCP OAuth client id(s). ScriptApp.getIdentityToken() mints tokens
// with this as the audience; comma-separated to allow rotation / multiple projects.
function getAllowedAudiences(): string[] {
    return (process.env.GOOGLE_ADDON_OAUTH_CLIENT_ID ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
}

function extractBearerToken(req: NextRequest): string | null {
    const header = req.headers.get("authorization") ?? "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : null;
}

export async function GET(req: NextRequest) {
    const noStore = { "Cache-Control": "no-store" } as const;

    const allowedAudiences = getAllowedAudiences();
    if (allowedAudiences.length === 0) {
        console.error("[google-add-on/account-status] GOOGLE_ADDON_OAUTH_CLIENT_ID not configured");
        return NextResponse.json(
            { error: "Server misconfigured" },
            { status: 500, headers: noStore },
        );
    }

    const idToken = extractBearerToken(req);
    if (!idToken) {
        return NextResponse.json(
            { error: "Missing bearer token" },
            { status: 401, headers: noStore },
        );
    }

    let googleUserId: string;
    try {
        const ticket = await oauthClient.verifyIdToken({
            idToken,
            audience: allowedAudiences,
        });
        const payload = ticket.getPayload();
        if (!payload?.sub) {
            throw new Error("Token missing sub claim");
        }
        googleUserId = payload.sub;
    } catch (error) {
        console.warn("[google-add-on/account-status] token verification failed", {
            message: error instanceof Error ? error.message : "unknown",
        });
        return NextResponse.json(
            { error: "Invalid token" },
            { status: 401, headers: noStore },
        );
    }

    try {
        const profile = await getUserProfileByGoogleUserId(googleUserId);
        if (!profile) {
            return NextResponse.json(
                { hasAccount: false },
                { headers: noStore },
            );
        }

        const syncConfigs = await getSyncConfigs(profile.userId);
        const safeConfigs = syncConfigs.map(toSafeSyncConfig);

        return NextResponse.json(
            {
                hasAccount: true,
                onboardingComplete: hasCompletedOnboarding(syncConfigs),
                syncConfigs: safeConfigs,
                configCount: safeConfigs.length,
            },
            { headers: noStore },
        );
    } catch (error) {
        console.error("[google-add-on/account-status] lookup failed", { error });
        return NextResponse.json(
            {
                error: "Lookup failed",
                message:
                    error instanceof Error ? error.message : "Unexpected lookup error",
            },
            { status: 500, headers: noStore },
        );
    }
}
