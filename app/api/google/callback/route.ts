// app/api/google/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { putGoogleConnection } from "@/lib/google-connection";
import { encrypt } from "@/lib/google-auth";

import { ddb } from "@/lib/dynamo";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { UserProfileSchema } from "@/lib/schemas/user-profile";

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME!;

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
        return new Response("Unauthorized", { status: 401 });
    }
    const authUserId = (session.user as any).id as string;

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

    // 3) Load canonical profile + enforce same Google identity
    const profileRes = await ddb.send(
        new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                pk: `USER#${authUserId}`,
                sk: "PROFILE",
            },
        }),
    );

    if (!profileRes.Item) {
        console.error("User profile not found for authUserId", authUserId);
        const errorUrl = new URL(
            "/onboarding?step=2&googleError=1",
            process.env.NEXTAUTH_URL,
        );
        return NextResponse.redirect(errorUrl);
    }

    const profile = UserProfileSchema.parse(profileRes.Item);

    // Prefer strict check on googleUserId; fall back to email if needed
    const hasProfileGoogleId = Boolean(profile.googleUserId);
    const idsMismatch =
        hasProfileGoogleId && profile.googleUserId !== googleUserId;
    const emailsMismatch =
        !hasProfileGoogleId &&
        profile.email &&
        profile.email.toLowerCase() !== email.toLowerCase();

    if (idsMismatch || emailsMismatch) {
        console.error("Google account mismatch during Sheets connect", {
            authUserId,
            expectedGoogleUserId: profile.googleUserId,
            expectedEmail: profile.email,
            actualGoogleUserId: googleUserId,
            actualEmail: email,
        });

        const mismatchUrl = new URL(
            `/onboarding?step=2&googleMismatch=1`,
            process.env.NEXTAUTH_URL,
        );
        // Optional: pass expected/actual emails to show in UI (URL-encoded)
        mismatchUrl.searchParams.set("expectedEmail", profile.email);
        mismatchUrl.searchParams.set("actualEmail", email);

        return NextResponse.redirect(mismatchUrl);
    }

    // 4) Encrypt tokens for storage
    const accessTokenEncrypted = encrypt({
        accessToken,
        scope: tokenJson.scope,
        tokenType: tokenJson.token_type,
        expiresAt: tokenJson.expires_in
            ? Date.now() + tokenJson.expires_in * 1000
            : undefined,
    });

    const refreshTokenEncrypted = encrypt({
        refreshToken,
    });

    // 5) Write GoogleConnection item into DynamoDB
    await putGoogleConnection({
        authUserId,
        googleUserId,
        email,
        accessTokenEncrypted,
        refreshTokenEncrypted,
    });

    // 6) Back to onboarding, step 3 (Create sheet)
    const onboardingUrl = new URL("/onboarding?step=3", process.env.NEXTAUTH_URL);
    return NextResponse.redirect(onboardingUrl);
}
