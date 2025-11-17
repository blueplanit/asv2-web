// app/google/connect/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const redirectUri = `${process.env.NEXTAUTH_URL}/google/callback`;

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/drive.file",
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
        // TODO: add a real state/CSRF token later
        state: "dev-placeholder-state",
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return NextResponse.redirect(url);
}
