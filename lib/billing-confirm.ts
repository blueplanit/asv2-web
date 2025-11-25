// lib/billing-confirm.ts
import type Stripe from "stripe";
import { stripeBilling } from "@/lib/stripe-billing";
import { getUserProfile, UpdateUserSubscriptionParams, updateUserSubscriptionStatusToActive } from "@/lib/user-profile";
import { mapStripePriceToPlan } from "./billing-plan-map";
import { getSubscriptionPeriodEnd } from "./billing-period";

export async function confirmCheckoutSessionAndActivateUser(
    sessionId: string,
    authUserId: string,
) {
    const session = await stripeBilling.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription", "line_items.data.price"],
    });

    // Security: metadata must match the logged-in user
    if (session.metadata?.authUserId !== authUserId) {
        throw new Error("Checkout session does not belong to this user");
    }

    if (session.mode !== "subscription") {
        throw new Error(`Checkout session is not subscription mode: ${session.mode}`);
    }

    // Make sure the session actually completed
    if (session.status !== "complete") {
        throw new Error(`Checkout session not complete: ${session.status}`);
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
    const subscriptionId = subscription.id;
    const stripeCustomerId = session.customer as string;

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
    const entitled = status === "trialing" || status === "active";

    if (!entitled) {
        // Let webhook drive the state for non-entitled statuses
        return;
    }

    const subParams: UpdateUserSubscriptionParams = {
        subscriptionId,
        stripeCustomerId,
        planId: planInfo?.planId,
        interval: planInfo?.interval,
        currentPeriodEnd,
        rawStatus: status,
    };

    // Idempotent: it's fine if webhook already did this
    await updateUserSubscriptionStatusToActive(authUserId, subParams);
}
