// app/api/google/create-sheet/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createWorkspaceSheetAndConfig } from "@/lib/google/workspace-sheet";
import { loadUserState } from "@/lib/app-state/user-state";
import { hasCompletedOnboarding } from "@/lib/app-state/onboarding-status";
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

        // Enforce one workspace. Consistent read so we don't miss a just-written
        // config. Three cases:
        const freshState = await loadUserState(userId, { consistentRead: true });

        // 1) An onboarding sheet already exists → return it (resume, no dup).
        const existingOnboardingSheet = freshState.syncConfigs.find(
            (cfg) => cfg.syncStatus === "onboarding" && cfg.spreadsheetId,
        );
        if (existingOnboardingSheet) {
            return NextResponse.json({
                spreadsheetId: existingOnboardingSheet.spreadsheetId,
                spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${existingOnboardingSheet.spreadsheetId}`,
                syncConfig: existingOnboardingSheet,
            });
        }

        // 2) Already onboarded → refuse; client sends them to the dashboard.
        if (hasCompletedOnboarding(freshState.syncConfigs)) {
            return NextResponse.json({ code: "onboarding_complete" }, { status: 409 });
        }

        // 3) No non-retired config → create the first workspace.
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
