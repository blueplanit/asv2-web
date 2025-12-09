// app/api/sheet-tab-metrics/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSheetTabMetricsForSpreadsheet } from "@/lib/sheet-tab-metrics";

export const runtime = "nodejs";

type Body = {
    spreadsheetId: string;
} | null;

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }
    const authUserId = (session.user as any).id as string;

    if (!authUserId) {
        return new NextResponse("Auth user ID not found", { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as Body;
    const spreadsheetId = body?.spreadsheetId;

    if (!spreadsheetId || typeof spreadsheetId !== "string" || spreadsheetId.trim().length === 0) {
        return new NextResponse("spreadsheetId is required", { status: 400 });
    }

    try {
        const metrics = await getSheetTabMetricsForSpreadsheet({
            authUserId,
            spreadsheetId: spreadsheetId.trim(),
        });

        return NextResponse.json({ metrics });
    } catch (err) {
        console.error("Error fetching sheet tab metrics:", err);
        return new NextResponse("Failed to fetch sheet tab metrics", { status: 500 });
    }
}
