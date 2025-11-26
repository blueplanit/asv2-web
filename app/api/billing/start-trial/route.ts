// app/api/billing/start-trial/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
    stripeBilling,
    BILLING_PRICES,
    type BillingPlanId,
    type BillingInterval,
} from "@/lib/stripe-billing";
import {
    getUserProfile,
    updateUserSubscriptionStatusToActive,
} from "@/lib/user-profile";
import { ensureStripeCustomerId } from "@/lib/ensure-stripe-customer";
import { getSubscriptionPeriodEnd } from "@/lib/billing-period";

export const runtime = "nodejs";

type Body = {
    planId?: BillingPlanId;          // optional: default to "pro"
    interval?: BillingInterval;      // optional: default to "monthly"
};

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }
    const authUserId = (session.user as any).id as string;

    const body = (await req.json().catch(() => null)) as Body | null;
    const planId: BillingPlanId = (body?.planId ?? "pro") as BillingPlanId;
    const interval: BillingInterval = (body?.interval ?? "monthly") as BillingInterval;

    const priceId = BILLING_PRICES[planId]?.[interval];
    if (!priceId) {
        return new NextResponse("Unknown plan/interval", { status: 400 });
    }

    const profile = await getUserProfile(authUserId);
    if (!profile) {
        return new NextResponse("User profile not found", { status: 400 });
    }

    // Guard against duplicate trials / subscriptions
    if (profile.subscriptionStatus === "active") {
        return new NextResponse("Subscription already active", { status: 409 });
    }

    const stripeCustomerId = await ensureStripeCustomerId(authUserId);

    if (!stripeCustomerId) {
        return new NextResponse("Failed to create/get Stripe customer", { status: 500 });
    }

    const metadata = {
        authUserId,
        planId,
        interval,
        priceId,
        subscription_stage: "trial",          // "trial" vs "paid"
    };

    const subscription = await stripeBilling.subscriptions.create({
        customer: stripeCustomerId,
        items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        // 14-day trial, no payment method required
        trial_period_days: 14,
        // Cancel automatically if they never add a payment method
        trial_settings: {
            end_behavior: {
                missing_payment_method: "cancel",
            },
        },
        collection_method: "charge_automatically",
        metadata,
    });

    if (!subscription?.id) {
        return new NextResponse("Failed to create subscription", { status: 500 });
    }

    const currentPeriodEnd = getSubscriptionPeriodEnd(subscription);
    const trialEnd = subscription.trial_end ?? currentPeriodEnd;

    await updateUserSubscriptionStatusToActive(authUserId, {
        subscriptionId: subscription.id,
        stripeCustomerId,
        planId,
        interval,
        currentPeriodEnd,
        rawStatus: subscription.status, // "trialing" initially
    });

    const trialEndsAtIso = trialEnd != null ? new Date(trialEnd * 1000).toISOString() : null;

    return NextResponse.json({
        ok: true,
        subscriptionId: subscription.id,
        trialEndsAt: trialEndsAtIso,
        status: subscription.status,
    });
}
