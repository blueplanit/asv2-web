// app/api/stripe/callback/route.ts
import "server-only";
import Stripe from "stripe";
import { STRIPE_OAUTH_NONCE_COOKIE, verifyStripeOAuthState } from "@/lib/stripe/stripe-oauth-state";
import { putStripeConnection } from "@/lib/stripe/stripe-connection";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function clearNonceCookie(res: NextResponse) {
    res.cookies.set(STRIPE_OAUTH_NONCE_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
    });
    return res;
}

function isOnboardingPath(path?: string | null): boolean {
    if (!path) return true;
    return path.startsWith("/onboarding");
}

function stripeErrorReturnTo(returnTo?: string | null): string {
    if (isOnboardingPath(returnTo)) {
        return "/onboarding?step=1";
    }
    return returnTo!;
}

export async function GET(req: NextRequest) {
    console.log('Stripe Connect callback invoked');
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !(session.user as any).userId) {
            return new Response("Unauthorized", { status: 401 });
        }
        const currentUserId = (session.user as any).userId as string;

        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        const cookieNonce = req.cookies.get(STRIPE_OAUTH_NONCE_COOKIE)?.value ?? null;

        const verified = await verifyStripeOAuthState({
            state,
            currentUserId,
            cookieNonce,
        });

        // Success lands on step 2; onboarding failures return to step 1, others reuse signed returnTo
        const successReturnTo =
            verified.ok && verified.payload.returnTo ? verified.payload.returnTo : "/onboarding?step=2";

        if (!verified.ok) {
            const errUrl = new URL("/onboarding?step=1", process.env.NEXTAUTH_URL);
            errUrl.searchParams.set("stripeError", "state");
            errUrl.searchParams.set("reason", verified.reason);
            return clearNonceCookie(NextResponse.redirect(errUrl));
        }

        const errorReturnTo = stripeErrorReturnTo(verified.payload.returnTo);

        if (error) {
            const errUrl = new URL(errorReturnTo, process.env.NEXTAUTH_URL);
            errUrl.searchParams.set("stripeError", error);
            if (errorDescription) errUrl.searchParams.set("desc", errorDescription);
            return clearNonceCookie(NextResponse.redirect(errUrl));
        }

        if (!code) {
            const errUrl = new URL(errorReturnTo, process.env.NEXTAUTH_URL);
            errUrl.searchParams.set("stripeError", "missing_code");
            return clearNonceCookie(NextResponse.redirect(errUrl));
        }

        // Stripe OAuth code exchange
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        const tokenResp = await stripe.oauth.token({
            grant_type: "authorization_code",
            code,
        });
        // console.log("tokenResp", tokenResp);

        const connectedAccountId = tokenResp.stripe_user_id!;
        // console.log("connectedAccountId", connectedAccountId);

        const accountProfile = await stripe.accounts.retrieve(connectedAccountId);

        // console.log("accountProfile", accountProfile);
        const businessName = accountProfile.company?.name ??
            accountProfile.business_profile?.name ??
            accountProfile.settings?.dashboard?.display_name ?? "";

        await putStripeConnection({
            userId: verified.payload.userId,
            stripeAccountId: connectedAccountId,
            businessName,
        });
        // Marker so the wizard can emit the funnel's "Stripe Connected" event;
        // it strips the param on arrival, same as the error params above. Only
        // the onboarding wizard listens for it — attaching it to a non-onboarding
        // returnTo (e.g. the account page's /dashboard reconnect) would leave it
        // stuck in the URL forever with nothing to strip it.
        const successUrl = new URL(successReturnTo, process.env.NEXTAUTH_URL);
        if (isOnboardingPath(successReturnTo)) {
            successUrl.searchParams.set("stripeConnected", "1");
        }
        return clearNonceCookie(NextResponse.redirect(successUrl));
    } catch (err) {
        console.error("Error in Stripe Connect callback:", err);
        return new Response("Internal Server Error", { status: 500 });
    }
}
