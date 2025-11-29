// lib/google-stripe-data-sync-map.ts

import type {
    StripeDataSyncEntry,
} from "./schemas/sync-config";
import { getGoogleAccessTokenForUser } from "./google-auth";
import { google, sheets_v4 } from "googleapis";


function titleForEntry(entry: StripeDataSyncEntry): string {
    const base = entry.displayName ?? entry.id;
    return `${base}_raw (DO NOT EDIT)`;
}

export async function ensureSheetTabsForStripeDataSyncMap(params: {
    authUserId: string;
    spreadsheetId: string;
    stripeDataSyncMap: StripeDataSyncEntry[];
}): Promise<StripeDataSyncEntry[]> {
    const { authUserId, spreadsheetId } = params;

    try {
        let { stripeDataSyncMap } = params;

        if (stripeDataSyncMap.length === 0) return stripeDataSyncMap;

        // 1) Get Google access token for this user
        const { accessToken } = await getGoogleAccessTokenForUser(
            authUserId,
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

        // Second batch: protect our tabs + delete default "Sheet1" if safe
        const protectAndDeleteRequests: sheets_v4.Schema$Request[] = [];

        // Protect all enabled entries with a bound sheetId
        for (const entry of stripeDataSyncMap) {
            if (!entry.enabled || entry.sheetId == null) continue;

            protectAndDeleteRequests.push({
                addProtectedRange: {
                    protectedRange: {
                        range: {
                            sheetId: entry.sheetId,
                        },
                        warningOnly: false,
                        // Editors left empty → only sheet owner / explicitly added editors
                        editors: {},
                    },
                },
            });
        }

        // Delete default "Sheet1" if it exists and there is more than one sheet
        const sheet1 = existingSheets.find(
            (s) => s.properties?.title === "Sheet1" && typeof s.properties?.sheetId === "number",
        );
        const totalSheetsAfterCreate = existingSheets.length + createdCount;

        if (sheet1 && totalSheetsAfterCreate > 1) {
            protectAndDeleteRequests.push({
                deleteSheet: {
                    sheetId: sheet1.properties!.sheetId!,
                },
            });
        }

        if (protectAndDeleteRequests.length > 0) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: { requests: protectAndDeleteRequests },
            });
        }

        return stripeDataSyncMap;
    }
    catch (error) {
        console.error("Error ensuring sheet tabs for stripe data sync map:", error);
        throw error;
    }

}
