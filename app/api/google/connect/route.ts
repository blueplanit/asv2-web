// app/google/connect/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
    selectGoogleProjectShardForUser,
    getGoogleClientConfigForShard,
} from "@/lib/google/google-oauth-sharding";
import {
    GOOGLE_OAUTH_NONCE_COOKIE,
    makeGoogleOAuthState,
} from "@/lib/google/google-oauth-state";

export async function GET(_req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).email) {
        // If somehow not authenticated here, bounce them to login.
        return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL));
    }

    const userId = (session.user as any).userId as string;

    const googleProjectShard = selectGoogleProjectShardForUser(userId);
    const { clientId } = getGoogleClientConfigForShard(googleProjectShard);
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/google/callback`;
    const loginHint = (session.user as any).email as string;

    const scopes = [
        "openid",
        "email",
        "https://www.googleapis.com/auth/drive.file"
    ].join(" ");

    const { state, nonce } = makeGoogleOAuthState({
        userId,
        flow: "google-connect",
        shard: googleProjectShard,
        returnTo: "/onboarding?step=3",
    });

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: scopes,
        access_type: "offline",
        prompt: "consent",              // force consent so we get a refresh token
        include_granted_scopes: "true", // incremental auth
        login_hint: loginHint,          // nudge user to pick the same Google account
        state: state
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    const res = NextResponse.redirect(url);
    res.cookies.set(GOOGLE_OAUTH_NONCE_COOKIE, nonce, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 10 * 60,
    });

    return res;
}
