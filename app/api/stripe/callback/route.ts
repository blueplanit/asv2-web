import Stripe from "stripe";
import { kitOptions } from "@/lib/stripeConnectOptions";
import { verifyState } from "@/lib/oauthState";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

export async function GET(req: Request) {
    console.log('Stripe Connect callback invoked');
    try {
        const stripe = new Stripe(kitOptions.stripeSecretKey);

        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");
        const state = searchParams.get("state");

        if (!code) {
            return new Response("Missing code", { status: 400 });
        }

        // identify who is currently logged in
        // this should match what you used in makeState()
        // e.g. from NextAuth, a session cookie, etc.
        const currentUserId = "demo-user-123";

        const { ok, userId } = await verifyState(state, currentUserId);
        console.log("verifyState", ok, userId);

        if (!ok || !userId) {
            return new Response("Invalid state", { status: 400 });
        }

        // Stripe OAuth code exchange
        const tokenResp = await stripe.oauth.token({
            grant_type: "authorization_code",
            code,
        });
        console.log("tokenResp", tokenResp);

        const connectedAccountId = tokenResp.stripe_user_id!;
        console.log("connectedAccountId", connectedAccountId);

        await kitOptions.store.saveConnection({
            userId,
            accountId: connectedAccountId,
            livemode: tokenResp.livemode ?? false,
            connectedAt: new Date(),
        });
    } catch (err) {
        console.error("Error in Stripe Connect callback:", err);
        return new Response("Internal Server Error", { status: 500 });
    }

    return redirect(`/onboarding?step=2`);
}
