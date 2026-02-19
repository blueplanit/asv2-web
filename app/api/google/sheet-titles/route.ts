// app/api/google/sheet-titles/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { google } from "googleapis";
import { getGoogleAccessTokenForUser } from "@/lib/google/google-auth";
import { getGoogleClientConfigForShard, GOOGLE_DEFAULT_PROJECT_SHARD } from "@/lib/google/google-oauth-sharding";
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
        const { accessToken } = await getGoogleAccessTokenForUser(userState);

        const googleProjectShard = userState.googleConnections.find(connection => connection.googleUserId === googleUserId)?.googleProjectShard ?? GOOGLE_DEFAULT_PROJECT_SHARD;
        const { clientId, clientSecret } = getGoogleClientConfigForShard(googleProjectShard);

        const oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
        );

        oauth2Client.setCredentials({ access_token: accessToken });

        const sheets = google.sheets({ version: "v4", auth: oauth2Client });

        const titles: Record<string, string> = {};

        // MVP: sequential; fine for a single workspace
        for (const id of spreadsheetIds) {
            try {
                const resp = await sheets.spreadsheets.get({
                    spreadsheetId: id,
                    fields: "properties.title",
                });
                const title = resp.data.properties?.title;
                titles[id] =
                    title && title.trim().length > 0 ? title : id; // fallback to id
            } catch (err) {
                console.error("Error fetching sheet title", id, err);
                titles[id] = id; // hard fallback on per-sheet error
            }
        }

        return NextResponse.json({ titles });
    } catch (err) {
        console.error("Error in /api/sheets/titles:", err);
        // Global error → caller will just keep showing IDs
        return NextResponse.json({ titles: {} }, { status: 502 });
    }
}
