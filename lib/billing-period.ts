// lib/billing-period.ts
import Stripe from "stripe";

export function getSubscriptionPeriodEnd(sub: Stripe.Subscription): number | null {
    const firstItem = sub.items.data[0];

    // During trial, use explicit trial_end if present
    if (sub.status === "trialing" && sub.trial_end) {
        return sub.trial_end;
    }

    // After trial, use the subscription item's billing period end
    if (firstItem?.current_period_end) {
        return firstItem.current_period_end;
    }

    // Fallback: at least try trial_end if available
    return sub.trial_end ?? null;
}
