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
import { getUserProfile } from "@/lib/user-profile";

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
        console.warn(`Stripe webhook: subscription without authUserId metadata: subId: ${subscription.id}, customer: ${subscription.customer}`);
        return; // will end with 200 from the outer handler
    }

    const profile = await getUserProfile(authUserId);
    if (!profile) {
        console.warn(`Stripe webhook: no profile for authUserId: ${authUserId}, subId: ${subscription.id}, status: ${status}`);
        return;
    }

    const stage = (subscription.metadata as any)?.subscription_stage as "trial" | "paid" | undefined;
    const isCurrent = profile.subscriptionId === subscription.id;
    const isEntitled = status === "trialing" || status === "active";

    const isNonEntitledTerminal =
        status === "canceled" ||
        status === "unpaid" ||
        status === "incomplete_expired" ||
        status === "past_due";

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
            await updateUserSubscriptionStatusToActive(authUserId, params, previousId);

            // 2) If we switched from a different sub, cancel the old one if it's a trial
            if (previousId && previousId !== subscription.id) {
                cancelPreviousTrialSubscription({
                    previousSubscriptionId: previousId,
                    authUserId,
                });
            }
            return;
        } else if (isNonEntitledTerminal) {
            if (!isCurrent) return;
            await updateUserSubscriptionStatusToInactive(authUserId, status, subscription.id);
            return;
        }
    } catch (err: any) {
        // If this is a conditional failure (user profile not found), log and swallow.
        // Only re-throw for real infra/bad-code errors.
        console.error(`Stripe webhook: failed to update user subscription: authUserId: ${authUserId}, subId: ${subscription.id}, status: ${status}, error: ${err}`);
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
                console.log(`Stripe webhook: subscription created/updated: subId: ${subscription.id}, authUserId: ${subscription.metadata?.authUserId}`);
                await handleSubscriptionChange(subscription);
                break;
            }
            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;
                const authUserId = (subscription.metadata as any)?.authUserId;
                if (!authUserId) break;
            
                const profile = await getUserProfile(authUserId);
                if (!profile) break;
            
                const isCurrent = profile.subscriptionId === subscription.id;
                if (!isCurrent) {
                    console.log(`Stripe webhook: ignoring deletion of non-current subscription: subId: ${subscription.id}, currentId: ${profile.subscriptionId}, authUserId: ${authUserId}`);
                    break;
                }
            
                console.log(`Stripe webhook: subscription deleted (current): subId: ${subscription.id}, authUserId: ${authUserId}`);
            
                try {
                    await updateUserSubscriptionStatusToInactive(
                        authUserId,
                        subscription.status,
                        subscription.id,
                    );
                } catch (err: any) {
                    console.error(`Stripe webhook: failed to inactivate on deletion: authUserId: ${authUserId}, subId: ${subscription.id}, status: ${subscription.status}, error: ${err}`);
                    // ConditionalCheckFailedException here again means: subscriptionId changed since we read; safe to swallow.
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

/**
 * Cancel a previous subscription if it looks like a trial.
 * This is called after a new entitled subscription becomes current.
 */
async function cancelPreviousTrialSubscription(args: {
    previousSubscriptionId: string;
    authUserId: string;
}) {
    const { previousSubscriptionId, authUserId } = args;

    try {
        const oldSub = await stripeBilling.subscriptions.retrieve(previousSubscriptionId);
        const oldStage = (oldSub.metadata as any)?.subscription_stage as "trial" | "paid" | undefined;
        const looksTrial = oldStage === "trial" || oldSub.status === "trialing" || !!oldSub.trial_end;

        if (!looksTrial) {
            console.log(`Previous subscription is not a trial; not canceling automatically: prevSubId: ${previousSubscriptionId}, authUserId: ${authUserId}, oldStage: ${oldStage}, oldStatus: ${oldSub.status}`,);
            return;
        }

        await stripeBilling.subscriptions.cancel(previousSubscriptionId);
        console.log(`Canceled previous trial subscription after new subscription became current: prevSubId: ${previousSubscriptionId}, authUserId: ${authUserId}, oldStage: ${oldStage}, oldStatus: ${oldSub.status}`);
    } catch (err) {
        console.error("Failed to inspect/cancel previous subscription", {
            authUserId,
            previousId: previousSubscriptionId,
            err,
        });
        // Swallow: events from this old sub are still gated by isCurrent in handleSubscriptionChange
    }
}
