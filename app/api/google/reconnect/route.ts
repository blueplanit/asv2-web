// app/google/reconnect/route.ts
export const runtime = "nodejs";

import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
    getGoogleClientConfigForShard,
} from "@/lib/google/google-oauth-sharding";
import {
    GOOGLE_OAUTH_NONCE_COOKIE,
    makeGoogleOAuthState,
} from "@/lib/google/google-oauth-state";
import { getGoogleConnection } from "@/lib/google/google-connection";
import { sanitizeReturnTo } from "@/lib/app-state/oauth-state-core";


export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).email) {
        return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL));
    }

    const userId = (session.user as any).userId as string;
    const googleUserId = (session.user as any).googleUserId as string;
    if (!googleUserId) {
        return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL));
    }
    const loginHint = (session.user as any).email as string;

    const url = new URL(req.url);
    const returnTo = sanitizeReturnTo(url.searchParams.get("returnTo")) ?? "/dashboard";

    // Prefer existing connection’s shard when available (stable)
    let googleConnectResponse = await getGoogleConnection(userId, googleUserId);
    let shard = googleConnectResponse?.googleProjectShard;
    if (!shard) {
        return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL));
    }

    const { clientId } = getGoogleClientConfigForShard(shard);
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/google/callback`;

    const scopes = ["openid", "email", "https://www.googleapis.com/auth/drive.file"].join(" ");

    const { state, nonce } = makeGoogleOAuthState({
        userId,
        flow: "google-reconnect",
        shard,
        returnTo,
    });

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: scopes,
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
        login_hint: loginHint,
        state,
    });

    const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    const res = NextResponse.redirect(googleUrl);

    res.cookies.set(GOOGLE_OAUTH_NONCE_COOKIE, nonce, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 10 * 60,
    });

    return res;
}
