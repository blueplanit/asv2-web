// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripeBilling } from "@/lib/stripe-billing";
import { updateUserSubscriptionStatusToActive, updateUserSubscriptionStatusToInactive } from "@/lib/user-profile";
import Stripe from "stripe";

export const runtime = "nodejs";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

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
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                const authUserId = session.metadata?.authUserId;
                const subscriptionId = session.subscription as string | null;

                if (authUserId && subscriptionId) {
                    await updateUserSubscriptionStatusToActive(authUserId, subscriptionId);
                }
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

            case "customer.subscription.updated": {
                const subscription = event.data.object as Stripe.Subscription;
                const status = subscription.status;
                const authUserId = (subscription.metadata as any)?.authUserId;

                if (!authUserId) break;

                if (status === "active" || status === "trialing") {
                    await updateUserSubscriptionStatusToActive(authUserId, subscription.id);
                } else if (
                    status === "canceled" ||
                    status === "unpaid" ||
                    status === "incomplete_expired"
                ) {
                    await updateUserSubscriptionStatusToInactive(authUserId);
                }
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
