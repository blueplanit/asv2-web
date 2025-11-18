// lib/sync-config.ts
import { ddb } from "./dynamo";
import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
    SyncConfigSchema,
    type SyncConfig,
    StripeObjectEnum,
    StripeObject,
} from "@/lib/schemas/sync-config";

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME!;

export async function ensureSyncConfigForSheet(params: {
    authUserId: string;
    spreadsheetId: string;
    stripeAccountId: string;
}) {
    const { authUserId, spreadsheetId, stripeAccountId } = params;
    const pk = `USER#${authUserId}`;
    const sk = `SYNC#${spreadsheetId}`;

    // 1) If it already exists, return it and don’t overwrite anything
    const existing = await ddb.send(
        new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk, sk },
        }),
    );

    if (existing.Item) {
        return SyncConfigSchema.parse(existing.Item);
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
        state: "onboarding",
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
    enabledStripeObjects?: (typeof StripeObjectEnum.enum)[];
    historyMode?: SyncConfig["historyMode"];
    historySinceDays?: number;
}) {
    const {
        authUserId,
        spreadsheetId,
        stripeAccountId,
        enabledStripeObjects = ["charges", "invoices", "customers", "payouts", "subscriptions"], // sane defaults
        historyMode = "since",
        historySinceDays = 90,
    } = params;

    const now = new Date().toISOString();

    const item: SyncConfig = SyncConfigSchema.parse({
        pk: `USER#${authUserId}`,
        sk: `SYNC#${spreadsheetId}`,
        type: "SyncConfig",

        userId: authUserId,
        spreadsheetId,
        stripeAccountId,

        enabledStripeObjects,
        historyMode,
        historySinceDays,

        state: "onboarding",
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
    enabledStripeObjects?: StripeObject[];
    historyMode?: SyncConfig["historyMode"];
    historySinceDays?: number | null;
}) {
    const {
        authUserId,
        spreadsheetId,
        enabledStripeObjects,
        historyMode,
        historySinceDays,
      } = params;

    const updates: string[] = [];
    const values: Record<string, unknown> = {
        ":updatedAt": new Date().toISOString(),
    };

    if (enabledStripeObjects) {
        updates.push("enabledStripeObjects = :objs");
        values[":objs"] = enabledStripeObjects;
    }

    if (historyMode) {
        updates.push("historyMode = :hm");
        values[":hm"] = historyMode;
    }

    if (historySinceDays !== undefined) {
        updates.push("historySinceDays = :hsd");
        values[":hsd"] = historySinceDays;
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
