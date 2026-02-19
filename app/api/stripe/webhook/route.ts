// app/api/stripe/webhook/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { stripeBilling } from "@/lib/stripe/stripe-billing";
import {
    UpdateUserSubscriptionParams,
    updateUserSubscriptionStatusToActive,
    updateUserSubscriptionStatusToInactive,
} from "@/lib/dynamo/user-profile";
import Stripe from "stripe";
import { mapStripePriceToPlan } from "@/lib/billing/billing-plan-map";
import { getSubscriptionPeriodEnd } from "@/lib/billing/billing-period";
import { getUserProfile } from "@/lib/dynamo/user-profile";
import { isStripeSubscriptionEntitled, isStripeSubscriptionNonEntitledTerminal } from "@/lib/app-state/subscription-entitlement";
import { isDevEnvironment } from "@/lib/utils";

export const runtime = "nodejs";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

function buildUpdateParamsFromSubscription(
    subscription: Stripe.Subscription,
): { userId: string | null; params: UpdateUserSubscriptionParams } {
    const metadata = subscription.metadata || {};
    const userId = (metadata as any)?.userId ?? null;

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
    const stripeStatus = subscription.status as Stripe.Subscription.Status;
    const isCancelAtPeriodEnd = !!subscription.cancel_at_period_end || !!subscription.cancel_at;
    const rawStatus = stripeStatus === "active" && isCancelAtPeriodEnd ? "canceling" : stripeStatus;

    if (isDevEnvironment()) {
        console.log("stripeStatus", stripeStatus);
        console.log(subscription)
        console.log("rawStatus", rawStatus);
    }

    const params: UpdateUserSubscriptionParams = {
        subscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        planId: planInfo?.planId,
        interval,
        currentPeriodEnd,
        rawStatus,
    };

    return { userId, params };
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
    const status = subscription.status;
    const { userId, params } = buildUpdateParamsFromSubscription(subscription);

    if (!userId) {
        console.warn(`Stripe webhook: subscription without userId metadata: subId: ${subscription.id}, customer: ${subscription.customer}`);
        return; // will end with 200 from the outer handler
    }

    const profile = await getUserProfile(userId);
    if (!profile) {
        console.warn(`Stripe webhook: no profile for userId: ${userId}, subId: ${subscription.id}, status: ${status}`);
        return;
    }

    const stage = (subscription.metadata as any)?.subscription_stage as "trial" | "paid" | undefined;
    const isCurrent = profile.subscriptionId === subscription.id;
    const isEntitled = isStripeSubscriptionEntitled(status);
    const isNonEntitledTerminal = isStripeSubscriptionNonEntitledTerminal(status);

    try {
        if (isEntitled) {
            const shouldActivate =
                stage === "paid" ||            // paid subs always allowed to become current (set in metadata on creation)
                !profile.subscriptionId ||     // first-ever subscription
                isCurrent;

            if (!shouldActivate) return;

            // Remember old id before we overwrite it
            const previousId = profile.subscriptionId ?? null;

            // 1) Mark this sub as current/active in Dynamo
            await updateUserSubscriptionStatusToActive(userId, params, previousId);

            // 2) If we switched from a different sub, cancel the old one if it's a trial
            if (previousId && previousId !== subscription.id) {
                cancelPreviousTrialSubscription({
                    previousSubscriptionId: previousId,
                    userId,
                });
            }
            return;
        } else if (isNonEntitledTerminal) {
            if (!isCurrent) return;
            await updateUserSubscriptionStatusToInactive(userId, profile.accountRole, status, subscription.id);
            return;
        }
    } catch (err: any) {
        // If this is a conditional failure (user profile not found), log and swallow.
        // Only re-throw for real infra/bad-code errors.
        console.error(`Stripe webhook: failed to update user subscription: userId: ${userId}, subId: ${subscription.id}, status: ${status}, error: ${err}`);
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
                console.log(`Stripe webhook: subscription created/updated: subId: ${subscription.id}, userId: ${subscription.metadata?.userId}`);
                await handleSubscriptionChange(subscription);
                break;
            }
            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;
                const userId = (subscription.metadata as any)?.userId;
                if (!userId) break;
            
                const profile = await getUserProfile(userId);
                if (!profile) break;
            
                const isCurrent = profile.subscriptionId === subscription.id;
                if (!isCurrent) {
                    console.log(`Stripe webhook: ignoring deletion of non-current subscription: subId: ${subscription.id}, currentId: ${profile.subscriptionId}, userId: ${userId}`);
                    break;
                }
            
                console.log(`Stripe webhook: subscription deleted (current): subId: ${subscription.id}, userId: ${userId}`);
            
                try {
                    await updateUserSubscriptionStatusToInactive(
                        userId,
                        profile.accountRole,
                        subscription.status,
                        subscription.id,
                    );
                } catch (err: any) {
                    console.error(`Stripe webhook: failed to inactivate on deletion: userId: ${userId}, subId: ${subscription.id}, status: ${subscription.status}, error: ${err}`);
                    // ConditionalCheckFailedException here again means: subscriptionId changed since we read; safe to swallow.
                }
                break;
            
            }

            // Optional: trial reminder
            case "customer.subscription.trial_will_end": {
                const subscription = event.data.object as Stripe.Subscription;
                const userId = (subscription.metadata as any)?.userId;
                if (!userId) break;
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

/**
 * Cancel a previous subscription if it looks like a trial.
 * This is called after a new entitled subscription becomes current.
 */
async function cancelPreviousTrialSubscription(args: {
    previousSubscriptionId: string;
    userId: string;
}) {
    const { previousSubscriptionId, userId } = args;

    try {
        const oldSub = await stripeBilling.subscriptions.retrieve(previousSubscriptionId);
        const oldStage = (oldSub.metadata as any)?.subscription_stage as "trial" | "paid" | undefined;
        const looksTrial = (oldStage === "trial" || oldSub.status === "trialing" || !!oldSub.trial_end) && oldSub.status !== "active" && oldSub.status !== "past_due";

        if (!looksTrial) {
            console.log(`Previous subscription is not a trial; not canceling automatically: prevSubId: ${previousSubscriptionId}, userId: ${userId}, oldStage: ${oldStage}, oldStatus: ${oldSub.status}`,);
            return;
        }

        await stripeBilling.subscriptions.cancel(previousSubscriptionId);
        console.log(`Canceled previous trial subscription after new subscription became current: prevSubId: ${previousSubscriptionId}, userId: ${userId}, oldStage: ${oldStage}, oldStatus: ${oldSub.status}`);
    } catch (err) {
        console.error("Failed to inspect/cancel previous subscription", {
            userId,
            previousId: previousSubscriptionId,
            err,
        });
        // Swallow: events from this old sub are still gated by isCurrent in handleSubscriptionChange
    }
}
