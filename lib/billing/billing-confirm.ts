// lib/billing/billing-confirm.ts
import "server-only";
import type Stripe from "stripe";
import { stripeBilling } from "@/lib/stripe/stripe-billing";
import { getUserProfile, type UpdateUserSubscriptionParams } from "@/lib/dynamo/user-profile";
import { reconcileActiveSubscription } from "@/lib/billing/reconcile-subscription";
import { requireStripeCustomerId } from "@/lib/billing/stripe-customer-id";
import { canBecomeCurrentSubscription } from "@/lib/billing/subscription-order";
import { cancelPreviousTrialSubscription } from "@/lib/billing/cancel-previous-trial-subscription";
import { mapStripePriceToPlan } from "./billing-plan-map";
import { getSubscriptionPeriodEnd } from "./billing-period";
import {
    isStripeSubscriptionEntitled,
    isUserProfileEntitled,
} from "@/lib/app-state/subscription-entitlement";

// A checkout session that retrying can never activate. The caller reports it as invalid
// rather than polling, which any other failure here still deserves.
export class InvalidCheckoutSessionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InvalidCheckoutSessionError";
    }
}

export async function confirmCheckoutSessionAndActivateUser(
    sessionId: string,
    userId: string,
) {
    const session = await stripeBilling.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription", "line_items.data.price"],
    });

    // Security: metadata must match the logged-in user
    if (session.metadata?.userId !== userId) {
        throw new InvalidCheckoutSessionError("Checkout session does not belong to this user");
    }

    if (session.mode !== "subscription") {
        throw new InvalidCheckoutSessionError(
            `Checkout session is not subscription mode: ${session.mode}`,
        );
    }

    // An expired session can never complete. An open one still can, so it stays pending.
    if (session.status === "expired") {
        throw new InvalidCheckoutSessionError("Checkout session expired");
    }

    // Make sure the session actually completed
    if (session.status !== "complete") {
        throw new Error(`Checkout session not complete: ${session.status}`);
    }

    const paymentSatisfied =
        session.payment_status === "paid" ||
        session.payment_status === "no_payment_required";

    if (!paymentSatisfied) {
        throw new Error("Payment not completed yet");
    }

    // Expanded subscription, or string id if expand failed for some reason
    const subscriptionExpanded = typeof session.subscription === "string"
            ? null
            : (session.subscription as Stripe.Subscription | null);

    if (!subscriptionExpanded) {
        // Fallback: we at least need the subscription object to get status + period
        throw new Error("Expanded subscription not available on checkout session");
    }

    const subscription = subscriptionExpanded;
    const newSubscriptionId = subscription.id;
    const stripeCustomerId = requireStripeCustomerId(session.customer);

    const currentProfile = await getUserProfile(userId);
    const previousSubscriptionId = currentProfile?.subscriptionId;

    // Use metadata priceId first, then fall back to subscription/line_items
    const priceId =
        session.metadata?.priceId ||
        subscription.items.data[0]?.price?.id ||
        session.line_items?.data[0]?.price?.id ||
        null;
    const planInfo = mapStripePriceToPlan(priceId);
    const currentPeriodEnd = getSubscriptionPeriodEnd(subscription);

    // Only mark as active if Stripe sees it as entitled
    const status = subscription.status;
    const entitled = isStripeSubscriptionEntitled(status);

    if (!entitled) {
        // Let webhook drive the state for non-entitled statuses
        return false;
    }

    if (
        previousSubscriptionId &&
        previousSubscriptionId !== newSubscriptionId
    ) {
        const canReplace = await canBecomeCurrentSubscription(
            subscription,
            previousSubscriptionId,
        );

        if (!canReplace) {
            console.warn("Ignoring an older checkout success session", {
                userId,
                incomingId: newSubscriptionId,
                currentId: previousSubscriptionId,
            });
            return isUserProfileEntitled(currentProfile);
        }
    }

    const subParams: UpdateUserSubscriptionParams = {
        subscriptionId: newSubscriptionId,
        stripeCustomerId,
        planId: planInfo?.planId,
        interval: planInfo?.interval,
        currentPeriodEnd,
        rawStatus: status,
    };

    await reconcileActiveSubscription(userId, subParams, previousSubscriptionId);

    if (previousSubscriptionId && previousSubscriptionId !== newSubscriptionId) {
        await cancelPreviousTrialSubscription({
            previousSubscriptionId,
            userId,
        });
    }

    return true;
}
