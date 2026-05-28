// lib/dynamo/sync-config.ts
import { ddb } from ".";
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
    SyncConfigSchema,
    type SyncConfig,
    type StripeDataSyncEntry,
    buildDefaultStripeDataSyncMap,
} from "@/lib/schemas/sync-config";
import { userPk, syncConfigSk, stripeAccountGsiPk, DEFAULT_INITIAL_BACKFILL_HISTORY_DAYS } from "@blueplanit/asv2-shared";
import { getGoogleConnections } from "@/lib/google/google-connection";

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME!;
const STRIPE_ACCOUNT_GSI_NAME = "STRIPE_ACCOUNT_GSI";

export const defaultHistoryDays = (() => {
    const raw = process.env.INITIAL_BACKFILL_HISTORY_DAYS;
    if (!raw) return DEFAULT_INITIAL_BACKFILL_HISTORY_DAYS;
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed) || parsed <= 0) {
        console.warn(`INITIAL_BACKFILL_HISTORY_DAYS="${raw}" is invalid; falling back to ${DEFAULT_INITIAL_BACKFILL_HISTORY_DAYS}`);
        return DEFAULT_INITIAL_BACKFILL_HISTORY_DAYS;
    }
    return parsed;
})();

export async function getSyncConfigs(
    userId: string,
): Promise<SyncConfig[]> {
    const res = await ddb.send(
        new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
            ExpressionAttributeValues: {
                ":pk": userPk(userId),
                ":sk": "SYNC#",
            },
        }),
    );

    const items = res.Items ?? [];
    if (items.length === 0) return [];

    return items.map((item) => SyncConfigSchema.parse(item));
}


export async function ensureSyncConfigForSheet(params: {
    userId: string;
    spreadsheetId: string;
    stripeAccountId: string;
    timezone?: string | null;
    locale?: string | null;
}) {
    const { userId, spreadsheetId, stripeAccountId } = params;
    const timezone = params.timezone?.trim() || undefined;
    const locale = params.locale?.trim() || undefined;
    const pk = userPk(userId);
    const sk = syncConfigSk(spreadsheetId);

    if (!userId) {
        throw new Error("Auth user ID is required");
    }

    if (!spreadsheetId) {
        throw new Error("Spreadsheet ID is required");
    }

    // 1) If any sync config already exists, just return it
    const existing = await getSyncConfig(userId, spreadsheetId);
    if (existing) {
        return existing;
    }

    if (!stripeAccountId) {
        throw new Error("Stripe account ID is required");
    }

    // 2) Otherwise create a minimal config; other fields remain unset
    const now = new Date().toISOString();

    const item: SyncConfig = SyncConfigSchema.parse({
        pk,
        sk,
        type: "SyncConfig",
        userId: userId,
        spreadsheetId,
        stripeAccountId,
        historySinceDays: defaultHistoryDays,
        lastSyncAt: null,
        lastError: null,
        createdAt: now,
        updatedAt: now,
    });
    if (timezone) {
        (item as any).timezone = timezone;
    }
    if (locale) {
        (item as any).locale = locale;
    }

    await ddb.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: item,
            ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        }),
    );

    return item;
}

// Create initial config when spreadsheet is created
export async function createSyncConfig(params: {
    userId: string;
    spreadsheetId: string;
    stripeAccountId: string;
    stripeDataSyncMap?: StripeDataSyncEntry[];
    historyMode?: SyncConfig["historyMode"];
    historySinceDays?: number;
    syncStatus?: SyncConfig["syncStatus"];
    timezone?: string | null;
    locale?: string | null;
}) {
    const {
        userId,
        spreadsheetId,
        stripeAccountId,
        stripeDataSyncMap,
        historyMode = "since",
        historySinceDays = defaultHistoryDays,
        syncStatus = "onboarding",
        timezone,
        locale,
    } = params;

    if (!stripeAccountId) {
        throw new Error("Stripe account ID is required");
    }
    if (!spreadsheetId) {
        throw new Error("Spreadsheet ID is required");
    }
    if (!userId) {
        throw new Error("Auth user ID is required");
    }

    const now = new Date().toISOString();

    const item: SyncConfig = SyncConfigSchema.parse({
        pk: userPk(userId),
        sk: syncConfigSk(spreadsheetId),
        type: "SyncConfig",

        userId: userId,
        spreadsheetId,
        stripeAccountId,

        stripeDataSyncMap: stripeDataSyncMap ?? buildDefaultStripeDataSyncMap(),
        historyMode,
        historySinceDays,

        syncStatus,
        lastSyncAt: null,
        lastError: null,

        createdAt: now,
        updatedAt: now,
    });
    if (timezone) {
        (item as any).timezone = timezone.trim();
    }
    if (locale) {
        (item as any).locale = locale.trim();
    }

    await ddb.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: item,
            ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        }),
    );

    return item;
}

