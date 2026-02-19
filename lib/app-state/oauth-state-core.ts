// lib/app-state/oauth-state-core.ts
import crypto from "crypto";

const CRYPTO_SECRET = process.env.CRYPTO_SECRET!;
if (!CRYPTO_SECRET) throw new Error("Missing CRYPTO_SECRET");

export type SignedOAuthStateBase = {
    nonce: string;
    expUnix: number; // epoch seconds
    userId: string;

    provider: string; // "google" | "stripe" | ...
    flow: string;     // provider-specific
    returnTo?: string;
};

export type VerifySignedStateOk<P extends SignedOAuthStateBase> = {
    ok: true;
    payload: P;
};

export type VerifySignedStateFail = {
    ok: false;
    reason:
    | "missing_state"
    | "malformed_state"
    | "bad_sig"
    | "bad_payload"
    | "expired"
    | "user_mismatch"
    | "nonce_mismatch";
};

export type VerifySignedStateResult<P extends SignedOAuthStateBase> =
    | VerifySignedStateOk<P>
    | VerifySignedStateFail;

export function sanitizeReturnTo(path: string | null | undefined): string | undefined {
    if (!path) return undefined;
    if (!path.startsWith("/")) return undefined;
    if (path.startsWith("//")) return undefined;
    if (path.includes("://")) return undefined;
    return path;
}

function base64urlEncode(buf: Buffer): string {
    return buf
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function base64urlDecodeToBuffer(s: string): Buffer {
    // Convert base64url -> base64
    const base64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
    return Buffer.from(base64, "base64");
}

function base64urlJsonEncode(obj: unknown): string {
    return base64urlEncode(Buffer.from(JSON.stringify(obj), "utf8"));
}

function base64urlJsonDecode<T>(raw: string): T | null {
    try {
        const json = base64urlDecodeToBuffer(raw).toString("utf8");
        return JSON.parse(json) as T;
    } catch {
        return null;
    }
}

function hmacSign(raw: string): string {
    return base64urlEncode(
        crypto.createHmac("sha256", CRYPTO_SECRET).update(raw, "utf8").digest(),
    );
}

function timingSafeEqualStr(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function newNonce(bytes = 16): string {
    return base64urlEncode(crypto.randomBytes(bytes));
}

export function makeSignedState<P extends Omit<SignedOAuthStateBase, "nonce" | "expUnix">>(args: {
    payload: P;
    ttlSeconds: number;
}): { state: string; nonce: string; expUnix: number } {
    const nonce = newNonce();
    const expUnix = Math.floor(Date.now() / 1000) + args.ttlSeconds;

    const fullPayload: SignedOAuthStateBase = {
        ...(args.payload as any),
        nonce,
        expUnix,
    };

    const raw = base64urlJsonEncode(fullPayload);
    const sig = hmacSign(raw);
    return { state: `${raw}.${sig}`, nonce, expUnix };
}

export function verifySignedState<P extends SignedOAuthStateBase>(args: {
    state: string | null;
    currentUserId: string;
    cookieNonce: string | null;
}): VerifySignedStateResult<P> {
    if (!args.state) return { ok: false, reason: "missing_state" };

    const [raw, sig] = args.state.split(".");
    if (!raw || !sig) return { ok: false, reason: "malformed_state" };

    const expected = hmacSign(raw);
    if (!timingSafeEqualStr(sig, expected)) return { ok: false, reason: "bad_sig" };

    const payload = base64urlJsonDecode<P>(raw);
    if (!payload) return { ok: false, reason: "bad_payload" };

    const nowUnix = Math.floor(Date.now() / 1000);
    if (!Number.isFinite((payload as any).expUnix) || nowUnix > (payload as any).expUnix) {
        return { ok: false, reason: "expired" };
    }

    if ((payload as any).userId !== args.currentUserId) return { ok: false, reason: "user_mismatch" };
    if (!args.cookieNonce || (payload as any).nonce !== args.cookieNonce) {
        return { ok: false, reason: "nonce_mismatch" };
    }

    return { ok: true, payload };
}
