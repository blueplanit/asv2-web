// app/api/google/create-sheet/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { google } from "googleapis";
import { getGoogleAccessTokenForUser } from "@/lib/google-auth";
import { ensureSyncConfigForSheet } from "@/lib/sync-config";
import { getStripeAccountIdForUser } from "@/lib/stripe-connection";

export const runtime = "nodejs";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }
    const authUserId = (session.user as any).id as string;

    try {
        // 1) Get Google access token for this user
        const { accessToken } = await getGoogleAccessTokenForUser(
            authUserId,
        );

        // 2) Build OAuth2 client using googleapis
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID!,
            process.env.GOOGLE_CLIENT_SECRET!,
        );

        oauth2Client.setCredentials({
            access_token: accessToken,
        });

        const drive = google.drive({ version: "v3", auth: oauth2Client });

        const { folderName, workspaceSheetTitle } = await req.json();

        // Ensure "Sync" folder exists and get its ID
        const syncFolderName = folderName || 'Sync';
        let syncFolderId: string | undefined;

        const listRes = await drive.files.list({
            q: `name='${syncFolderName}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`,
            fields: "files(id, name)",
            spaces: "drive",
            pageSize: 1,
        });

        if (listRes.data.files && listRes.data.files.length > 0) {
            syncFolderId = listRes.data.files[0].id || undefined;
        } else {
            const createFolderRes = await drive.files.create({
                requestBody: {
                    name: syncFolderName,
                    mimeType: "application/vnd.google-apps.folder",
                },
                fields: "id",
            });
            syncFolderId = createFolderRes.data.id || undefined;
        }

        // console.log(syncFolderId)

        // existing code that creates the spreadsheet
        const sheets = google.sheets({ version: "v4", auth: oauth2Client });

        const title = workspaceSheetTitle || 'My Stripe Sync – Workspace';
        const sheetsResp = await sheets.spreadsheets.create({
            requestBody: {
                properties: { title },
            },
        });

        const spreadsheetId = sheetsResp.data.spreadsheetId;
        const spreadsheetUrl = sheetsResp.data.spreadsheetUrl;

        if (!spreadsheetId) {
            return new NextResponse("Failed to create sheet: No spreadsheetId returned.", { status: 502 });
        }

        // move the new spreadsheet into the "Sync" folder
        if (syncFolderId && spreadsheetId) {
            await drive.files.update({
                fileId: spreadsheetId,
                addParents: syncFolderId,
                fields: "id, parents",
            });
        }

        const stripeAccountId = await getStripeAccountIdForUser(authUserId);

        if (!stripeAccountId) {
            return new NextResponse("Failed to get Stripe account ID", { status: 502 });
        }

        const dbResp = await ensureSyncConfigForSheet({
            authUserId,
            spreadsheetId,
            stripeAccountId,
        });      

        // existing return
        return NextResponse.json({
            spreadsheetId,
            spreadsheetUrl,
            dbResp,
        });
    } catch (err) {
        console.error("Error creating Google Sheet:", err);
        return new NextResponse(`Failed to create sheet: ${err instanceof Error ? err.message : "Unknown error"}`, { status: 502 });
    }
}
