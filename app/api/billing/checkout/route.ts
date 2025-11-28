// app/api/billing/checkout/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { stripeBilling, BILLING_PRICES, type BillingPlanId, type BillingInterval } from "@/lib/stripe-billing";
import { getUserProfile } from "@/lib/user-profile";

export const runtime = "nodejs";

type Body = {
    planId: BillingPlanId;
    interval: BillingInterval;
};

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }
    const authUserId = (session.user as any).id as string;

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body || !body.planId || !body.interval) {
        return new NextResponse("Invalid request", { status: 400 });
    }

    const { planId, interval } = body;
    const priceId = BILLING_PRICES[planId]?.[interval];
    if (!priceId) {
        return new NextResponse("Unknown plan/interval", { status: 400 });
    }

    const userProfile = await getUserProfile(authUserId);
    if (!userProfile) {
        return new NextResponse("User profile not found", { status: 400 });
    }

    const successUrl = `${process.env.NEXTAUTH_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.NEXTAUTH_URL}/pricing?canceled=1`;
    const metadata = {
        authUserId,
        planId,
        interval,
        priceId,
        subscription_stage: "paid",
    };

    const customerParams = userProfile.subscriptionCustomerId
        ? { customer: userProfile.subscriptionCustomerId }
        : { customer_email: userProfile.email };

    const checkoutSession = await stripeBilling.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        allow_promotion_codes: true,
        // subscription data metadata
        subscription_data: {
            metadata,
        },
        // checkout session metadata
        metadata,
        success_url: successUrl,
        cancel_url: cancelUrl,
        ...customerParams,
    });

    return NextResponse.json({ url: checkoutSession.url });
}
