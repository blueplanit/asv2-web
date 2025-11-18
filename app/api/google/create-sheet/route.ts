// app/api/google/create-sheet/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ddb } from "@/lib/dynamo";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { GoogleConnectionSchema } from "@/lib/schemas/google-connection";
import { google } from "googleapis";
import { decrypt, getGoogleAccessTokenForUser, StoredAccessPayload, StoredRefreshPayload } from "@/lib/google-auth";

export const runtime = "nodejs";

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME!;

export async function POST() {
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
            // redirectUri not needed for plain API calls
        );

        oauth2Client.setCredentials({
            access_token: accessToken,
        });

        const drive = google.drive({ version: "v3", auth: oauth2Client });

        // Ensure "Sync" folder exists and get its ID
        const syncFolderName = "Sync";
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

        const title = "Stripe Sync – Workspace"; // or whatever you use
        const sheetsResp = await sheets.spreadsheets.create({
            requestBody: {
                properties: { title },
                sheets: [
                    { properties: { title: "Invoices_raw" } },
                    { properties: { title: "Charges_raw" } },
                    { properties: { title: "Customers_raw" } },
                    { properties: { title: "Payouts_raw" } },
                    { properties: { title: "Working" } },
                    { properties: { title: "README" } },
                ],
            },
        });

        const spreadsheetId = sheetsResp.data.spreadsheetId;
        const spreadsheetUrl = sheetsResp.data.spreadsheetUrl;

        // move the new spreadsheet into the "Sync" folder
        if (syncFolderId && spreadsheetId) {
            await drive.files.update({
                fileId: spreadsheetId,
                addParents: syncFolderId,
                fields: "id, parents",
            });
        }

        // existing return
        return NextResponse.json({
            spreadsheetId,
            spreadsheetUrl,
        });
    } catch (err) {
        console.error("Error creating Google Sheet:", err);
        return new NextResponse("Failed to create sheet", { status: 502 });
    }
}
