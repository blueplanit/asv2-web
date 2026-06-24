// app/api/billing/start-trial/route.ts
import "server-only";
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
    stripeBilling,
    BILLING_PRICES,
    type BillingPlanId,
    type BillingInterval,
} from "@/lib/stripe/stripe-billing";
import {
    updateUserSubscriptionStatusToActive,
    getUserProfile,
} from "@/lib/dynamo/user-profile";
import { ensureStripeCustomerId } from "@/lib/dynamo/ensure-stripe-customer";
import { getSubscriptionPeriodEnd } from "@/lib/billing/billing-period";
import { isUserProfileEntitled } from "@/lib/app-state/subscription-entitlement";
import { apiErrorResponse } from "@/lib/api/api-error-response";
import type { UserProfile } from "@/lib/schemas/user-profile";

export const runtime = "nodejs";

const ROUTE = "POST /api/billing/start-trial";
const TRIAL_ALREADY_USED_MESSAGE = "Trial already used. Please upgrade to a paid plan.";

type Body = {
    planId?: BillingPlanId;          // optional: default to "pro"
    interval?: BillingInterval;      // optional: default to "monthly"
};

function alreadyActiveResponse(profile: UserProfile) {
    return NextResponse.json({
        ok: true,
        alreadyActive: true,
        status: profile.subscriptionRawStatus ?? "active",
    });
}

function hasUsedTrial(profile: UserProfile): boolean {
    // Legacy fallback: check subscriptionId/customerId for users before trialUsedAt existed
    return !!(profile.trialUsedAt || profile.subscriptionId || profile.subscriptionCustomerId);
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).userId) {
        return apiErrorResponse(ROUTE, 401, "Unauthorized");
    }
    const userId = (session.user as any).userId as string;

    const body = (await req.json().catch(() => null)) as Body | null;
    const planId: BillingPlanId = (body?.planId ?? "pro") as BillingPlanId;
    const interval: BillingInterval = (body?.interval ?? "monthly") as BillingInterval;

    const priceId = BILLING_PRICES[planId]?.[interval];
    if (!priceId) {
        return apiErrorResponse(ROUTE, 400, "Unknown plan/interval", { userId });
    }

    const profile = await getUserProfile(userId);
    if (!profile) {
        return apiErrorResponse(ROUTE, 400, "User profile not found", { userId });
    }

    // Idempotent: already entitled — do not create a duplicate subscription
    if (isUserProfileEntitled(profile)) {
        return alreadyActiveResponse(profile);
    }

    // Guard against duplicate trials (not currently entitled)
    if (hasUsedTrial(profile)) {
        return apiErrorResponse(ROUTE, 403, TRIAL_ALREADY_USED_MESSAGE, { userId });
    }

    const stripeCustomerId = await ensureStripeCustomerId(userId);
    if (!stripeCustomerId) {
        return apiErrorResponse(ROUTE, 500, "Failed to create/get Stripe customer", { userId });
    }

    const metadata = {
        userId,
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
        return apiErrorResponse(ROUTE, 500, "Failed to create subscription", { userId });
    }

    const currentPeriodEnd = getSubscriptionPeriodEnd(subscription);
    const trialEnd = subscription.trial_end ?? currentPeriodEnd;
    const previousSubscriptionId = profile.subscriptionId ?? null;

    try {
        await updateUserSubscriptionStatusToActive(
            userId,
            {
                subscriptionId: subscription.id,
                stripeCustomerId,
                planId,
                interval,
                currentPeriodEnd,
                rawStatus: subscription.status, // "trialing" initially
                recordTrialUsed: true,
            },
            previousSubscriptionId,
        );
    } catch (err: any) {
        if (err.name === "ConditionalCheckFailedException") {
            let latest: UserProfile | null | undefined;
            try {
                latest = await getUserProfile(userId);
            } catch (profileReadError) {
                return apiErrorResponse(
                    ROUTE, 500,
                    "We couldn't confirm your trial status. Please refresh and try again.",
                    { userId, error: profileReadError },
                );
            }
            if (latest && isUserProfileEntitled(latest)) {
                return alreadyActiveResponse(latest);
            }
            return apiErrorResponse(ROUTE, 403, TRIAL_ALREADY_USED_MESSAGE, { userId });
        }
        throw err;
    }

    const trialEndsAtIso = trialEnd != null ? new Date(trialEnd * 1000).toISOString() : null;

    return NextResponse.json({
        ok: true,
        subscriptionId: subscription.id,
        trialEndsAt: trialEndsAtIso,
        status: subscription.status,
    });
}
