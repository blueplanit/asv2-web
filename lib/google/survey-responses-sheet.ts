// lib/google/survey-responses-sheet.ts
import "server-only";
import { google } from "googleapis";
import { getSsmParameter } from "@/lib/aws/ssm";

type GoogleServiceAccountKey = {
    client_email: string;
    private_key: string;
};

function mustEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing env: ${name}`);
    }
    return value;
}

async function getSurveySheetsClient() {
    const serviceAccountParamName = mustEnv("SURVEY_SERVICE_ACCOUNT_PARAM_NAME");
    const sheetIdParamName = mustEnv("SURVEY_RESPONSES_SHEET_ID_PARAM_NAME");

    const [serviceAccountRaw, spreadsheetId] = await Promise.all([
        getSsmParameter(serviceAccountParamName, { decrypt: true }),
        getSsmParameter(sheetIdParamName),
    ]);

    let parsed: GoogleServiceAccountKey;
    try {
        parsed = JSON.parse(serviceAccountRaw) as GoogleServiceAccountKey;
    } catch {
        throw new Error("Invalid service-account JSON in SSM");
    }

    if (!parsed.client_email || !parsed.private_key) {
        throw new Error("Service-account JSON missing client_email or private_key");
    }

    const auth = new google.auth.JWT({
        email: parsed.client_email,
        key: parsed.private_key,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    return { sheets, spreadsheetId: spreadsheetId.trim() };
}

export type SurveyResponseRow = {
    userId: string;
    email: string;
    role: string;
    problem: string;
    roleOther?: string;
    problemOther?: string;
};

export async function appendSurveyResponseRow(row: SurveyResponseRow): Promise<void> {
    const { sheets, spreadsheetId } = await getSurveySheetsClient();
    const timestamp = new Date().toISOString();

    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "A:G",
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
            values: [
                [
                    timestamp,
                    row.userId,
                    row.email,
                    row.role,
                    row.problem,
                    row.roleOther ?? "",
                    row.problemOther ?? "",
                ],
            ],
        },
    });
}
