import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { IS_DEV } from "@/lib/constants";
import {
    COLUMN_REQUEST_MAX_SCREENSHOTS,
    COLUMN_REQUEST_MAX_PER_FILE_BYTES,
    COLUMN_REQUEST_MAX_TOTAL_BYTES,
    COLUMN_REQUEST_MAX_TEXT_LENGTH,
    COLUMN_REQUEST_ALLOWED_MIME,
} from "@/lib/column-request";
import { RateLimiterMemory } from "rate-limiter-flexible";

export const runtime = "nodejs";

function mustEnv(name: string) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env: ${name}`);
    return v;
}

const ALLOWED_MIME = new Set<string>(COLUMN_REQUEST_ALLOWED_MIME);

const rateLimiter = new RateLimiterMemory({
    points: 10,
    duration: 3600,
});

function safeOrigin(req: Request) {
    const origin = req.headers.get("origin");
    if (!origin) return true;
    return (
        origin === "https://syncstaq.com" || origin === "http://localhost:3000"
    );
}

export async function POST(req: Request) {
    try {
        if (!safeOrigin(req))
            return new NextResponse("Forbidden", { status: 403 });

        const session = (await getServerSession(authOptions)) as Session;

        if (!session?.user?.email || !(session.user as any).userId)
            return new NextResponse(
                "Unable to process request, please sign in again.",
                { status: 401 },
            );

        const userId = (session.user as any).userId as string;
        try {
            await rateLimiter.consume(userId);
        } catch {
            return new NextResponse(
                "Too many requests. Please try again later.",
                { status: 429 },
            );
        }

        sgMail.setApiKey(mustEnv("SENDGRID_API_KEY"));

        const form = await req.formData();

        const columnsText = String(form.get("columnsText") ?? "").trim();
        const userEmail = session.user?.email;
        const workspaceName = String(form.get("workspaceName") ?? "").trim();
        const stripeAccountId = String(
            form.get("stripeAccountId") ?? "",
        ).trim();

        if (!columnsText)
            return new NextResponse("columnsText required", { status: 400 });
        if (columnsText.length > COLUMN_REQUEST_MAX_TEXT_LENGTH)
            return new NextResponse(
                `Request text too long (max ${COLUMN_REQUEST_MAX_TEXT_LENGTH} characters)`,
                { status: 400 },
            );

        const filesRaw = form
            .getAll("screenshots")
            .filter((v) => v instanceof File) as File[];
        if (filesRaw.length > COLUMN_REQUEST_MAX_SCREENSHOTS)
            return new NextResponse(
                `Too many files (max ${COLUMN_REQUEST_MAX_SCREENSHOTS})`,
                { status: 400 },
            );

        // Per-file + total size guard
        let totalBytes = 0;
        for (const f of filesRaw) {
            if (f.size > COLUMN_REQUEST_MAX_PER_FILE_BYTES)
                return new NextResponse("File too large (max 5MB each)", {
                    status: 413,
                });
            totalBytes += f.size;
            if (totalBytes > COLUMN_REQUEST_MAX_TOTAL_BYTES)
                return new NextResponse(
                    "Attachments too large (max 10MB total)",
                    { status: 413 },
                );
        }

        // Validate by magic bytes + re-encode via sharp
        const attachments: Array<{
            content: string;
            filename: string;
            type: string;
            disposition: "attachment";
        }> = [];

        for (const f of filesRaw) {
            const buf = Buffer.from(await f.arrayBuffer());

            // Magic-byte type detection
            const ft = await fileTypeFromBuffer(buf);
            if (!ft || !ALLOWED_MIME.has(ft.mime)) {
                return new NextResponse("Unsupported file type", {
                    status: 400,
                });
            }

            // Decode + re-encode to strip metadata and ensure it's a real image
            // Rotate() respects EXIF orientation but EXIF itself is stripped on output
            const outBuf = await sharp(buf, { failOnError: true })
                .rotate()
                .resize({
                    width: 2000,
                    height: 2000,
                    fit: "inside",
                    withoutEnlargement: true,
                })
                .jpeg({ quality: 85 })
                .toBuffer();

            attachments.push({
                content: outBuf.toString("base64"),
                filename: `${crypto.randomUUID()}.jpg`, // don’t trust user filename
                type: "image/jpeg",
                disposition: "attachment",
            });
        }

        const subject = `SyncStaq Column Request${workspaceName ? ` — ${workspaceName}` : ""}`;
        const text = [
            "New column request submitted.",
            "",
            `User: ${userEmail || "(unknown)"}`,
            `Workspace: ${workspaceName || "(unknown)"}`,
            `Stripe Account: ${stripeAccountId || "(unknown)"}`,
            "",
            "Requested columns:",
            columnsText,
            "",
            `Screenshots attached: ${attachments.length}`,
        ].join("\n");

        if (IS_DEV && !process.env.SEND_EMAILS) {
            return NextResponse.json({ ok: true });
        }

        await sgMail.send({
            to: mustEnv("SENDGRID_TO"),
            from: mustEnv("SENDGRID_FROM"),
            subject,
            text,
            replyTo: userEmail || undefined,
            attachments: attachments.length ? attachments : undefined,
        });

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        console.error("[column-request]", e?.response?.body ?? e);

        let status = 500;
        let clientMsg = "Something went wrong. Please try again.";

        const sgStatus = e?.code as number | undefined;
        if (sgStatus === 401 || sgStatus === 403) {
            clientMsg =
                "Email service authentication error. Please contact support.";
        } else if (sgStatus === 429) {
            status = 429;
            clientMsg =
                "Email service is temporarily rate-limited. Please try again in a few minutes.";
        } else if (sgStatus && sgStatus >= 500) {
            clientMsg =
                "Email service is temporarily unavailable. Please try again shortly.";
        } else if (e?.code === "ENOTFOUND" || e?.code === "ECONNREFUSED") {
            clientMsg =
                "Unable to reach email service. Please try again shortly.";
        }

        // Return generic error message so SendGrid doesn't leak error details to the client
        return new NextResponse(clientMsg, { status });
    }
}
