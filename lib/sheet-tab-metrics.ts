// lib/sheet-tab-metrics.ts
import { ddb } from "./dynamo";
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SheetTabMetricsSchema, type SheetTabMetrics } from "@blueplanit/asv2-shared";

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME!;

/**
 * Get a specific sheet tab metrics by userId, spreadsheetId, and sheetId
 */
export async function getSheetTabMetrics(params: {
    authUserId: string;
    spreadsheetId: string;
    sheetId: number;
}): Promise<SheetTabMetrics | undefined> {
    const { authUserId, spreadsheetId, sheetId } = params;
    
    const res = await ddb.send(
        new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                pk: `USER#${authUserId}`,
                sk: `SHEET_TAB_METRICS#${spreadsheetId}#${sheetId}`,
            },
        }),
    );

    if (!res.Item) return undefined;
    return SheetTabMetricsSchema.parse(res.Item);
}

/**
 * Get all sheet tab metrics for a specific spreadsheet
 */
export async function getSheetTabMetricsForSpreadsheet(params: {
    authUserId: string;
    spreadsheetId: string;
}): Promise<SheetTabMetrics[]> {
    const { authUserId, spreadsheetId } = params;
    
    const res = await ddb.send(
        new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
            ExpressionAttributeValues: {
                ":pk": `USER#${authUserId}`,
                ":sk": `SHEET_TAB_METRICS#${spreadsheetId}#`,
            },
        }),
    );

    const items = res.Items ?? [];
    return items.map((item) => SheetTabMetricsSchema.parse(item));
}

/**
 * Get all sheet tab metrics for a user (across all spreadsheets)
 */
export async function getAllSheetTabMetricsForUser(
    authUserId: string,
): Promise<SheetTabMetrics[]> {
    const res = await ddb.send(
        new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
            ExpressionAttributeValues: {
                ":pk": `USER#${authUserId}`,
                ":sk": "SHEET_TAB_METRICS#",
            },
        }),
    );

    const items = res.Items ?? [];
    return items.map((item) => SheetTabMetricsSchema.parse(item));
}

/**
 * Create or update sheet tab metrics
 * If the item exists, it will be updated; otherwise, it will be created.
 */
export async function upsertSheetTabMetrics(params: {
    authUserId: string;
    spreadsheetId: string;
    sheetId: number;
    rowCount: number;
    lastObservedAt?: string; // defaults to current ISO timestamp
}): Promise<SheetTabMetrics> {
    const {
        authUserId,
        spreadsheetId,
        sheetId,
        rowCount,
        lastObservedAt = new Date().toISOString(),
    } = params;

    if (!authUserId) {
        throw new Error("Auth user ID is required");
    }
    if (!spreadsheetId) {
        throw new Error("Spreadsheet ID is required");
    }
    if (sheetId < 0) {
        throw new Error("Sheet ID must be non-negative");
    }
    if (rowCount < 0) {
        throw new Error("Row count must be non-negative");
    }

    const item: SheetTabMetrics = SheetTabMetricsSchema.parse({
        pk: `USER#${authUserId}`,
        sk: `SHEET_TAB_METRICS#${spreadsheetId}#${sheetId}`,
        type: "SheetTabMetrics",
        spreadsheetId,
        sheetId,
        rowCount,
        lastObservedAt,
    });

    await ddb.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: item,
        }),
    );

    return item;
}

/**
 * Update only the row count and lastObservedAt for an existing sheet tab metrics
 */
export async function updateSheetTabMetricsRowCount(params: {
    authUserId: string;
    spreadsheetId: string;
    sheetId: number;
    rowCount: number;
    lastObservedAt?: string; // defaults to current ISO timestamp
}): Promise<SheetTabMetrics> {
    const {
        authUserId,
        spreadsheetId,
        sheetId,
        rowCount,
        lastObservedAt = new Date().toISOString(),
    } = params;

    if (rowCount < 0) {
        throw new Error("Row count must be non-negative");
    }

    const res = await ddb.send(
        new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
                pk: `USER#${authUserId}`,
                sk: `SHEET_TAB_METRICS#${spreadsheetId}#${sheetId}`,
            },
            UpdateExpression: "SET rowCount = :rc, lastObservedAt = :loa",
            ExpressionAttributeValues: {
                ":rc": rowCount,
                ":loa": lastObservedAt,
            },
            ReturnValues: "ALL_NEW",
        }),
    );

    return SheetTabMetricsSchema.parse(res.Attributes!);
}

/**
 * Get a map of sheetId -> SheetTabMetrics for a spreadsheet
 * Useful for quick lookups by sheetId
 */
export async function getSheetTabMetricsMapForSpreadsheet(params: {
    authUserId: string;
    spreadsheetId: string;
}): Promise<Map<number, SheetTabMetrics>> {
    const metrics = await getSheetTabMetricsForSpreadsheet(params);
    const map = new Map<number, SheetTabMetrics>();
    
    for (const metric of metrics) {
        map.set(metric.sheetId, metric);
    }
    
    return map;
}

