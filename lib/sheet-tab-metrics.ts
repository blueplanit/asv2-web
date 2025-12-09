// lib/sheet-tab-metrics.ts
import { ddb } from "./dynamo";
import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
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

