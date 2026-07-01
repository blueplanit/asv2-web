import "server-only";

import type { SyncConfig } from "@/lib/schemas/sync-config";
import { getStripeConnection } from "@/lib/stripe/stripe-connection";
import { getGoogleConnections } from "@/lib/google/google-connection";

export type ConnectionGuardFailure = {
    ok: false;
    message: string;
};

export type ConnectionGuardSuccess = {
    ok: true;
};

export type ConnectionGuardResult = ConnectionGuardSuccess | ConnectionGuardFailure;

/**
 * Verifies the user has a connected Stripe account matching the sync config
 * and at least one connected Google connection before starting backfill.
 */
export async function assertConnectionsReadyForBackfill(
    userId: string,
    config: Pick<SyncConfig, "stripeAccountId">,
): Promise<ConnectionGuardResult> {
    const stripeConnection = await getStripeConnection(userId, config.stripeAccountId);
    if (!stripeConnection || stripeConnection.status !== "connected") {
        return {
            ok: false,
            message: "Connect a Stripe account before starting sync.",
        };
    }

    const googleConnections = await getGoogleConnections(userId);
    const hasConnectedGoogle = googleConnections.some((c) => c.status === "connected");
    if (!hasConnectedGoogle) {
        return {
            ok: false,
            message: "Grant Google Sheets access before starting sync.",
        };
    }

    return { ok: true };
}
