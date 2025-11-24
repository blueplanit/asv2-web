// lib/billing-confirm.ts
import type Stripe from "stripe";
import { stripeBilling } from "@/lib/stripe-billing";
import { updateUserSubscriptionStatusToActive } from "@/lib/user-profile";

export async function confirmCheckoutSessionAndActivateUser(
    sessionId: string,
    authUserId: string,
) {
    const session = await stripeBilling.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription"],
    });

    // Security: metadata must match the logged-in user
    if (session.metadata?.authUserId !== authUserId) {
        throw new Error("Checkout session does not belong to this user");
    }

    // Make sure the session actually completed
    if (session.status !== "complete") {
        throw new Error(`Checkout session not complete: ${session.status}`);
    }

    // Get subscription id
    const subscription = session.subscription as Stripe.Subscription | string | null;
    const subscriptionId =
        typeof subscription === "string" ? subscription : subscription?.id;

    if (!subscriptionId) {
        throw new Error("No subscription found on checkout session");
    }

    // Idempotent: it's fine if webhook already did this
    await updateUserSubscriptionStatusToActive(authUserId, subscriptionId);
}
