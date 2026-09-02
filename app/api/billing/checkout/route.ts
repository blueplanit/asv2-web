// app/api/billing/checkout/route.ts
import "server-only";
import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { stripeBilling, BILLING_PRICES, type BillingPlanId, type BillingInterval } from "@/lib/stripe/stripe-billing";
import { getUserProfile } from "@/lib/dynamo/user-profile";
import {
    deliverableDiscountVersion,
    getDeliverableDiscount,
    type DeliverableDiscount,
} from "@/lib/promotions/get-deliverable-discount";

export const runtime = "nodejs";

type Body = {
    planId: BillingPlanId;
    interval: BillingInterval;
    expectedPromotionId?: string | null;
    expectedPromotionVersion?: string | null;
};

function checkoutError(code: "checkout_unavailable" | "price_changed", status: 409 | 503) {
    return NextResponse.json({ code }, { status });
}

function isMissingStripeCustomer(err: unknown): boolean {
    if (!err || typeof err !== "object") return false;
    const stripeError = err as { code?: unknown; param?: unknown };
    return stripeError.code === "resource_missing" && stripeError.param === "customer";
}

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

    let userProfile;
    try {
        userProfile = await getUserProfile(userId);
    } catch (err) {
        console.error("checkout: could not read the user profile", { userId, err });
        return checkoutError("checkout_unavailable", 503);
    }
    if (!userProfile) {
        return new NextResponse("User profile not found", { status: 400 });
    }

    // A client-supplied Promotion Code could name any valid Stripe code rather than
    // the one Promotion that is currently published. See ADR-0005 decision 4.
    const discount = await getDeliverableDiscount();

    // The client supplies only what it displayed. The server still decides which
    // Promotion Code is valid and refuses a changed price rather than silently charging it.
    const promotionChanged = body.expectedPromotionVersion
        ? body.expectedPromotionVersion !== deliverableDiscountVersion(discount)
        : body.expectedPromotionId
            ? body.expectedPromotionId !== discount?.promotion.id
            : false;
    if (promotionChanged) {
        return checkoutError("price_changed", 409);
    }

    const storedCustomerParams = userProfile.subscriptionCustomerId
        ? { customer: userProfile.subscriptionCustomerId }
        : { customer_email: userProfile.email };

    const successUrl = `${process.env.NEXTAUTH_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.NEXTAUTH_URL}/pricing?canceled=1`;

    // One value decides both metadata and Stripe parameters, so reporting and billing agree.
    function sessionParams(
        customerParams: { customer: string } | { customer_email: string },
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

    let checkoutSession: Stripe.Checkout.Session;
    try {
        checkoutSession = await stripeBilling.checkout.sessions.create(
            sessionParams(storedCustomerParams, discount),
        );
    } catch (err) {
        // A deleted stored Customer is safe to replace. Keep every other parameter,
        // especially the Promotion Code, identical on the retry.
        if (userProfile.subscriptionCustomerId && isMissingStripeCustomer(err)) {
            console.error("checkout: stored Stripe Customer is missing; retrying with email", {
                userId,
                customerId: userProfile.subscriptionCustomerId,
            });
            try {
                checkoutSession = await stripeBilling.checkout.sessions.create(
                    sessionParams({ customer_email: userProfile.email }, discount),
                );
            } catch (retryErr) {
                console.error("checkout: session creation failed after replacing missing Customer", {
                    userId,
                    retryErr,
                });
                return checkoutError("checkout_unavailable", 503);
            }
        } else {
            console.error("checkout: session creation failed", {
                userId,
                promotionId: discount?.promotion.id ?? null,
                err,
            });
            return checkoutError("checkout_unavailable", 503);
        }
    }

    return NextResponse.json({ url: checkoutSession.url });
}
