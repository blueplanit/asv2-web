// app/api/google/create-sheet/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createWorkspaceSheetAndConfig } from "@/lib/workspace-sheet";

export const runtime = "nodejs";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }
    const userId = (session.user as any).userId as string;

    try {
        const body = await req.json().catch(() => ({}));
        const { folderName, workspaceSheetTitle, workingSheetTitle, workingSheetMessage } = body ?? {};

        const { spreadsheetId, spreadsheetUrl, syncConfig } =
            await createWorkspaceSheetAndConfig({
                userId,
                folderName,
                workspaceSheetTitle,
                workingSheetTitle,
                workingSheetMessage,
                baseSyncConfig: null, // first-time onboarding
            });

        return NextResponse.json({
            spreadsheetId,
            spreadsheetUrl,
            syncConfig,
        });
    } catch (err) {
        console.error("Error creating Google Sheet:", err);
        return new NextResponse(`Failed to create sheet: ${err instanceof Error ? err.message : "Unknown error"}`, { status: 502 });
    }
}
