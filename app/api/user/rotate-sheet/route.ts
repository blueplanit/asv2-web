// app/api/user/rotate-sheet/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSyncConfig } from "@/lib/dynamo/sync-config";
import { createWorkspaceSheetAndConfig } from "@/lib/google/workspace-sheet";
import { triggerInitialBackfill } from "@/lib/sync/trigger-backfill";

export const runtime = "nodejs";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }
    const userId = (session.user as any).userId as string;

    try {
        const body = await req.json().catch(() => ({}));
        const {
            userState,
            existingSpreadsheetId,
            workspaceSheetTitle,
            workingSheetTitle,
            workingSheetMessage,
            folderName,
            timezone,
            locale,
        } = body ?? {};
        const existing = await getSyncConfig(userId, existingSpreadsheetId);
        if (!existing) {
            return new NextResponse("No active sync config to rotate", { status: 400 });
        }

        // Create the new sheet + config and retire the old config atomically
        // (the retire runs inside createWorkspaceSheetAndConfig's rotation path).
        const newWorkspaceSheetTitle = `${workspaceSheetTitle} (New)`
        const { spreadsheetId, spreadsheetUrl, syncConfig: newConfig } =
            await createWorkspaceSheetAndConfig({
                userState,
                folderName,
                timezone,
                locale,
                workspaceSheetTitle: newWorkspaceSheetTitle,
                workingSheetTitle,
                workingSheetMessage,
                baseSyncConfig: existing,
            });

        // Seed the new sheet: fill history and create its sync cursors; the
        // backfill then flips the config from backfill_running to syncing.
        await triggerInitialBackfill(userId, spreadsheetId);

        return NextResponse.json({
            newSpreadsheetId: spreadsheetId,
            newSpreadsheetUrl: spreadsheetUrl,
            newSyncConfig: newConfig,
        });
    } catch (err) {
        console.error("Rotate sheet failed:", err);
        const message =
            err instanceof Error ? err.message : "Unknown error rotating sheet";
        return new NextResponse(`Failed to rotate sheet: ${message}`, { status: 502 });
    }
}
