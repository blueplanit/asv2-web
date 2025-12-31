// lib/google-oauth-state.ts
import crypto from "crypto";
import "server-only";
import { makeSignedState, sanitizeReturnTo, SignedOAuthStateBase, verifySignedState, VerifySignedStateResult } from "./oauth-state-core";

const CRYPTO_SECRET = process.env.CRYPTO_SECRET!;
if (!CRYPTO_SECRET) throw new Error("Missing CRYPTO_SECRET");
const STATE_TTL_SECONDS = 10 * 60; // 10 minutes

export const GOOGLE_OAUTH_NONCE_COOKIE = "g_oauth_nonce";
export type GoogleOAuthFlow = "google-connect" | "google-reconnect";

export type GoogleOAuthStatePayload = SignedOAuthStateBase & {
    provider: "google";
    flow: GoogleOAuthFlow;
    shard: string;
};

// Call this in your /api/stripe/connect route
// Pass in whatever you consider the current app user ID
export function makeGoogleOAuthState(args: {
    userId: string;
    flow: GoogleOAuthFlow;
    shard: string;
    returnTo?: string;
}): { state: string; nonce: string } {
    const { state, nonce } = makeSignedState({
        ttlSeconds: STATE_TTL_SECONDS,
        payload: {
            userId: args.userId,
            provider: "google",
            flow: args.flow,
            shard: args.shard,
            returnTo: sanitizeReturnTo(args.returnTo),
        },
    });

    return { state, nonce };
}

// Call this in your /api/stripe/callback route
// Returns { ok: true, payload } if valid, else { ok: false, reason }
export function verifyGoogleOAuthState(
    state: string | null,
    currentUserId: string,
    cookieNonce: string | null
): VerifySignedStateResult<GoogleOAuthStatePayload> {
    const base = verifySignedState<GoogleOAuthStatePayload>({
        state: state,
        currentUserId: currentUserId,
        cookieNonce: cookieNonce,
    });

    if (!base.ok) return base;

    const p = base.payload;

    if (p.provider !== "google") return { ok: false, reason: "bad_payload" };
    if (p.flow !== "google-connect" && p.flow !== "google-reconnect") return { ok: false, reason: "bad_payload" };
    if (typeof (p as any).shard !== "string" || !(p as any).shard) return { ok: false, reason: "bad_payload" };

    return base;
}
