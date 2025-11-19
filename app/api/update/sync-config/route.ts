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

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }
    const authUserId = (session.user as any).id as string;

    const body = (await req.json().catch(() => null)) as | { enabledStripeObjects?: string[] } | null;

    const raw = body?.enabledStripeObjects ?? DEFAULT_ENABLED_STRIPE_OBJECTS;

    // Validate against enum — no arbitrary strings
    let enabledStripeObjects: StripeObject[];
    try {
        enabledStripeObjects = raw.map((v) => StripeObjectEnum.parse(v)) as StripeObject[];
    } catch {
        return new NextResponse("Invalid stripe object selection", { status: 400 });
    }

    if (enabledStripeObjects.length === 0) {
        return new NextResponse("At least one object must be selected", { status: 400 });
    }

    const existing = await getUserSyncConfig(authUserId);
    if (!existing) {
        return new NextResponse("Sync config not found for user", { status: 400 });
    }

    const updated = await updateSyncConfig({
        authUserId,
        spreadsheetId: existing.spreadsheetId,
        enabledStripeObjects,
        historyMode: null,
        historySinceDays: null,
        syncStatus: "syncing"
    });

    return NextResponse.json({ syncConfig: updated });
}
