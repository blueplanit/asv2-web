// lib/workspace-sheet.ts
import { google } from "googleapis";
import { getGoogleAccessTokenForUser } from "@/lib/google-auth";
import { ensureSheetTabsForStripeDataSyncMap } from "@/lib/google-stripe-data-sync-map";
import {
    ensureStripeDataSyncMap,
} from "@/lib/stripe-data-sync-map-helpers";
import {
    type SyncConfig,
} from "@/lib/schemas/sync-config";
import { getStripeAccountIdForUser } from "@/lib/stripe-connection";
import { createSyncConfig, ensureSyncConfigForSheet } from "@/lib/sync-config";

type CreateWorkspaceSheetParams = {
    authUserId: string;
    folderName?: string;
    workspaceSheetTitle?: string;
    workingSheetTitle?: string;
    workingSheetMessage?: string;
    // optional: base config to copy from (for rotation)
    baseSyncConfig?: SyncConfig | null;
};

export async function createWorkspaceSheetAndConfig(
    params: CreateWorkspaceSheetParams,
) {
    const {
        authUserId,
        folderName,
        workspaceSheetTitle,
        workingSheetTitle,
        workingSheetMessage,
        baseSyncConfig,
    } = params;

    // 1) Google auth
    const { accessToken } = await getGoogleAccessTokenForUser(authUserId);
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID!,
        process.env.GOOGLE_CLIENT_SECRET!,
    );
    oauth2Client.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const sheets = google.sheets({ version: "v4", auth: oauth2Client });

    // 2) Ensure "Sync" folder exists and get its ID
    const syncFolderName = folderName || "Sync";
    let syncFolderId: string | undefined;

    const listRes = await drive.files.list({
        q: `name='${syncFolderName}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`,
        fields: "files(id, name)",
        spaces: "drive",
        pageSize: 1,
    });

    if (listRes.data.files && listRes.data.files.length > 0) {
        syncFolderId = listRes.data.files[0].id || undefined;
    } else {
        const createFolderRes = await drive.files.create({
            requestBody: {
                name: syncFolderName,
                mimeType: "application/vnd.google-apps.folder",
            },
            fields: "id",
        });
        syncFolderId = createFolderRes.data.id || undefined;
    }

    // 3) Create spreadsheet
    const title = workspaceSheetTitle || "My Stripe Sync – Workspace";
    const sheetsResp = await sheets.spreadsheets.create({
        requestBody: {
            properties: { title },
        },
    });

    const spreadsheetId = sheetsResp.data.spreadsheetId;
    const spreadsheetUrl = sheetsResp.data.spreadsheetUrl;

    if (!spreadsheetId) {
        throw new Error("No spreadsheetId returned from Sheets API");
    }

    // Move into folder
    if (syncFolderId) {
        await drive.files.update({
            fileId: spreadsheetId,
            addParents: syncFolderId,
            fields: "id, parents",
        });
    }

    // 4) Derive Stripe account for config
    const stripeAccountId = baseSyncConfig?.stripeAccountId ?? (await getStripeAccountIdForUser(authUserId));

    if (!stripeAccountId) {
        throw new Error("Stripe account ID not found for user");
    }

    let syncConfig: SyncConfig | undefined;

    if (!baseSyncConfig) { // first-time onboarding and new sheet
        syncConfig = await ensureSyncConfigForSheet({
            authUserId,
            spreadsheetId,
            stripeAccountId,
        });

        return {
            spreadsheetId,
            spreadsheetUrl,
            syncConfig,
        };
    }

    // Sheet rotation path only (there was an existing sync config and need to rotate to a new spreadsheet)
    // 5) Build stripeDataSyncMap to bind tabs
    // For rotation: start from the existing config’s map.
    let stripeDataSyncMap = ensureStripeDataSyncMap(baseSyncConfig);

    // For rotation we want fresh sheet IDs, so clear them
    stripeDataSyncMap = stripeDataSyncMap.map((entry) => ({
        ...entry,
        sheetId: null,
    }));

    // 6) Ensure tabs exist and are protected, plus Working Sheet
    const boundStripeDataSyncMap = await ensureSheetTabsForStripeDataSyncMap({
        authUserId,
        spreadsheetId,
        stripeDataSyncMap,
        workingSheetTitle,
        workingSheetMessage,
    });

    // 7) Create SyncConfig for this sheet
    syncConfig = await createSyncConfig({
        authUserId,
        spreadsheetId,
        stripeAccountId,
        stripeDataSyncMap: boundStripeDataSyncMap,
        historyMode: baseSyncConfig?.historyMode ?? "since",
        historySinceDays: baseSyncConfig?.historySinceDays ?? 90,
        syncStatus: "syncing",
    });

    return {
        spreadsheetId,
        spreadsheetUrl,
        syncConfig,
    };
}
