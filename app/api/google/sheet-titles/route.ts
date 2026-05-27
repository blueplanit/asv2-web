// app/api/google/sheet-titles/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { google } from "googleapis";
import { GoogleAuthRevokedError } from "@/lib/google/google-auth";
import { callGoogleApi } from "@/lib/google/google-api-call";
import { UserState } from "@/lib/app-state/user-state";

export const runtime = "nodejs";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }
    const userId = (session.user as any).userId as string;

    const body = (await req.json().catch(() => null)) as
        | { spreadsheetIds?: string[]; userState?: UserState }
        | null;

    const spreadsheetIds = Array.from(
        new Set(body?.spreadsheetIds ?? []),
    ).filter((id) => typeof id === "string" && id.trim().length > 0);

    if (spreadsheetIds.length === 0) {
        return NextResponse.json({ titles: {} });
    }

    const userState = body?.userState;
    if (!userState) {
        return new NextResponse("User state not found", { status: 400 });
    }

    const googleUserId = userState.profile?.googleUserId;
    if (!googleUserId) {
        return new NextResponse("Google user ID not found", { status: 400 });
    }

    try {
        const titles = await callGoogleApi(userState, async (oauth2Client) => {
            const sheets = google.sheets({ version: "v4", auth: oauth2Client });
            const result: Record<string, string> = {};

            // MVP: sequential; fine for a single workspace
            for (const id of spreadsheetIds) {
                try {
                    const resp = await sheets.spreadsheets.get({
                        spreadsheetId: id,
                        fields: "properties.title",
                    });
                    const title = resp.data.properties?.title;
                    result[id] = title?.trim() || id;
                } catch (err) {
                    // Re-throw 401s so callGoogleApi can handle retry/revocation detection.
                    // Other per-sheet errors (deleted sheet, no access) fall back to the ID.
                    if ((err as any)?.response?.status === 401) throw err;
                    console.error("Error fetching sheet title", id, err);
                    result[id] = id;
                }
            }

            return result;
        });

        return NextResponse.json({ titles });
    } catch (err) {
        if (err instanceof GoogleAuthRevokedError) {
            return NextResponse.json({ code: "google_auth_revoked" }, { status: 403 });
        }
        console.error("Error in /api/google/sheet-titles:", err);
        return NextResponse.json({ titles: {} }, { status: 502 });
    }
}
