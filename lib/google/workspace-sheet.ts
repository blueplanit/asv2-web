// lib/google/workspace-sheet.ts
import { google } from "googleapis";
import { getGoogleAccessTokenForUser } from "@/lib/google/google-auth";
import { ensureSheetTabsForStripeDataSyncMap } from "@/lib/google/google-stripe-data-sync-map";
import {
    ensureStripeDataSyncMap,
} from "@/lib/stripe/stripe-data-sync-map-helpers";
import {
    type SyncConfig,
} from "@/lib/schemas/sync-config";
import { getStripeAccountIdForUser } from "@/lib/stripe/stripe-connection";
import { createSyncConfig, ensureSyncConfigForSheet, defaultHistoryDays } from "@/lib/dynamo/sync-config";
import { getGoogleClientConfigForShard, GOOGLE_DEFAULT_PROJECT_SHARD } from "./google-oauth-sharding";
import { UserState } from "../app-state/user-state";

type CreateWorkspaceSheetParams = {
    userState: UserState;
    folderName?: string;
    workspaceSheetTitle?: string;
    workingSheetTitle?: string;
    workingSheetMessage?: string;
    timezone?: string | null;
    locale?: string | null;
    // optional: base config to copy from (for rotation)
    baseSyncConfig?: SyncConfig | null;
};

export async function createWorkspaceSheetAndConfig(
    params: CreateWorkspaceSheetParams,
) {
    const {
        userState,
        folderName,
        workspaceSheetTitle,
        workingSheetTitle,
        workingSheetMessage,
        timezone,
        locale,
        baseSyncConfig,
    } = params;

    const userId = userState.profile?.userId;

    if (!userId) {
        throw new Error("User ID not found");
    }

    // Resolve the Stripe account BEFORE creating any Drive/Sheets resources so a
    // user without a Stripe account never leaves an orphaned empty spreadsheet
    // behind. Onboarding requires Stripe first; this is defense in depth.
    const stripeAccountId =
        baseSyncConfig?.stripeAccountId ?? (await getStripeAccountIdForUser(userId));
    if (!stripeAccountId) {
        throw new Error("Stripe account ID not found for user");
    }

    // 1) Google auth
    const { accessToken } = await getGoogleAccessTokenForUser(userState);
    const googleUserId = userState.profile?.googleUserId;

    if (!googleUserId) {
        throw new Error("Google User ID not found");
    }

    const googleProjectShard = userState.googleConnections.find(connection => connection.googleUserId === googleUserId)?.googleProjectShard ?? GOOGLE_DEFAULT_PROJECT_SHARD;

    const { clientId, clientSecret } = getGoogleClientConfigForShard(googleProjectShard);

    if (!clientId || !clientSecret) {
        throw new Error("Google Client ID or Secret not found");
    }

    const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
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
    let spreadsheetTimezone = sheetsResp.data.properties?.timeZone;
    let spreadsheetLocale = sheetsResp.data.properties?.locale;

    if (!spreadsheetId) {
        throw new Error("No spreadsheetId returned from Sheets API");
    }

    if (!spreadsheetTimezone || !spreadsheetLocale) {
        const tzRes = await sheets.spreadsheets.get({
            spreadsheetId,
            fields: "properties.timeZone,properties.locale",
        });
        spreadsheetTimezone = tzRes.data.properties?.timeZone;
        spreadsheetLocale = tzRes.data.properties?.locale;
    }

    const resolvedTimezone =
        timezone?.trim() ||
        spreadsheetTimezone 
    const resolvedLocale = locale?.trim() || spreadsheetLocale;

    // Move into folder
    if (syncFolderId) {
        await drive.files.update({
            fileId: spreadsheetId,
            addParents: syncFolderId,
            fields: "id, parents",
        });
    }

    let syncConfig: SyncConfig | undefined;

    if (!baseSyncConfig) { // first-time onboarding and new sheet
        syncConfig = await ensureSyncConfigForSheet({
            userId,
            spreadsheetId,
            stripeAccountId,
            timezone: resolvedTimezone,
            locale: resolvedLocale,
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
        userState,
        spreadsheetId,
        stripeDataSyncMap,
        workingSheetTitle,
        workingSheetMessage,
    });

    // 7) Create SyncConfig for this sheet
    syncConfig = await createSyncConfig({
        userId,
        spreadsheetId,
        stripeAccountId,
        stripeDataSyncMap: boundStripeDataSyncMap,
        historyMode: baseSyncConfig?.historyMode ?? "since",
        historySinceDays: baseSyncConfig?.historySinceDays ?? defaultHistoryDays,
        syncStatus: "syncing",
        timezone: resolvedTimezone,
        locale: resolvedLocale,
    });

    return {
        spreadsheetId,
        spreadsheetUrl,
        syncConfig,
    };
}
