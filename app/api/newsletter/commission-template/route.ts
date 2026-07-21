import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { RateLimiterMemory } from "rate-limiter-flexible";

export const runtime = "nodejs";

// Already public (they live in the old embed's `action` URL). Kept server-side
// only to remove them from the client bundle.
const MAILERLITE_ACCOUNT_ID = "2476794";
const MAILERLITE_FORM_ID = "191558050637677901";
const MAILERLITE_SUBSCRIBE_URL = `https://assets.mailerlite.com/jsonp/${MAILERLITE_ACCOUNT_ID}/forms/${MAILERLITE_FORM_ID}/subscribe`;

const ALLOWED_ORIGINS = new Set([
  "https://syncstaq.com",
  "https://www.syncstaq.com",
  "http://localhost:3000",
]);

const rateLimiter = new RateLimiterMemory({ points: 5, duration: 60 });

const bodySchema = z.object({
  email: z.string().email(),
  recaptchaToken: z.string().optional(),
});

function safeOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  return origin !== null && ALLOWED_ORIGINS.has(origin);
}

export async function POST(req: NextRequest) {
  if (!safeOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  try {
    await rateLimiter.consume(ip);
  } catch {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    const form = new URLSearchParams();
    form.set("fields[email]", parsed.data.email);
    form.set("ml-submit", "1");
    form.set("anticsrf", "true");
    if (parsed.data.recaptchaToken) {
      form.set("g-recaptcha-response", parsed.data.recaptchaToken);
    }

    const res = await fetch(MAILERLITE_SUBSCRIBE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    // MailerLite's classic endpoint returns JSONP; we ignore the body and only
    // trust the HTTP status.
    if (!res.ok) {
      throw new Error(`MailerLite responded ${res.status}`);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Subscription failed. Please try again." },
      { status: 502 },
    );
  }
}
