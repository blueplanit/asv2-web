// lib/user-state.ts
////////////////////////////////////////////////////////////////////////////
// SERVER-ONLY: do not import this into "use client" components.
////////////////////////////////////////////////////////////////////////////

import { ddb } from "./dynamo";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import {
    UserProfileSchema,
    type UserProfile,
} from "@/lib/schemas/user-profile";
import {
    GoogleConnectionSchema,
    type GoogleConnection,
} from "@/lib/schemas/google-connection";
import {
    StripeConnectionSchema,
    type StripeConnection,
} from "@/lib/schemas/stripe-connection";
import {
    SyncConfigSchema,
    type SyncConfig,
} from "@/lib/schemas/sync-config";

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME!;

export type OnboardingStage =
    | "account_only"           // user profile only
    | "stripe_connected"       // stripe connected, no google
    | "google_connected"       // google connected, no stripe
    | "connections_linked"     // both connected, no sync config
    | "sheet_created"          // sync config exists, onboarding state
    | "ready";                 // at least one sync config active

export type UserState = {
    profile?: UserProfile;
    googleConnections: GoogleConnection[];
    stripeConnections: StripeConnection[];
    syncConfigs: SyncConfig[];
    onboardingStage: OnboardingStage;
};

function computeOnboardingStage(state: {
    profile?: UserProfile;
    googleConnections: GoogleConnection[];
    stripeConnections: StripeConnection[];
    syncConfigs: SyncConfig[];
}): OnboardingStage {
    const { profile, googleConnections, stripeConnections, syncConfigs } = state;

    if (!profile) return "account_only";

    const hasStripe = stripeConnections.length > 0;
    const hasGoogle = googleConnections.length > 0;
    const hasSyncConfig = syncConfigs.length > 0;

    if (!hasStripe && !hasGoogle && !hasSyncConfig) {
        return "account_only";
    }

    if (hasStripe && !hasGoogle && !hasSyncConfig) {
        return "stripe_connected";
    }

    if (!hasStripe && hasGoogle && !hasSyncConfig) {
        return "google_connected";
    }

    if (hasStripe && hasGoogle && !hasSyncConfig) {
        return "connections_linked";
    }

    // Assume there is only one sync config for a user for MVP 
    const userSyncConfig = syncConfigs.length > 0 ? syncConfigs[0] : null;
    if (hasStripe && hasGoogle && userSyncConfig?.enabledStripeObjects.length === 0 && userSyncConfig?.spreadsheetId) {
        return "sheet_created";
    }

    return "ready";
}

// Main loader: one query, then fan-out by `sk` prefix
export async function loadUserState(authUserId: string): Promise<UserState> {
    const pk = `USER#${authUserId}`;

    const res = await ddb.send(
        new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "pk = :pk",
            ExpressionAttributeValues: {
                ":pk": pk,
            },
        }),
    );

    const items = res.Items ?? [];

    let profile: UserProfile | undefined;
    const googleConnections: GoogleConnection[] = [];
    const stripeConnections: StripeConnection[] = [];
    const syncConfigs: SyncConfig[] = [];

    for (const raw of items) {
        const sk = raw.sk as string;

        if (sk === "PROFILE") {
            profile = UserProfileSchema.parse(raw);
        } else if (sk.startsWith("GOOGLE#")) {
            googleConnections.push(GoogleConnectionSchema.parse(raw));
        } else if (sk.startsWith("STRIPE#")) {
            stripeConnections.push(StripeConnectionSchema.parse(raw));
        } else if (sk.startsWith("SYNC#")) {
            syncConfigs.push(SyncConfigSchema.parse(raw));
        }
    }

    const onboardingStage = computeOnboardingStage({
        profile,
        googleConnections,
        stripeConnections,
        syncConfigs,
    });

    return {
        profile,
        googleConnections,
        stripeConnections,
        syncConfigs,
        onboardingStage,
    };
}


export type SyncConfigsBySheetId = Record<string, SyncConfig>;

export function mapSyncConfigsBySpreadsheetId(
    syncConfigs: SyncConfig[],
): SyncConfigsBySheetId {
    return syncConfigs.reduce<SyncConfigsBySheetId>((acc, cfg) => {
        // spreadsheetId is required by schema, so no extra checks needed
        acc[cfg.spreadsheetId] = cfg;
        return acc;
    }, {});
}
