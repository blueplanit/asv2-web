// app/api/update/sync-config/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
    DEFAULT_ENABLED_STRIPE_OBJECTS,
    StripeObjectEnum,
    type StripeObject,
} from "@/lib/schemas/sync-config";
import { getUserSyncConfig, updateSyncConfig } from "@/lib/sync-config";

export const runtime = "nodejs";

type Body = {
    enabledStripeObjects?: string[];
    historyMode?: "full" | "since";
    historySinceDays?: number;
    syncStatus?: "onboarding" | "backfill_running" | "paused" | "error" | "syncing";
} | null;

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }
    const authUserId = (session.user as any).id as string;

    if (!authUserId) {
        return new NextResponse("Auth user ID not found", { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as Body;

    const existing = await getUserSyncConfig(authUserId);
    if (!existing || !existing.spreadsheetId) {
        return new NextResponse("Sync config not found for user or spreadsheet ID not set", { status: 400 });
    }

    // Validate against enum — no arbitrary strings
    let enabledStripeObjects: StripeObject[] | undefined;
    if (body?.enabledStripeObjects) {
        try {
            enabledStripeObjects = body.enabledStripeObjects.map((v) =>
                StripeObjectEnum.parse(v),
            ) as StripeObject[];
        } catch {
            return new NextResponse("Invalid stripe object selection", { status: 400 });
        }
        if (enabledStripeObjects.length === 0) {
            return new NextResponse("At least one object must be selected", { status: 400 });
        }
    }

    const historyMode = body?.historyMode;
    const historySinceDays =
        body && typeof body.historySinceDays === "number"
            ? body.historySinceDays
            : undefined;
    const syncStatus = body?.syncStatus;

    const updated = await updateSyncConfig({
        authUserId,
        spreadsheetId: existing.spreadsheetId,
        enabledStripeObjects,
        historyMode,
        historySinceDays,
        syncStatus,
    });

    return NextResponse.json({ syncConfig: updated });
}
