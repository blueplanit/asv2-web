// lib/app-state/subscription-entitlement.ts

import type Stripe from "stripe";
import type { UserProfile } from "@/lib/schemas/user-profile";

// Stripe subscription statuses that grant entitlement to the app
const ENTITLED_STRIPE_STATUSES: Stripe.Subscription.Status[] = [
    "trialing",
    "active",
];

// Stripe subscription statuses that are non-entitled and terminal
const NON_ENTITLED_TERMINAL_STRIPE_STATUSES: Stripe.Subscription.Status[] = [
    "canceled",
    "unpaid",
    "incomplete_expired",
    "past_due",
];

export function isStripeSubscriptionEntitled(
    status: Stripe.Subscription.Status | string | null | undefined,
): boolean {
    if (!status) return false;
    return ENTITLED_STRIPE_STATUSES.includes(status as Stripe.Subscription.Status);
}

export function isStripeSubscriptionNonEntitledTerminal(
    status: Stripe.Subscription.Status | string | null | undefined,
): boolean {
    if (!status) return false;
    return NON_ENTITLED_TERMINAL_STRIPE_STATUSES.includes(
        status as Stripe.Subscription.Status,
    );
}

/**
 * Entitlement at the profile level.
 * "active" status + currentPeriodEnd not in the past (if set).
 */
export function isUserProfileEntitled(
    profile: UserProfile | null | undefined,
    now: Date = new Date(),
): boolean {
    if (!profile) return false;
    if (profile.subscriptionStatus !== "active") return false;

    const endIso = profile.subscriptionCurrentPeriodEnd;
    if (!endIso) return true; // active with no end date => treat as entitled

    const end = new Date(endIso);
    if (Number.isNaN(end.getTime())) return false;

    return end >= now;
}

// Narrower than isUserProfileEntitled: excludes a trial. A trialing user is
// entitled to the app but is still a Promotion's target audience, not an
// existing customer — see ADR-0005 decision 5. Mirrors BillingBar's own
// active-vs-upgrade-CTA split, which draws the same line.
export function isUserProfileActivePaidSubscriber(
    profile: UserProfile | null | undefined,
): boolean {
    if (!profile) return false;
    return profile.subscriptionStatus === "active" && profile.subscriptionRawStatus !== "trialing";
}
