import "server-only";

import { stripeBilling } from "@/lib/stripe/stripe-billing";

export async function cancelPreviousTrialSubscription(args: {
    previousSubscriptionId: string;
    userId: string;
}) {
    const { previousSubscriptionId, userId } = args;

    try {
        const previous = await stripeBilling.subscriptions.retrieve(previousSubscriptionId);
        const stage = previous.metadata?.subscription_stage;
        const looksLikeTrial =
            (stage === "trial" || previous.status === "trialing" || !!previous.trial_end) &&
            previous.status !== "active" &&
            previous.status !== "past_due";

        if (!looksLikeTrial) {
            console.log("Previous subscription is not a trial; leaving it unchanged", {
                previousSubscriptionId,
                userId,
                stage,
                status: previous.status,
            });
            return;
        }

        await stripeBilling.subscriptions.cancel(previousSubscriptionId);
    } catch (err) {
        console.error("Failed to inspect or cancel previous trial subscription", {
            previousSubscriptionId,
            userId,
            err,
        });
    }
}
