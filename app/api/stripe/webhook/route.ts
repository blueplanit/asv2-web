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
import { trackServerEvent } from "@/lib/analytics/server-events";
import { EVENT_NAMES } from "@/lib/analytics/event-names";

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

/**
 * Whether this webhook delivery represents the first time Stripe collected
 * money for this subscription.
 *
 * The three firing cases:
 *  - created already active: a paid checkout that needed no authentication.
 *    Both routes to revenue land here, including trial conversions — buying
 *    during a trial mints a *new* subscription and cancels the trial one.
 *  - incomplete -> active: the same checkout after 3DS cleared.
 *  - trialing -> active: only when a card is added mid-trial via the billing
 *    portal, which leaves the original subscription in place. Rare, because
 *    trials are created with missing_payment_method: "cancel".
 *
 * `past_due -> active` is dunning recovery, not a conversion, so it is
 * excluded, and renewals leave the status on `active` untouched.
 *
 * No durable "already paid" guard is needed: Stripe's state machine makes each
 * of these happen at most once per subscription, since `trialing` can never be
 * re-entered and `canceled` is terminal, so a win-back mints a new
 * subscription. See docs/adr/0002-amplitude-funnel-instrumentation.md.
 */
function isSubscriptionPaidConversion(args: {
    subscription: Stripe.Subscription;
    isCreatedEvent: boolean;
    previousStatus: Stripe.Subscription.Status | undefined;
}) {
    const { subscription, isCreatedEvent, previousStatus } = args;

    if (subscription.status !== "active") return false;
    if (!(subscription.metadata as any)?.userId) return false;

    return (
        isCreatedEvent ||
        previousStatus === "trialing" ||
        previousStatus === "incomplete"
    );
}

async function emitSubscriptionPaidIfConverted(args: {
    subscription: Stripe.Subscription;
    isCreatedEvent: boolean;
    previousStatus: Stripe.Subscription.Status | undefined;
    // Whether the user already had a subscription before this one. null when
    // the profile could not be read.
    hadPriorSubscription: boolean | null;
}) {
    const { subscription, isCreatedEvent, previousStatus, hadPriorSubscription } = args;

    if (!isSubscriptionPaidConversion({ subscription, isCreatedEvent, previousStatus })) {
        return;
    }

    const userId = (subscription.metadata as any).userId as string;
    const priceItem = subscription.items.data[0]?.price;
    const planInfo = mapStripePriceToPlan(priceItem?.id);
    const unitAmount = priceItem?.unit_amount;
    // Checkout writes this only when the discount was actually applied, so a
    // full-price subscription never reports itself as promoted. See ADR-0005.
    const promotionId = ((subscription.metadata as any)?.promotionId as string) || null;

    await trackServerEvent({
        userId,
        eventName: EVENT_NAMES.SUBSCRIPTION_PAID,
        insertId: `${subscription.id}:paid`,
        ...(unitAmount != null
            ? { price: unitAmount / 100, quantity: 1 }
            : {}),
        ...(planInfo
            ? { productId: `${planInfo.planId}_${planInfo.interval}` }
            : {}),
        eventProperties: {
            plan_id: planInfo?.planId ?? null,
            interval: planInfo?.interval ?? null,
            currency: priceItem?.currency ?? null,
            subscription_id: subscription.id,
            promotion_active: promotionId !== null,
            ...(promotionId ? { promotion_id: promotionId } : {}),
            // Users can buy straight from the pricing page, skipping onboarding
            // entirely, so the two routes to revenue must be separable in the
            // funnel. See docs/adr/0002.
            purchase_path:
                hadPriorSubscription === null
                    ? "unknown"
                    : hadPriorSubscription
                        ? "post_trial"
                        : "direct",
        },
    });
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

                // previous_attributes only carries the fields that changed, so
                // an absent status means the status was not what changed.
                const previousStatus = (event.data.previous_attributes as
                    | Partial<Stripe.Subscription>
                    | undefined)?.status;
                const isCreatedEvent = event.type === "customer.subscription.created";

                // Read before handleSubscriptionChange overwrites it: a user who
                // already had a subscription trialed before paying, one who did
                // not bought straight from the pricing page. Gated on the same
                // predicate the emit uses, so renewals, dunning and ordinary
                // status churn don't pay for a read that is never used.
                const webhookUserId = (subscription.metadata as any)?.userId as string | undefined;
                const profileBeforeChange =
                    webhookUserId &&
                    isSubscriptionPaidConversion({ subscription, isCreatedEvent, previousStatus })
                        ? await getUserProfile(webhookUserId).catch(() => null)
                        : null;

                await handleSubscriptionChange(subscription);
                // Isolated from the outer catch: the subscription is already
                // updated in Dynamo by this point, so a tracking failure must
                // not return 500 and make Stripe redeliver the whole event.
                try {
                    await emitSubscriptionPaidIfConverted({
                        subscription,
                        isCreatedEvent,
                        previousStatus,
                        hadPriorSubscription: profileBeforeChange
                            ? !!profileBeforeChange.subscriptionId
                            : null,
                    });
                } catch (err) {
                    console.error(`Stripe webhook: failed to emit Subscription Paid: subId: ${subscription.id}, error: ${err}`);
                }
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
