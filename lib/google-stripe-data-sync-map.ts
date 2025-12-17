// lib/google-stripe-data-sync-map.ts

import type {
    StripeDataSyncEntry,
} from "./schemas/sync-config";
import { getGoogleAccessTokenForUser } from "./google-auth";
import { google, sheets_v4 } from "googleapis";
import { APP_NAME } from "./constants";

function titleForEntry(entry: StripeDataSyncEntry): string {
    const base = entry.displayName ?? entry.id;
    return `${base}_raw (DO NOT EDIT)`;
}

export async function ensureSheetTabsForStripeDataSyncMap(params: {
    userId: string;
    spreadsheetId: string;
    stripeDataSyncMap: StripeDataSyncEntry[];
    workingSheetTitle?: string;
    workingSheetMessage?: string;
}): Promise<StripeDataSyncEntry[]> {
    const { userId, spreadsheetId } = params;
    let {workingSheetTitle, workingSheetMessage} = params;
    workingSheetTitle = workingSheetTitle || "Working Sheet";
    workingSheetMessage = workingSheetMessage || "Use this sheet for your own analysis. You can edit anything here. Don't edit the protected tabs. Instead, reference the protected *_raw (DO NOT EDIT) tabs with formulas.";

    try {
        let { stripeDataSyncMap } = params;

        if (stripeDataSyncMap.length === 0) return stripeDataSyncMap;
        if (!spreadsheetId) throw new Error("Spreadsheet ID is required");
        if (!userId) throw new Error("User ID is required");

        // 1) Get Google access token for this user
        const { accessToken } = await getGoogleAccessTokenForUser(
            userId,
        );

        // 2) Build OAuth2 client using googleapis
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID!,
            process.env.GOOGLE_CLIENT_SECRET!,
        );

        oauth2Client.setCredentials({
            access_token: accessToken,
        });

        const sheets = google.sheets({ version: "v4", auth: oauth2Client });

        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId,
        });

        const existingSheets = spreadsheet.data.sheets ?? [];

        const byId = new Map<number, sheets_v4.Schema$Sheet>();
        const byTitle = new Map<string, sheets_v4.Schema$Sheet>();

        for (const s of existingSheets) {
            const id = s.properties?.sheetId;
            const title = s.properties?.title;
            if (typeof id === "number") byId.set(id, s);
            if (title) byTitle.set(title, s);
        }

        const addSheetRequests: sheets_v4.Schema$Request[] = [];
        const entryIndexToRequestIndex = new Map<number, number>();

        // First pass: reuse or create tabs per enabled entry
        stripeDataSyncMap = stripeDataSyncMap.map((entry, idx) => {
            if (!entry.enabled) return entry;

            if (entry.sheetId != null && byId.has(entry.sheetId)) {
                return entry;
            }

            const desiredTitle = titleForEntry(entry);

            const existingByTitle = byTitle.get(desiredTitle);
            if (existingByTitle && existingByTitle.properties?.sheetId != null) {
                return {
                    ...entry,
                    sheetId: existingByTitle.properties.sheetId,
                };
            }

            const reqIndex = addSheetRequests.length;
            entryIndexToRequestIndex.set(idx, reqIndex);

            addSheetRequests.push({
                addSheet: {
                    properties: {
                        title: desiredTitle,
                    },
                },
            });

            return entry;
        });

        const createdCount = addSheetRequests.length;

        if (createdCount > 0) {
            const batchResp = await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: { requests: addSheetRequests },
            });

            const replies = batchResp.data.replies ?? [];

            stripeDataSyncMap = stripeDataSyncMap.map((entry, idx) => {
                const reqIndex = entryIndexToRequestIndex.get(idx);
                if (reqIndex == null) return entry;

                const reply = replies[reqIndex];
                const added = reply?.addSheet?.properties;
                if (!added || typeof added.sheetId !== "number") return entry;

                return {
                    ...entry,
                    sheetId: added.sheetId,
                };
            });
        }

        // Second batch: protect our tabs + ensure "Working Sheet" exists, is named, seeded, and moved to the end
        const postRequests: sheets_v4.Schema$Request[] = [];

        // Protect all enabled entries with a bound sheetId
        for (const entry of stripeDataSyncMap) {
            if (!entry.enabled || entry.sheetId == null) continue;

            postRequests.push({
                addProtectedRange: {
                    protectedRange: {
                        range: {
                            sheetId: entry.sheetId,
                        },
                        warningOnly: true,
                        description: `This tab is managed by ${APP_NAME}. Editing here may break your sync. Use the 'Working Sheet' tab for your own analysis.`,
                    },
                },
            });
        }

        // Ensure a single "Working Sheet" tab exists, reuse/rename "Sheet1" if present
        const existingWorkingSheet = existingSheets.find((s) => s.properties?.title === workingSheetTitle && typeof s.properties?.sheetId === "number");
        const sheet1 = existingSheets.find((s) => s.properties?.title === "Sheet1" && typeof s.properties?.sheetId === "number");

        let workingSheetId: number | null | undefined =
            existingWorkingSheet?.properties?.sheetId ??
            sheet1?.properties?.sheetId;

        // If we’re reusing Sheet1 as the working sheet, rename it
        if (!existingWorkingSheet && sheet1 && sheet1.properties?.sheetId != null) {
            workingSheetId = sheet1.properties.sheetId;
            postRequests.push({
                updateSheetProperties: {
                    properties: {
                        sheetId: workingSheetId,
                        title: workingSheetTitle,
                    },
                    fields: "title",
                },
            });
        }

        // Seed A1 text and move Working Sheet to the end (idempotent enough)
        if (workingSheetId != null) {
            // Seed message in A1 (will overwrite A1 on repeated calls)
            postRequests.push({
                updateCells: {
                    start: {
                        sheetId: workingSheetId,
                        rowIndex: 0,
                        columnIndex: 0,
                    },
                    rows: [
                        {
                            values: [
                                {
                                    userEnteredValue: {
                                        stringValue: workingSheetMessage,
                                    },
                                },
                            ],
                        },
                    ],
                    fields: "userEnteredValue",
                },
            });

            // Move to first position
            postRequests.push({
                updateSheetProperties: {
                    properties: {
                        sheetId: workingSheetId,
                        index: 0,
                    },
                    fields: "index",
                },
            });
        }

        if (postRequests.length > 0) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: { requests: postRequests },
            });
        }

        return stripeDataSyncMap;
    }
    catch (error) {
        console.error("Error ensuring sheet tabs for stripe data sync map:", error);
        throw error;
    }

}
