// lib/oauthState.ts
import crypto from "crypto";
import "server-only";

const CRYPTO_SECRET = process.env.CRYPTO_SECRET!;
if (!CRYPTO_SECRET) throw new Error("Missing CRYPTO_SECRET");
const STATE_TTL_SECONDS = 10 * 60; // 10 minutes

export const GOOGLE_OAUTH_NONCE_COOKIE = "g_oauth_nonce";
export type GoogleOAuthFlow = "google-connect" | "google-reconnect";

export type GoogleOAuthStatePayload = {
    nonce: string;
    expUnix: number;
    userId: string;
    flow: GoogleOAuthFlow;
    shard: string;
    returnTo?: string;
};

function base64url(buf: Buffer) {
    return buf.toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function base64urlJson(obj: unknown): string {
    return base64url(Buffer.from(JSON.stringify(obj), "utf8"));
}

function parseBase64urlJson<T>(raw: string): T | null {
    try {
        const json = Buffer.from(raw, "base64url").toString("utf8");
        return JSON.parse(json) as T;
    } catch {
        return null;
    }
}

function hmacSign(data: string) {
    return base64url(
        crypto
            .createHmac("sha256", CRYPTO_SECRET)
            .update(data, "utf8")
            .digest()
    );
}

export function newNonce(): string {
    return base64url(crypto.randomBytes(16));
}

export function sanitizeReturnTo(path: string | null | undefined): string | undefined {
    if (!path) return undefined;
    if (!path.startsWith("/")) return undefined;
    if (path.startsWith("//")) return undefined;
    if (path.includes("://")) return undefined;
    return path;
}

// Call this in your /api/stripe/connect route
// Pass in whatever you consider the current app user ID
export function makeGoogleOAuthState(args: {
    userId: string;
    flow: GoogleOAuthFlow;
    shard: string;
    returnTo?: string;
}): { state: string; nonce: string } {
    // 1. random nonce
    const nonce = newNonce();

    // 2. expiry timestamp
    const expUnix = Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS;

    // 3. data we will sign
    const payload: GoogleOAuthStatePayload = {
        nonce,
        expUnix,
        userId: args.userId,
        flow: args.flow,
        shard: args.shard,
        returnTo: args.returnTo,
    };

    // 4. HMAC signature
    const raw = base64urlJson(payload);
    const sig = hmacSign(raw);

    // 5. final state token
    return { state: `${raw}.${sig}`, nonce };
}

// Call this in your /api/stripe/callback route
// Returns { ok: true, payload } if valid, else { ok: false, reason }
export function verifyState(
    state: string | null,
    currentUserId: string,
    cookieNonce: string | null
): { ok: boolean; payload: GoogleOAuthStatePayload } | { ok: false, reason: string } {
    if (!state) return { ok: false, reason: "missing_state" };
    const [raw, sig] = state.split(".");
    if (!raw || !sig) return { ok: false, reason: "malformed_state" };
    const expected = hmacSign(raw);
    const validSig =
        sig.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!validSig) return { ok: false, reason: "bad_sig" };

    const payload = parseBase64urlJson<GoogleOAuthStatePayload>(raw);
    if (!payload) return { ok: false, reason: "bad_payload" };

    const nowUnix = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(payload.expUnix) || nowUnix > payload.expUnix) {
        return { ok: false, reason: "expired" };
    }

    if (payload.userId !== currentUserId) return { ok: false, reason: "user_mismatch" };
    if (!cookieNonce || payload.nonce !== cookieNonce) return { ok: false, reason: "nonce_mismatch" };

    if (payload.flow !== "google-connect" && payload.flow !== "google-reconnect") {
        return { ok: false, reason: "bad_flow" };
    }
    if (typeof payload.shard !== "string" || !payload.shard) return { ok: false, reason: "bad_shard" };

    return { ok: true, payload };
}
