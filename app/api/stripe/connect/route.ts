// app/api/stripe/connect/route.ts
import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { makeState, STRIPE_OAUTH_NONCE_COOKIE } from "@/lib/stripe-oauth-state";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).userId) {
        return new Response("Unauthorized", { status: 401 });
    }
    const userId = (session.user as any).userId as string;

    // Optional: allow returnTo override, default to onboarding step 2 after Stripe connect
    const url = new URL(req.url);
    const returnTo = url.searchParams.get("returnTo") ?? "/onboarding?step=2";

    const { state, nonce } = await makeState({
        userId,
        flow: "stripe-connect",
        returnTo,
    });

    const params = new URLSearchParams({
        response_type: "code",
        client_id: process.env.STRIPE_CLIENT_ID!,
        scope: "read_only",
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/stripe/callback`,
        state,
    });

    const redirectUrl = "https://connect.stripe.com/oauth/authorize?" + params.toString();
    const res = NextResponse.redirect(redirectUrl);

    res.cookies.set(STRIPE_OAUTH_NONCE_COOKIE, nonce, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 10 * 60,
    });

    return res;
}
