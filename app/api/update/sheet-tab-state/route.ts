// app/api/update/sheet-tab-state/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ddb } from "@/lib/dynamo";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { SheetTabState, SheetTabStateSchema, sheetTabStateSk, sheetTabStatePk, getLatestSchemaVersion } from "@blueplanit/asv2-shared";
import { DataSyncEntryIdEnum, type DataSyncEntryId } from "@/lib/schemas/sync-config";
import { getTabColumnCount } from "@blueplanit/asv2-shared";

export const runtime = "nodejs";

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME!;

type Body = {
    spreadsheetId: string;
    initSheetTabStates: Array<{
        sheetId: number;
        dataSyncEntryId: DataSyncEntryId;
        rowCount?: number;
        lastSyncedAt?: string | null;
    }>;
} | null;

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }
    const userId = (session.user as any).userId as string;

    if (!userId) {
        return new NextResponse("User ID not found", { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as Body;
    if (!body?.initSheetTabStates || !Array.isArray(body.initSheetTabStates) || body.initSheetTabStates.length === 0) {
        return new NextResponse("sheetTabStates array is required and must not be empty", { status: 400 });
    }
    const { spreadsheetId } = body ?? {};
    if (!spreadsheetId) {
        return new NextResponse("spreadsheetId is required.", { status: 400 });
    }

    const now = new Date().toISOString();
    const pk = sheetTabStatePk(userId);
    const insertedItems: SheetTabState[] = [];

    // Validate and build all items first
    for (const stateInput of body.initSheetTabStates) {
        const { sheetId, dataSyncEntryId, rowCount, lastSyncedAt } = stateInput;

        if (typeof sheetId !== "number") {
            return new NextResponse("sheetId must be a number for all sheetTabStates", { status: 400 });
        }
        if (!dataSyncEntryId) {
            return new NextResponse("dataSyncEntryId is required for all sheetTabStates", { status: 400 });
        }

        // Validate dataSyncEntryId against enum
        let validatedDataSyncEntryId: DataSyncEntryId;
        try {
            validatedDataSyncEntryId = DataSyncEntryIdEnum.parse(dataSyncEntryId) as DataSyncEntryId;
        } catch {
            return new NextResponse(`Invalid dataSyncEntryId: ${dataSyncEntryId}`, { status: 400 });
        }

        // Construct the sort key: SHEET_TAB_STATE#${spreadsheetId}#${sheetId}#${dataSyncEntryId}
        const sk = sheetTabStateSk(spreadsheetId, sheetId, dataSyncEntryId);
        const schemaVersion = getLatestSchemaVersion(dataSyncEntryId);
        const columnCount = getTabColumnCount(dataSyncEntryId, schemaVersion);

        // Build the SheetTabState item with proper initialization
        const item: SheetTabState = SheetTabStateSchema.parse({
            pk,
            sk,
            type: "SheetTabState",
            userId,
            spreadsheetId,
            sheetId,
            columnCount,
            dataSyncEntryId: validatedDataSyncEntryId,
            appliedSchemaVersion: schemaVersion,
            rowCount: rowCount ?? 0,
            lastSyncedAt: lastSyncedAt ?? null,
            createdAt: now,
            updatedAt: now,
        });

        insertedItems.push(item);
    }

    // DynamoDB TransactWriteItems supports up to 25 items per transaction
    const MAX_TRANSACTION_ITEMS = 25;
    const chunks: SheetTabState[][] = [];
    
    for (let i = 0; i < insertedItems.length; i += MAX_TRANSACTION_ITEMS) {
        chunks.push(insertedItems.slice(i, i + MAX_TRANSACTION_ITEMS));
    }

    // Process each chunk in a transaction
    for (const chunk of chunks) {
        const transactItems = chunk.map((item) => ({
            Put: {
                TableName: TABLE_NAME,
                Item: item,
                ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
            },
        }));

        try {
            await ddb.send(
                new TransactWriteCommand({
                    TransactItems: transactItems,
                }),
            );
        } catch (error: any) {
            // If any item already exists, return an error
            if (error.name === "TransactionCanceledException") {
                // TransactionCanceledException occurs when a condition check fails
                // We can't easily determine which specific item failed in a transaction
                return new NextResponse(
                    `One or more SheetTabState items already exist. Transaction failed.`,
                    { status: 409 }
                );
            }
            throw error;
        }
    }

    return NextResponse.json({ 
        inserted: insertedItems.length,
        sheetTabStates: insertedItems 
    });
}
