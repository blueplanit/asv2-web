// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripeBilling } from "@/lib/stripe-billing";
import {
    UpdateUserSubscriptionParams,
    updateUserSubscriptionStatusToActive,
    updateUserSubscriptionStatusToInactive,
} from "@/lib/user-profile";
import Stripe from "stripe";
import { mapStripePriceToPlan } from "@/lib/billing-plan-map";
import { getSubscriptionPeriodEnd } from "@/lib/billing-period";

export const runtime = "nodejs";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

function buildUpdateParamsFromSubscription(
    subscription: Stripe.Subscription,
): { authUserId: string | null; params: UpdateUserSubscriptionParams } {
    const metadata = subscription.metadata || {};
    const authUserId = (metadata as any)?.authUserId ?? null;

    const explicitPriceId = metadata.priceId as string | undefined;
    const priceFromItem = subscription.items.data[0]?.price?.id;
    const priceId = explicitPriceId || priceFromItem || null;

    const planInfo = priceId ? mapStripePriceToPlan(priceId) : null;

    const interval =
        planInfo?.interval ??
        (subscription.items.data[0]?.price?.recurring?.interval === "year"
            ? "yearly"
            : "monthly");

    const currentPeriodEnd = getSubscriptionPeriodEnd(subscription);

    const params: UpdateUserSubscriptionParams = {
        subscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        planId: planInfo?.planId,
        interval,
        currentPeriodEnd,
        rawStatus: subscription.status,
    };

    return { authUserId, params };
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
    const status = subscription.status;
    const { authUserId, params } = buildUpdateParamsFromSubscription(subscription);

    if (!authUserId) {
        console.warn("Stripe webhook: subscription without authUserId metadata", {
            subId: subscription.id,
            customer: subscription.customer,
        });
        return; // will end with 200 from the outer handler
    }

    const isEntitled = status === "trialing" || status === "active";

    const isNonEntitledTerminal =
        status === "canceled" ||
        status === "unpaid" ||
        status === "incomplete_expired" ||
        status === "past_due";

    try {
        if (isEntitled) {
            await updateUserSubscriptionStatusToActive(authUserId, params);
        } else if (isNonEntitledTerminal) {
            await updateUserSubscriptionStatusToInactive(authUserId);
        }
    } catch (err: any) {
        // If this is a conditional failure (user profile not found), log and swallow.
        // Only re-throw for real infra/bad-code errors.
        console.error("Stripe webhook: failed to update user subscription", {
            authUserId,
            subId: subscription.id,
            status,
            error: err,
        });
        // decide: swallow vs rethrow
        // For most SaaS, swallowing here is fine so Stripe doesn’t retry forever
    }
}

export async function POST(req: NextRequest) {
    const rawBody = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (!sig) {
        return new NextResponse("Missing signature", { status: 400 });
    }

    let event: Stripe.Event;
    try {
        event = stripeBilling.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
        console.error("Stripe webhook signature verification failed:", err);
        return new NextResponse("Invalid signature", { status: 400 });
    }

    try {
        switch (event.type) {
            // Single source of truth for subscription lifecycle
            case "customer.subscription.created":
            case "customer.subscription.updated": {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionChange(subscription);
                break;
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;
                const authUserId = (subscription.metadata as any)?.authUserId;
                
                if (authUserId) {
                    await updateUserSubscriptionStatusToInactive(authUserId);
                }
                break;
            }

            // Optional: trial reminder
            case "customer.subscription.trial_will_end": {
                const subscription = event.data.object as Stripe.Subscription;
                const authUserId = (subscription.metadata as any)?.authUserId;
                if (!authUserId) break;
                // enqueue email / notification job here if you want
                break;
            }
            default:
                break;
        }
    } catch (err) {
        console.error("Error handling Stripe webhook:", err);
        return new NextResponse("Webhook handler failed", { status: 500 });
    }

    return new NextResponse("OK", { status: 200 });
}
