import { NextResponse } from "next/server";
import { getServerSession, type Session } from "next-auth";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { IS_DEV } from "@/lib/constants";
import { appendSurveyResponseRow } from "@/lib/google/survey-responses-sheet";

export const runtime = "nodejs";

const SURVEY_MAX_TEXT_LENGTH = 280;

const rateLimiter = new RateLimiterMemory({
    points: 5,
    duration: 3600,
});

function safeOrigin(req: Request) {
    const origin = req.headers.get("origin");
    if (!origin) return true;
    return (
        origin === "https://syncstaq.com" ||
        origin === "https://www.syncstaq.com" ||
        origin === "http://localhost:3000"
    );
}

function sanitizeText(value: unknown, maxLength: number): string {
    return String(value ?? "")
        .trim()
        .slice(0, maxLength);
}

export async function POST(req: Request) {
    try {
        if (!safeOrigin(req)) {
            return new NextResponse("Forbidden", { status: 403 });
        }


        const session = (await getServerSession(authOptions)) as Session;
        if (!session?.user?.email || !(session.user as { userId?: string }).userId) {
            return new NextResponse(
                "Unable to process request, please sign in again.",
                { status: 401 },
            );
        }

        const userId = (session.user as { userId: string }).userId;
        const email = session.user.email;

        try {
            await rateLimiter.consume(userId);
        } catch {
            return new NextResponse("Too many requests. Please try again later.", {
                status: 429,
            });
        }

        const body = await req.json().catch(() => ({}));
        const role = sanitizeText(body.role, SURVEY_MAX_TEXT_LENGTH);
        const problem = sanitizeText(body.problem, SURVEY_MAX_TEXT_LENGTH);
        const roleOther = sanitizeText(body.roleOther, SURVEY_MAX_TEXT_LENGTH);
        const problemOther = sanitizeText(body.problemOther, SURVEY_MAX_TEXT_LENGTH);

        if (!role || !problem) {
            return new NextResponse("role and problem are required", { status: 400 });
        }

        // if (IS_DEV) {
        //     return NextResponse.json({ ok: true, skipped: true });
        // }

        await appendSurveyResponseRow({
            userId,
            email,
            role: role ?? roleOther,
            problem: problem ?? problemOther,
        });

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("[onboarding/survey]", e);
        return new NextResponse("Something went wrong. Please try again.", {
            status: 500,
        });
    }
}
