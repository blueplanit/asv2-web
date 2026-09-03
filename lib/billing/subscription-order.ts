import "server-only";

import type Stripe from "stripe";
import { stripeBilling } from "@/lib/stripe/stripe-billing";

function isMissingStripeSubscription(err: unknown): boolean {
    return (
        !!err &&
        typeof err === "object" &&
        (err as { code?: unknown }).code === "resource_missing"
    );
}

export async function canBecomeCurrentSubscription(
    incoming: Stripe.Subscription,
    currentSubscriptionId?: string | null,
): Promise<boolean> {
    if (!currentSubscriptionId || currentSubscriptionId === incoming.id) {
        return true;
    }

    // Checkout records the subscription it was created to replace. This resolves
    // ordering when Stripe timestamps fall within the same second.
    if (
        incoming.metadata?.subscription_stage === "paid" &&
        incoming.metadata?.replacesSubscriptionId === currentSubscriptionId
    ) {
        return true;
    }

    let current: Stripe.Subscription;
    try {
        current = await stripeBilling.subscriptions.retrieve(currentSubscriptionId);
    } catch (err) {
        // A nonexistent stored subscription cannot outrank a real one.
        if (isMissingStripeSubscription(err)) return true;
        throw err;
    }

    // Legacy subscriptions without an explicit link use conservative ordering.
    return incoming.created > current.created;
}
