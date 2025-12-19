// app/api/update/sync-config/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
    DataSyncEntryIdEnum,
    type DataSyncEntryId,
} from "@/lib/schemas/sync-config";
import { getSyncConfig, updateSyncConfig } from "@/lib/sync-config";
import {
    ensureStripeDataSyncMap,
    applyStripeSelectionToStripeDataSyncMap,
} from "@/lib/stripe-data-sync-map-helpers";
import { ensureSheetTabsForStripeDataSyncMap } from "@/lib/google-stripe-data-sync-map";
import { SyncStatus } from "@/lib/types/sync-status";
import { UserState } from "@/lib/user-state";

export const runtime = "nodejs";

type Body = {
    selectedDataSyncEntries?: string[];
    historyMode?: "full" | "since";
    historySinceDays?: number;
    syncStatus?: SyncStatus;
    workingSheetTitle?: string;
    workingSheetMessage?: string;
    spreadsheetId?: string;
    userState: UserState;
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
    const workingSheetTitle = body?.workingSheetTitle;
    const workingSheetMessage = body?.workingSheetMessage;
    const spreadsheetId = body?.spreadsheetId;
    if (!spreadsheetId) {
        return new NextResponse("Spreadsheet ID not found", { status: 400 });
    }
    const userState = body?.userState;
    if (!userState) {
        return new NextResponse("User state not found", { status: 400 });
    }


    const existing = await getSyncConfig(userId, spreadsheetId);
    if (!existing || !existing.spreadsheetId) {
        return new NextResponse("Sync config not found for user or spreadsheet ID not set", { status: 400 });
    }

    // Validate against enum — no arbitrary strings
    let selectedDataSyncEntries: DataSyncEntryId[] | undefined;
    if (body?.selectedDataSyncEntries) {
        try {
            selectedDataSyncEntries = body.selectedDataSyncEntries.map((v) =>
                DataSyncEntryIdEnum.parse(v),
            ) as DataSyncEntryId[];
        } catch {
            return new NextResponse("Invalid stripe object selection", { status: 400 });
        }
        if (selectedDataSyncEntries.length === 0) {
            return new NextResponse("At least one object must be selected", { status: 400 });
        }
    }

    const historyMode = body?.historyMode;
    const historySinceDays =
        body && typeof body.historySinceDays === "number"
            ? body.historySinceDays
            : undefined;
    const syncStatus = body?.syncStatus;

    // Only compute & touch Sheets if we’re actually changing the selection or working-sheet config.
    let stripeDataSyncMapToPersist = undefined as typeof existing.stripeDataSyncMap | undefined;

    const hasStripeSelectionChange = !!selectedDataSyncEntries;
    const hasWorkingSheetConfigChange = typeof workingSheetTitle === "string" || typeof workingSheetMessage === "string";

    if (hasStripeSelectionChange || hasWorkingSheetConfigChange) {
        let stripeDataSyncMap = ensureStripeDataSyncMap(existing);

        if (selectedDataSyncEntries) {
            stripeDataSyncMap = applyStripeSelectionToStripeDataSyncMap(
                stripeDataSyncMap,
                selectedDataSyncEntries,
            );
        }

        // Build Google Sheet tabs based on which stripe to-sync data is enabled from UI
        stripeDataSyncMap = await ensureSheetTabsForStripeDataSyncMap({
            userState,
            spreadsheetId: existing.spreadsheetId,
            stripeDataSyncMap,
            workingSheetTitle,
            workingSheetMessage,
        });
        stripeDataSyncMapToPersist = stripeDataSyncMap;
    }

    // actually persist the config in db
    const updated = await updateSyncConfig({
        userId,
        spreadsheetId: existing.spreadsheetId,
        stripeDataSyncMap: stripeDataSyncMapToPersist,
        historyMode,
        historySinceDays,
        syncStatus,
    });

    return NextResponse.json({ syncConfig: updated });
}
