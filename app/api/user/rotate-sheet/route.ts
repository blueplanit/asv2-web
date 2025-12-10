// app/api/user/rotate-sheet/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserSyncConfig, updateSyncConfig } from "@/lib/sync-config";
import { createWorkspaceSheetAndConfig } from "@/lib/workspace-sheet";

export const runtime = "nodejs";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }
    const authUserId = (session.user as any).id as string;

    try {
        const body = await req.json().catch(() => ({}));
        const {
            existingSpreadsheetId,
            workspaceSheetTitle,
            workingSheetTitle,
            workingSheetMessage,
            folderName,
        } = body ?? {};
        const existing = await getUserSyncConfig(authUserId, existingSpreadsheetId);
        if (!existing) {
            return new NextResponse("No active sync config to rotate", { status: 400 });
        }

        // 1) Create new sheet + tabs + new config based on existing settings
        const newWorkspaceSheetTitle = `${workspaceSheetTitle} (New)`
        const { spreadsheetId, spreadsheetUrl, syncConfig: newConfig } =
            await createWorkspaceSheetAndConfig({
                authUserId,
                folderName,
                workspaceSheetTitle: newWorkspaceSheetTitle,
                workingSheetTitle,
                workingSheetMessage,
                baseSyncConfig: existing,
            });

        // 2) Mark old config as paused (or archived)
        await updateSyncConfig({
            authUserId,
            spreadsheetId: existingSpreadsheetId,
            syncStatus: "retired",
        });

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
