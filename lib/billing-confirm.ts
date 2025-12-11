// lib/billing-confirm.ts
import type Stripe from "stripe";
import { stripeBilling } from "@/lib/stripe-billing";
import { getUserProfile, UpdateUserSubscriptionParams, updateUserSubscriptionStatusToActive } from "@/lib/user-profile";
import { mapStripePriceToPlan } from "./billing-plan-map";
import { getSubscriptionPeriodEnd } from "./billing-period";
import { isStripeSubscriptionEntitled } from "./subscription-entitlement";

export async function confirmCheckoutSessionAndActivateUser(
    sessionId: string,
    userId: string,
) {
    const session = await stripeBilling.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription", "line_items.data.price"],
    });

    // Security: metadata must match the logged-in user
    if (session.metadata?.userId !== userId) {
        throw new Error("Checkout session does not belong to this user");
    }

    if (session.mode !== "subscription") {
        throw new Error(`Checkout session is not subscription mode: ${session.mode}`);
    }

    // Make sure the session actually completed
    if (session.status !== "complete") {
        throw new Error(`Checkout session not complete: ${session.status}`);
    }

    if (session.payment_status !== "paid") {
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
    const stripeCustomerId = session.customer as string;

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
        return;
    }

    const subParams: UpdateUserSubscriptionParams = {
        subscriptionId: newSubscriptionId,
        stripeCustomerId,
        planId: planInfo?.planId,
        interval: planInfo?.interval,
        currentPeriodEnd,
        rawStatus: status,
    };

    // Update Database (Optimistic)
    // We catch conditional errors just in case, but usually we overwrite
    try {
        await updateUserSubscriptionStatusToActive(userId, subParams, previousSubscriptionId);
    } catch (err: any) {
        // If ConditionalCheckFailed, the webhook likely already updated the DB.
        // We can safely return here, OR proceed to check cancellation just to be safe.
        console.log("Optimistic update skipped - DB likely already updated by webhook");
    }

    // Cancel the old subscription if it's different
    if (previousSubscriptionId && previousSubscriptionId !== newSubscriptionId) {
        console.log(`Optimistic cleanup: canceling old subscription ${previousSubscriptionId}`);
        try {
            await stripeBilling.subscriptions.cancel(previousSubscriptionId);
        } catch (err: any) {
            // Ignore if already canceled or missing
            if (err.code !== 'resource_missing' && !err.message.includes('No such subscription')) {
                console.error("Failed to cancel old subscription optimistic cleanup:", err);
            }
        }
    }
}
