// app/api/billing/checkout/route.ts
import "server-only";
import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { stripeBilling, BILLING_PRICES, type BillingPlanId, type BillingInterval } from "@/lib/stripe/stripe-billing";
import { getUserProfile } from "@/lib/dynamo/user-profile";
import { ensureStripeCustomerId } from "@/lib/dynamo/ensure-stripe-customer";
import { getDeliverableDiscount, type DeliverableDiscount } from "@/lib/promotions/get-deliverable-discount";

export const runtime = "nodejs";

type Body = {
    planId: BillingPlanId;
    interval: BillingInterval;
};

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }
    const userId = (session.user as any).userId as string;

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body || !body.planId || !body.interval) {
        return new NextResponse("Invalid request", { status: 400 });
    }

    const { planId, interval } = body;
    const priceId = BILLING_PRICES[planId]?.[interval];
    if (!priceId) {
        return new NextResponse("Unknown plan/interval", { status: 400 });
    }

    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
        return new NextResponse("User profile not found", { status: 400 });
    }

    // Read server-side. A Promotion Code from the client could name any valid Stripe
    // code rather than the one campaign that is live. See ADR-0005 decision 4.
    const discount = await getDeliverableDiscount();

    // Only a discounted session needs a real Customer, so Stripe can evaluate the
    // Promotion Code against one (ADR-0005 decision 6). Without a discount the older
    // customer_email path stands, which keeps this route unchanged outside a campaign
    // and creates no Customer record for a checkout the visitor abandons.
    const customerParams = discount
        ? { customer: await ensureStripeCustomerId(userId, userProfile) }
        : userProfile.subscriptionCustomerId
            ? { customer: userProfile.subscriptionCustomerId }
            : { customer_email: userProfile.email };

    const successUrl = `${process.env.NEXTAUTH_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.NEXTAUTH_URL}/pricing?canceled=1`;

    // Takes the discount rather than a flag, so one value decides both the metadata and
    // the Stripe params. promotionId reaches SUBSCRIPTION_PAID through subscription
    // metadata, so a full-price retry writes none and never reports itself as promoted.
    function sessionParams(
        applied: DeliverableDiscount | null,
    ): Stripe.Checkout.SessionCreateParams {
        const metadata = {
            userId,
            planId,
            interval,
            priceId,
            subscription_stage: "paid",
            ...(applied ? { promotionId: applied.promotion.id } : {}),
        };

        return {
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [{ price: priceId, quantity: 1 }],
            ...customerParams,
            subscription_data: { metadata },
            metadata,
            success_url: successUrl,
            cancel_url: cancelUrl,
            // Stripe rejects a session carrying both, and a falsy allow_promotion_codes
            // still counts as carrying it, so the key is omitted rather than set false.
            ...(applied
                ? { discounts: [{ promotion_code: applied.promotionCodeId }] }
                : { allow_promotion_codes: true }),
        };
    }

    let checkoutSession;
    if (discount) {
        try {
            checkoutSession = await stripeBilling.checkout.sessions.create(sessionParams(discount));
        } catch (err) {
            // Retry unconditionally: Stripe documents throw-shaped errors for a code it
            // will not apply, but not whether they fire here, and full price beats a dead
            // Subscribe button. An unrelated failure lands here too and fails on the
            // retry, so this log says the attempt failed, not why. See ADR-0005.
            console.error(
                `checkout: session creation failed with Promotion ${discount.promotion.id} applied, retrying at full price`,
                err,
            );
            checkoutSession = await stripeBilling.checkout.sessions.create(sessionParams(null));
        }
    } else {
        checkoutSession = await stripeBilling.checkout.sessions.create(sessionParams(null));
    }

    return NextResponse.json({ url: checkoutSession.url });
}
