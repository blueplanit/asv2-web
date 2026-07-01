// app/api/update/sync-config/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
    DataSyncEntryIdEnum,
    type DataSyncEntryId,
} from "@/lib/schemas/sync-config";
import { getSyncConfig, updateSyncConfig } from "@/lib/dynamo/sync-config";
import {
    ensureStripeDataSyncMap,
    applyStripeSelectionToStripeDataSyncMap,
} from "@/lib/stripe/stripe-data-sync-map-helpers";
import { ensureSheetTabsForStripeDataSyncMap } from "@/lib/google/google-stripe-data-sync-map";
import { SyncStatus } from "@/lib/types/sync-status";
import { UserState } from "@/lib/app-state/user-state";
import { apiErrorResponse } from "@/lib/api/api-error-response";
import { assertConnectionsReadyForBackfill } from "@/lib/app-state/connection-guards";

export const runtime = "nodejs";

const ROUTE = "POST /api/update/sync-config";

/**
 * 409 conflicts from this route have two distinct meanings; the client must be
 * able to tell them apart (a benign "already started" redirects to the
 * dashboard, while a connection failure must surface an inline error). Return a
 * machine-readable `code` alongside the human-readable message.
 */
type SyncConfigConflictCode = "backfill_already_started" | "connections_missing";

function conflictResponse(
    code: SyncConfigConflictCode,
    message: string,
    userId: string,
): NextResponse {
    console.warn("[api-error]", { route: ROUTE, status: 409, code, message, userId });
    return NextResponse.json({ code, message }, { status: 409 });
}

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
        return apiErrorResponse(ROUTE, 401, "Unauthorized");
    }
    const userId = (session.user as any).userId as string;

    if (!userId) {
        return apiErrorResponse(ROUTE, 400, "User ID not found", { userId });
    }

    const body = (await req.json().catch(() => null)) as Body;
    const workingSheetTitle = body?.workingSheetTitle;
    const workingSheetMessage = body?.workingSheetMessage;
    const spreadsheetId = body?.spreadsheetId;
    if (!spreadsheetId) {
        return apiErrorResponse(ROUTE, 400, "Spreadsheet ID not found", { userId });
    }
    const userState = body?.userState;
    if (!userState) {
        return apiErrorResponse(ROUTE, 400, "User state not found", { userId });
    }

    const existing = await getSyncConfig(userId, spreadsheetId);
    if (!existing || !existing.spreadsheetId) {
        return apiErrorResponse(ROUTE, 400, "Sync config not found for user or spreadsheet ID not set", { userId });
    }

    // Validate against enum — no arbitrary strings
    let selectedDataSyncEntries: DataSyncEntryId[] | undefined;
    if (body?.selectedDataSyncEntries) {
        try {
            selectedDataSyncEntries = body.selectedDataSyncEntries.map((v) =>
                DataSyncEntryIdEnum.parse(v),
            ) as DataSyncEntryId[];
        } catch {
            return apiErrorResponse(ROUTE, 400, "Invalid stripe object selection", { userId });
        }
        if (selectedDataSyncEntries.length === 0) {
            return apiErrorResponse(ROUTE, 400, "At least one object must be selected", { userId });
        }
    }

    const historyMode = body?.historyMode;
    const historySinceDays =
        body && typeof body.historySinceDays === "number"
            ? body.historySinceDays
            : undefined;
    const syncStatus = body?.syncStatus;

    if (syncStatus === "backfill_running") {
        const guard = await assertConnectionsReadyForBackfill(userId, existing);
        if (!guard.ok) {
            return conflictResponse("connections_missing", guard.message, userId);
        }
    }

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
    try {
        const updated = await updateSyncConfig({
            userId,
            spreadsheetId: existing.spreadsheetId,
            stripeDataSyncMap: stripeDataSyncMapToPersist,
            historyMode,
            historySinceDays,
            syncStatus,
            ...(syncStatus === "backfill_running"
                ? { expectedCurrentStatus: "onboarding" as const }
                : {}),
        });

        return NextResponse.json({ syncConfig: updated });
    } catch (err: unknown) {
        if (
            err &&
            typeof err === "object" &&
            "name" in err &&
            err.name === "ConditionalCheckFailedException"
        ) {
            return conflictResponse("backfill_already_started", "Backfill already started", userId);
        }
        throw err;
    }
}
