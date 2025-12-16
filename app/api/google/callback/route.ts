// app/api/google/callback/route.ts
export const runtime = "nodejs";
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { putGoogleConnection } from "@/lib/google-connection";
import { createTokenCipher, googleConnectionAad, parseKeyringJson } from "@blueplanit/asv2-shared";

// add (module-level cipher)
const TOKEN_CIPHER_KEYRING_JSON = process.env.ASV2_TOKEN_CIPHER_KEYRING_JSON!;
if (!TOKEN_CIPHER_KEYRING_JSON) throw new Error("Missing ASV2_TOKEN_CIPHER_KEYRING_JSON");
const tokenCipher = createTokenCipher(parseKeyringJson(TOKEN_CIPHER_KEYRING_JSON));

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

    if (error || !code) {
        const errorUrl = new URL(
            "/onboarding?step=2&googleError=1",
            process.env.NEXTAUTH_URL,
        );
        return NextResponse.redirect(errorUrl);
    }

    // 1) Exchange code for tokens
    const tokenEndpoint = "https://oauth2.googleapis.com/token";
    const body = new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
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
        const errorUrl = new URL(
            "/onboarding?step=2&googleError=1",
            process.env.NEXTAUTH_URL,
        );
        return NextResponse.redirect(errorUrl);
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
        const errorUrl = new URL(
            "/onboarding?step=2&googleError=1",
            process.env.NEXTAUTH_URL,
        );
        return NextResponse.redirect(errorUrl);
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
        const errorUrl = new URL(
            "/onboarding?step=2&googleError=1",
            process.env.NEXTAUTH_URL,
        );
        return NextResponse.redirect(errorUrl);
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

        const mismatchUrl = new URL(
            "/onboarding?step=2&googleMismatch=1",
            process.env.NEXTAUTH_URL,
        );
        // Pass expected/actual emails for better UX in the snackbar / helper copy.
        mismatchUrl.searchParams.set("expectedEmail", sessionEmail);
        mismatchUrl.searchParams.set("actualEmail", email);

        return NextResponse.redirect(mismatchUrl);
    }

    // 3) Encrypt tokens for storage
    const pk = `USER#${userId}`;
    const sk = `GOOGLE#${googleUserId}`;
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
    });

    // 5) Back to onboarding, step 3 (Create sheet)
    const onboardingUrl = new URL("/onboarding?step=3", process.env.NEXTAUTH_URL);
    return NextResponse.redirect(onboardingUrl);
}
