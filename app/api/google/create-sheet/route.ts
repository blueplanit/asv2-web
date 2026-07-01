// app/api/google/create-sheet/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createWorkspaceSheetAndConfig } from "@/lib/google/workspace-sheet";
import { apiErrorResponse } from "@/lib/api/api-error-response";

export const runtime = "nodejs";

const ROUTE = "POST /api/google/create-sheet";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).userId) {
        return apiErrorResponse(ROUTE, 401, "Unauthorized");
    }
    const userId = (session.user as any).userId as string;

    try {
        const body = await req.json().catch(() => ({}));
        const { folderName, workspaceSheetTitle, workingSheetTitle, workingSheetMessage, userState, timezone, locale } = body ?? {};

        const { spreadsheetId, spreadsheetUrl, syncConfig } =
            await createWorkspaceSheetAndConfig({
                userState,
                folderName,
                timezone,
                locale,
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
        return apiErrorResponse(
            ROUTE, 502,
            `Failed to create sheet: ${err instanceof Error ? err.message : "Unknown error"}`,
            { userId, error: err },
        );
    }
}
