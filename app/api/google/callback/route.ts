// app/api/google/callback/route.ts
export const runtime = "nodejs";
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { putGoogleConnection } from "@/lib/google-connection";
import { createTokenCipher, googleConnectionAad, googleConnectSk, parseKeyringJson, userPk } from "@blueplanit/asv2-shared";
import { getGoogleClientConfigForShard } from "@/lib/google-oauth-sharding";
import {
    verifyGoogleOAuthState,
    GOOGLE_OAUTH_NONCE_COOKIE,
} from "@/lib/google-oauth-state";
import { sanitizeReturnTo } from "@/lib/oauth-state-core";

// add (module-level cipher)
const TOKEN_CIPHER_KEYRING_JSON = process.env.ASV2_TOKEN_CIPHER_KEYRING_JSON!;
if (!TOKEN_CIPHER_KEYRING_JSON) throw new Error("Missing ASV2_TOKEN_CIPHER_KEYRING_JSON");
const tokenCipher = createTokenCipher(parseKeyringJson(TOKEN_CIPHER_KEYRING_JSON));

function clearNonceCookie(res: NextResponse) {
    res.cookies.set(GOOGLE_OAUTH_NONCE_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
    });
    return res;
}

function redirectFor(flow: "google-connect" | "google-reconnect", returnTo?: string) {
    if (flow === "google-reconnect") return sanitizeReturnTo(returnTo) ?? "/dashboard";
    return "/onboarding?step=3";
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).userId) {
        return new Response("Unauthorized", { status: 401 });
    }
    const userId = (session.user as any).userId as string;
    const sessionGoogleUserId = (session.user as any).googleUserId as string | undefined;
    const sessionEmail = session.user.email ?? "";

    const url = new URL(req.url);
    const searchParams = url.searchParams;

    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const rawState = searchParams.get("state");
    const cookieNonce = req.cookies.get(GOOGLE_OAUTH_NONCE_COOKIE)?.value ?? null;

    const verified = verifyGoogleOAuthState(
        rawState,
        userId,
        cookieNonce,
    );

    // Default to connect redirects if state can’t be trusted
    const fallbackBase = "/onboarding?step=2";

    if (!verified.ok && "reason" in verified) {
        const errUrl = new URL(fallbackBase, process.env.NEXTAUTH_URL);
        errUrl.searchParams.set("googleError", "state");
        errUrl.searchParams.set("reason", verified.reason);
        return clearNonceCookie(NextResponse.redirect(errUrl));
    }

    const { payload } = verified;
    const flow = payload.flow;
    const base = redirectFor(flow, payload.returnTo);

    if (error || !code) {
        const errorUrl = new URL(base, process.env.NEXTAUTH_URL);
        errorUrl.searchParams.set("googleError", "oauth");
        return clearNonceCookie(NextResponse.redirect(errorUrl));
    }

    // get clientId/secret for chosen shard
    const { clientId, clientSecret } = getGoogleClientConfigForShard(payload.shard);

    // 1) Exchange code for tokens
    const tokenEndpoint = "https://oauth2.googleapis.com/token";
    const body = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/google/callback`,
        grant_type: "authorization_code",
    });

    const tokenRes = await fetch(tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });

    if (!tokenRes.ok) {
        console.error("Google token exchange failed:", tokenRes.status, await tokenRes.text());
        const errUrl = new URL(base, process.env.NEXTAUTH_URL);
        errUrl.searchParams.set("googleError", "token_exchange");
        return clearNonceCookie(NextResponse.redirect(errUrl));
    }

    const tokenJson = await tokenRes.json() as {
        access_token?: string;
        refresh_token?: string;
        id_token?: string;
        expires_in?: number;
        scope?: string;
        token_type?: string;
    };

    const accessToken = tokenJson.access_token;
    const refreshToken = tokenJson.refresh_token;

    if (!accessToken || !refreshToken) {
        console.error("Missing access/refresh token from Google:", tokenJson);
        const errUrl = new URL(base, process.env.NEXTAUTH_URL);
        errUrl.searchParams.set("googleError", "missing_tokens");
        return clearNonceCookie(NextResponse.redirect(errUrl));
    }

    // 2) Get the Sheets account identity (sub + email)
    const userinfoRes = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
            headers: { Authorization: `Bearer ${accessToken}` },
        },
    );

    if (!userinfoRes.ok) {
        console.error("Google userinfo failed:", userinfoRes.status, await userinfoRes.text());
        const errUrl = new URL(base, process.env.NEXTAUTH_URL);
        errUrl.searchParams.set("googleError", "userinfo");
        return clearNonceCookie(NextResponse.redirect(errUrl));
    }

    const userinfo = await userinfoRes.json() as {
        sub: string;
        email: string;
    };

    const googleUserId = userinfo.sub;
    const email = userinfo.email;

    // Enforce that the Sheets OAuth account matches the login Google account.
    // We compare the Google "sub" from the userinfo call with the one stored in the session.
    if (sessionGoogleUserId && sessionGoogleUserId !== googleUserId) {
        console.error("Google account mismatch during Sheets connect", {
            userId,
            expectedGoogleUserId: sessionGoogleUserId,
            expectedEmail: sessionEmail,
            actualGoogleUserId: googleUserId,
            actualEmail: email,
        });

        const mismatchUrl = new URL(base, process.env.NEXTAUTH_URL);
        mismatchUrl.searchParams.set("googleMismatch", "1");
        mismatchUrl.searchParams.set("expectedEmail", sessionEmail);
        mismatchUrl.searchParams.set("actualEmail", email);
    
        return clearNonceCookie(NextResponse.redirect(mismatchUrl));
    }

    // 3) Encrypt tokens for storage
    const pk = userPk(userId);
    const sk = googleConnectSk(googleUserId);
    const aad = googleConnectionAad({ userId, googleUserId, pk, sk });
    const accessTokenEncrypted = await tokenCipher.encrypt(
        {
            accessToken,
            scope: tokenJson.scope,
            tokenType: tokenJson.token_type,
            expiresAt: tokenJson.expires_in ? Date.now() + tokenJson.expires_in * 1000 : undefined,
        },
        { purpose: "google_access_v1", aad },
    );

    const refreshTokenEncrypted = await tokenCipher.encrypt(
        { refreshToken },
        { purpose: "google_refresh_v1", aad },
    );

    // 4) Write GoogleConnection item into DynamoDB
    await putGoogleConnection({
        pk,
        sk,
        userId,
        googleUserId,
        email,
        accessTokenEncrypted,
        refreshTokenEncrypted,
        googleProjectShard: payload.shard,
    });

    // 5) Back to onboarding, step 3 (Create sheet)
    const onboardingUrl = new URL(base, process.env.NEXTAUTH_URL);
    return clearNonceCookie(NextResponse.redirect(onboardingUrl));
}
