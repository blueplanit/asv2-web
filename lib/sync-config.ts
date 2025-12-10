// lib/sync-config.ts
import { ddb } from "./dynamo";
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
    SyncConfigSchema,
    type SyncConfig,
    type StripeDataSyncEntry,
    buildDefaultStripeDataSyncMap,
} from "@/lib/schemas/sync-config";

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME!;

// Assume there is only one sync config for a user for MVP 
export async function getUserSyncConfig(
    authUserId: string,
    spreadsheetId?: string,
): Promise<SyncConfig | undefined> {
    const sk = spreadsheetId ? `SYNC#${spreadsheetId}` : "SYNC#";
    const keyConditionExpression = spreadsheetId ? `pk = :pk AND sk = :sk` : `pk = :pk AND begins_with(sk, :sk)`;
    const res = await ddb.send(
        new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: keyConditionExpression,
            ExpressionAttributeValues: {
                ":pk": `USER#${authUserId}`,
                ":sk": sk,
            },
            Limit: 2, // enough to detect "more than one"
        }),
    );

    const items = res.Items ?? [];
    if (items.length === 0) return undefined;

    if (items.length > 1) {
        console.error("Invariant violation: multiple sync configs for user", {
            authUserId,
            count: items.length,
        });
        // You can choose to throw here instead if you want it loud:
        // throw new Error("Multiple sync configs for user");
    }

    return SyncConfigSchema.parse(items[0]);
}


export async function ensureSyncConfigForSheet(params: {
    authUserId: string;
    spreadsheetId: string;
    stripeAccountId: string;
}) {
    const { authUserId, spreadsheetId, stripeAccountId } = params;
    const pk = `USER#${authUserId}`;
    const sk = `SYNC#${spreadsheetId}`;

    // 1) If any sync config already exists, just return it
    const existing = await getUserSyncConfig(authUserId);
    if (existing) {
        return existing;
    }

    if (!stripeAccountId) {
        throw new Error("Stripe account ID is required");
    }
    if (!spreadsheetId) {
        throw new Error("Spreadsheet ID is required");
    }
    if (!authUserId) {
        throw new Error("Auth user ID is required");
    }

    // 2) Otherwise create a minimal config; other fields remain unset
    const now = new Date().toISOString();

    const item: SyncConfig = SyncConfigSchema.parse({
        pk,
        sk,
        type: "SyncConfig",
        userId: authUserId,
        spreadsheetId,
        stripeAccountId,
        lastSyncAt: null,
        lastError: null,
        createdAt: now,
        updatedAt: now,
    });

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
    authUserId: string;
    spreadsheetId: string;
    stripeAccountId: string;
    stripeDataSyncMap?: StripeDataSyncEntry[];
    historyMode?: SyncConfig["historyMode"];
    historySinceDays?: number;
    syncStatus?: SyncConfig["syncStatus"];
}) {
    const {
        authUserId,
        spreadsheetId,
        stripeAccountId,
        stripeDataSyncMap,
        historyMode = "since",
        historySinceDays = 90,
        syncStatus = "onboarding",
    } = params;

    if (!stripeAccountId) {
        throw new Error("Stripe account ID is required");
    }
    if (!spreadsheetId) {
        throw new Error("Spreadsheet ID is required");
    }
    if (!authUserId) {
        throw new Error("Auth user ID is required");
    }

    const now = new Date().toISOString();

    const item: SyncConfig = SyncConfigSchema.parse({
        pk: `USER#${authUserId}`,
        sk: `SYNC#${spreadsheetId}`,
        type: "SyncConfig",

        userId: authUserId,
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

    await ddb.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: item,
            ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        }),
    );

    return item;
}

export async function getSyncConfig(authUserId: string, spreadsheetId: string) {
    const res = await ddb.send(
        new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                pk: `USER#${authUserId}`,
                sk: `SYNC#${spreadsheetId}`,
            },
        }),
    );

    if (!res.Item) return undefined;
    return SyncConfigSchema.parse(res.Item);
}

// For toggling which Stripe objects are enabled, or history settings, from the UI
export async function updateSyncConfig(params: {
    authUserId: string;
    spreadsheetId: string;
    stripeDataSyncMap?: StripeDataSyncEntry[];
    historyMode?: SyncConfig["historyMode"] | null;
    historySinceDays?: number | null;
    syncStatus?: SyncConfig["syncStatus"];
}) {
    const {
        authUserId,
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
            Key: {
                pk: `USER#${authUserId}`,
                sk: `SYNC#${spreadsheetId}`,
            },
            UpdateExpression,
            ExpressionAttributeValues: values,
            ReturnValues: "ALL_NEW",
        }),
    );

    return SyncConfigSchema.parse(res.Attributes!);
}
