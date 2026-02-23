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
} from "@/lib/column-request";

export const runtime = "nodejs";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function safeOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  return origin === "https://syncstaq.com" || origin === "http://localhost:3000";
}

export async function POST(req: Request) {
  try {
    if (!safeOrigin(req)) return new NextResponse("Forbidden", { status: 403 });

    const session = await getServerSession(authOptions) as Session;

    if(!session?.user?.email || !(session.user as any).userId) return new NextResponse("Unable to process request, please sign in again.", { status: 401 });

    sgMail.setApiKey(mustEnv("SENDGRID_API_KEY"));

    const form = await req.formData();

    const columnsText = String(form.get("columnsText") ?? "").trim();
    const userEmail = session.user?.email;
    const workspaceName = String(form.get("workspaceName") ?? "").trim();
    const stripeAccountId = String(form.get("stripeAccountId") ?? "").trim();

    if (!columnsText) return new NextResponse("columnsText required", { status: 400 });

    const filesRaw = form.getAll("screenshots").filter((v) => v instanceof File) as File[];
    if (filesRaw.length > COLUMN_REQUEST_MAX_SCREENSHOTS) return new NextResponse(`Too many files (max ${COLUMN_REQUEST_MAX_SCREENSHOTS})`, { status: 400 });

    // Per-file + total size guard
    let totalBytes = 0;
    for (const f of filesRaw) {
      if (f.size > COLUMN_REQUEST_MAX_PER_FILE_BYTES) return new NextResponse("File too large (max 5MB each)", { status: 413 });
      totalBytes += f.size;
      if (totalBytes > COLUMN_REQUEST_MAX_TOTAL_BYTES) return new NextResponse("Attachments too large (max 10MB total)", { status: 413 });
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
        return new NextResponse("Unsupported file type", { status: 400 });
      }

      // Decode + re-encode to strip metadata and ensure it's a real image
      // Rotate() respects EXIF orientation but EXIF itself is stripped on output
      const outBuf = await sharp(buf, { failOnError: true })
        .rotate()
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
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
    
    if(IS_DEV && !process.env.SEND_EMAILS) {
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
    const msg = e?.response?.body ? JSON.stringify(e.response.body) : e?.message || "Server error";
    return new NextResponse(msg, { status: 500 });
  }
}