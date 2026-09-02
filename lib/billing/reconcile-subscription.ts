import "server-only";

import {
    getUserProfile,
    updateUserSubscriptionStatusToActive,
    updateUserSubscriptionStatusToInactive,
    type UpdateUserSubscriptionParams,
} from "@/lib/dynamo/user-profile";
import type { AccountRole } from "@blueplanit/asv2-shared";

function isConditionalFailure(err: unknown): boolean {
    return (
        !!err &&
        typeof err === "object" &&
        (err as { name?: unknown }).name === "ConditionalCheckFailedException"
    );
}

// Mirrors updateUserSubscriptionStatusToActive, which sets a field only when it holds
// a truthy value. A field the write skipped must not be required to match.
function matchesOptional<T>(actual: T | null | undefined, expected: T | null | undefined) {
    return !expected || actual === expected;
}

export async function reconcileActiveSubscription(
    userId: string,
    params: UpdateUserSubscriptionParams,
    expectedSubscriptionId?: string | null,
): Promise<void> {
    try {
        await updateUserSubscriptionStatusToActive(
            userId,
            params,
            expectedSubscriptionId,
        );
        return;
    } catch (err) {
        if (!isConditionalFailure(err)) throw err;

        // A duplicate delivery succeeds only when the complete intended state is present.
        const latest = await getUserProfile(userId);
        const periodEnd = typeof params.currentPeriodEnd === "number"
            ? new Date(params.currentPeriodEnd * 1000).toISOString()
            : undefined;
        const alreadyApplied =
            latest?.subscriptionStatus === "active" &&
            latest.subscriptionId === params.subscriptionId &&
            latest.subscriptionCustomerId === params.stripeCustomerId &&
            matchesOptional(latest.subscriptionPlanId, params.planId) &&
            matchesOptional(latest.subscriptionInterval, params.interval) &&
            matchesOptional(latest.subscriptionCurrentPeriodEnd, periodEnd) &&
            matchesOptional(latest.subscriptionRawStatus, params.rawStatus);

        if (alreadyApplied) return;
        throw err;
    }
}

export async function reconcileInactiveSubscription(
    userId: string,
    accountRole: AccountRole | undefined,
    rawStatus: string,
    expectedSubscriptionId: string,
): Promise<void> {
    try {
        await updateUserSubscriptionStatusToInactive(
            userId,
            accountRole,
            rawStatus,
            expectedSubscriptionId,
        );
        return;
    } catch (err) {
        if (!isConditionalFailure(err)) throw err;

        // The write's only guard is subscriptionId, so a conditional failure means the
        // stored subscription is no longer this one. Deactivating would then revoke
        // entitlement a newer subscription grants, so the superseded event is dropped.
        const latest = await getUserProfile(userId);
        if (!latest || latest.subscriptionId !== expectedSubscriptionId) return;
        throw err;
    }
}
