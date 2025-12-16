// app/api/stripe/callback/route.ts
import "server-only";
import Stripe from "stripe";
import { verifyState } from "@/lib/oauthState";
import { redirect } from "next/navigation";
import { putStripeConnection } from "@/lib/stripe-connection";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const runtime = "nodejs";

export async function GET(req: Request) {
    console.log('Stripe Connect callback invoked');
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !(session.user as any).id) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId_ = (session.user as any).userId as string;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");
        const state = searchParams.get("state");

        if (!code) {
            return new Response("Missing code", { status: 400 });
        }

        // identify who is currently logged in
        // this should match what you used in makeState()
        // e.g. from NextAuth, a session cookie, etc.
        const { ok, userId } = await verifyState(state, userId_);
        // console.log("verifyState", ok, userId);

        if (!ok || !userId) {
            return new Response("Invalid state", { status: 400 });
        }

        // Stripe OAuth code exchange
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
            userId,
            stripeAccountId: connectedAccountId,
            businessName,
        });
    } catch (err) {
        console.error("Error in Stripe Connect callback:", err);
        return new Response("Internal Server Error", { status: 500 });
    }

    return redirect(`/onboarding?step=2`);
}
