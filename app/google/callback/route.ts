// app/google/callback/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error || !code) {
        // Optional: send them back to step 2 with an error flag
        const errorUrl = new URL("/onboarding?step=2&googleError=1", process.env.NEXTAUTH_URL);
        return NextResponse.redirect(errorUrl);
    }

    // (Optional) You *can* exchange the code for tokens here,
    // but per your "for now" requirement, we won't store or use them yet.
    // const tokenEndpoint = "https://oauth2.googleapis.com/token";
    // const body = new URLSearchParams({
    //   code,
    //   client_id: process.env.GOOGLE_CLIENT_ID!,
    //   client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    //   redirect_uri: `${process.env.NEXTAUTH_URL}/google/callback`,
    //   grant_type: "authorization_code",
    // });
    // const tokenRes = await fetch(tokenEndpoint, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/x-www-form-urlencoded" },
    //   body,
    // });
    // const tokenJson = await tokenRes.json();
    // console.log("Google drive.file token response (dev):", tokenJson);

    // Success → jump user back into onboarding at step 3
    const onboardingUrl = new URL("/onboarding?step=3", process.env.NEXTAUTH_URL);
    return NextResponse.redirect(onboardingUrl);
}