export async function getSyncConfig(userId: string, spreadsheetId: string) {
    const res = await ddb.send(
        new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                pk: userPk(userId),
                sk: syncConfigSk(spreadsheetId),
            },
        }),
    );

    if (!res.Item) return undefined;
    return SyncConfigSchema.parse(res.Item);
}

// For toggling which Stripe objects are enabled, or history settings, from the UI
// Two-step lookup: GSI → userIds from StripeConnection items → SyncConfigs per user
export async function getSyncConfigsByStripeAccountId(
    stripeAccountId: string,
): Promise<SyncConfig[]> {
    const connectionsRes = await ddb.send(
        new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: STRIPE_ACCOUNT_GSI_NAME,
            KeyConditionExpression: "STRIPE_ACCOUNT_GSI_PK = :gsiPk",
            ExpressionAttributeValues: {
                ":gsiPk": stripeAccountGsiPk(stripeAccountId),
            },
        }),
    );

    const connectionItems = connectionsRes.Items ?? [];
    if (connectionItems.length === 0) return [];

    const userIds = [...new Set(
        connectionItems.map((item) => item.userId as string).filter(Boolean),
    )];

    const results = await Promise.all(
        userIds.map((userId) =>
            ddb.send(
                new QueryCommand({
                    TableName: TABLE_NAME,
                    KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
                    FilterExpression: "stripeAccountId = :stripeAccountId",
                    ExpressionAttributeValues: {
                        ":pk": userPk(userId),
                        ":sk": "SYNC#",
                        ":stripeAccountId": stripeAccountId,
                    },
                }),
            ),
        ),
    );

    return results.flatMap((res) =>
        (res.Items ?? []).map((item) => SyncConfigSchema.parse(item)),
    );
}

/**
 * Marks all non-retired sync configs for a user as errored.
 * Called when the user's Google connection transitions to "revoked" or "error"
 * so that the sync health state stays consistent with the connection state.
 */
export async function errorSyncConfigsForGoogleIncident(
    userId: string,
    googleUserId: string,
    lastError: string,
): Promise<void> {
    // If the user has multiple Google connections we can't determine which sync
    // configs belong to the affected account (SyncConfig has no googleUserId field).
    // Skip and let the sync worker error the right configs on its next cycle.
    // TODO: When SyncConfig gains a googleUserId field, replace this guard with a filter.
    const googleConnections = await getGoogleConnections(userId);
    if (googleConnections.length > 1) return;

    const configs = await getSyncConfigs(userId);
    const toUpdate = configs.filter((c) => c.syncStatus !== "retired");
    if (toUpdate.length === 0) return;

    const now = new Date().toISOString();
    await Promise.all(
        toUpdate.map((cfg) =>
            ddb.send(
                new UpdateCommand({
                    TableName: TABLE_NAME,
                    Key: { pk: userPk(userId), sk: syncConfigSk(cfg.spreadsheetId) },
                    UpdateExpression: "SET syncStatus = :sts, lastError = :err, updatedAt = :now",
                    ConditionExpression: "attribute_exists(pk)",
                    ExpressionAttributeValues: {
                        ":sts": "error",
                        ":err": lastError,
                        ":now": now,
                    },
                }),
            ),
        ),
    );
}

export async function updateSyncConfig(params: {
    userId: string;
    spreadsheetId: string;
    stripeDataSyncMap?: StripeDataSyncEntry[];
    historyMode?: SyncConfig["historyMode"] | null;
    historySinceDays?: number | null;
    syncStatus?: SyncConfig["syncStatus"];
}) {
    const {
        userId,
        spreadsheetId,
        stripeDataSyncMap,
        historyMode,
        historySinceDays,
        syncStatus,
    } = params;

    const updates: string[] = [];
    const values: Record<string, unknown> = {
        ":updatedAt": new Date().toISOString(),
    };

    if (stripeDataSyncMap !== undefined) {
        updates.push("stripeDataSyncMap = :sdsm");
        values[":sdsm"] = stripeDataSyncMap;
    }

    if (historyMode !== undefined && historyMode !== null) {
        updates.push("historyMode = :hm");
        values[":hm"] = historyMode;
    }

    if (historySinceDays !== undefined && historySinceDays !== null) {
        updates.push("historySinceDays = :hsd");
        values[":hsd"] = historySinceDays;
    }

    if (syncStatus !== undefined) {
        updates.push("syncStatus = :sts");
        values[":sts"] = syncStatus;
    }

    updates.push("updatedAt = :updatedAt");

    const UpdateExpression = "SET " + updates.join(", ");

    const res = await ddb.send(
        new UpdateCommand({
            TableName: TABLE_NAME,
            ConditionExpression: "attribute_exists(pk) AND attribute_exists(sk)",
            Key: {
                pk: userPk(userId),
                sk: syncConfigSk(spreadsheetId),
            },
            UpdateExpression,
            ExpressionAttributeValues: values,
            ReturnValues: "ALL_NEW",
        }),
    );

    console.log("updateSyncConfig res", res.Attributes);

    return SyncConfigSchema.parse(res.Attributes!);
}
