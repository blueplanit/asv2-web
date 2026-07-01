// lib/app-state/user-state.ts
////////////////////////////////////////////////////////////////////////////
// SERVER-ONLY: do not import this into "use client" components.
////////////////////////////////////////////////////////////////////////////

import { ddb } from "../dynamo";
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
import { SheetTabState, SheetTabStateSchema, userPk } from "@blueplanit/asv2-shared";

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME!;

export type OnboardingStage =
    | "account_only"           // user profile only
    | "stripe_connected"       // stripe connected, no google
    | "google_connected"       // google connected, no stripe
    | "connections_linked"     // both connected, no sync config
    | "sheet_created"          // at least one onboarding sync config with a sheet created
    | "ready";                 // at least one sync config active

export type UserState = {
    profile?: UserProfile;
    googleConnections: GoogleConnection[];
    stripeConnections: StripeConnection[];
    syncConfigs: SyncConfig[];
    onboardingStage: OnboardingStage;
    sheetTabState: SheetTabState[];
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

    // Ignore retired configs for onboarding state
    const nonRetiredConfigs = syncConfigs.filter(
        (cfg) => cfg.syncStatus !== "retired",
    );

    const hasAnyConfig = nonRetiredConfigs.length > 0;
    const onboardingConfigs = nonRetiredConfigs.filter(
        (cfg) => cfg.syncStatus === "onboarding",
    );
    const activeConfigs = nonRetiredConfigs.filter(
        (cfg) =>
            cfg.syncStatus === "syncing" ||
            cfg.syncStatus === "backfill_running" ||
            cfg.syncStatus === "paused",
    );

    // No configs yet
    if (!hasAnyConfig) {
        if (!hasStripe && !hasGoogle) return "account_only";
        if (hasStripe && !hasGoogle) return "stripe_connected";
        if (!hasStripe && hasGoogle) return "google_connected";
        if (hasStripe && hasGoogle) return "connections_linked";
        return "account_only";
    }

    // At least one onboarding config → sheet created but not fully configured
    if (onboardingConfigs.length > 0) {
        const anySheetCreated = onboardingConfigs.some(
            (cfg) =>
                cfg.spreadsheetId &&
                (!cfg.stripeDataSyncMap ||
                    cfg.stripeDataSyncMap.length === 0),
        );

        if (anySheetCreated) {
            return "sheet_created";
        }

        // Defensive fallback: we have an onboarding config but no sheet info yet
        return "connections_linked";
    }

    // At least one active (non-onboarding, non-retired) config → ready
    if (activeConfigs.length > 0) {
        return "ready";
    }

    // Only retired configs left → treat as "connections linked" (no current workspace)
    if (hasStripe && hasGoogle) return "connections_linked";
    if (hasStripe && !hasGoogle) return "stripe_connected";
    if (!hasStripe && hasGoogle) return "google_connected";
    return "account_only";
}

// Main loader: one query, then fan-out by `sk` prefix
export async function loadUserState(
    userId: string,
    opts?: { consistentRead?: boolean },
): Promise<UserState> {
    if (!userId) {
        throw new Error("User ID is required");
    }

    const pk = userPk(userId);

    const res = await ddb.send(
        new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "pk = :pk",
            ExpressionAttributeValues: {
                ":pk": pk,
            },
            // Strongly consistent reads cost 2x RCU; only opt in where a caller
            // reads immediately after a write in the same request (e.g. the
            // Google OAuth callback creating the workspace sheet).
            ConsistentRead: opts?.consistentRead ?? false,
        }),
    );

    const items = res.Items ?? [];

    let profile: UserProfile | undefined;
    const googleConnections: GoogleConnection[] = [];
    const stripeConnections: StripeConnection[] = [];
    const syncConfigs: SyncConfig[] = [];
    const sheetTabState: SheetTabState[] = [];

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
        } else if (sk.startsWith("SHEET_TAB_STATE#")) {
            sheetTabState.push(SheetTabStateSchema.parse(raw));
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
        sheetTabState,
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
