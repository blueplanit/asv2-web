// lib/stripe/stripe-oauth-state.ts
import "server-only";
import {
    makeSignedState,
    sanitizeReturnTo,
    verifySignedState,
    type SignedOAuthStateBase,
    type VerifySignedStateResult,
} from "@/lib/app-state/oauth-state-core";

export const STRIPE_OAUTH_NONCE_COOKIE = "s_oauth_nonce";
const STATE_TTL_SECONDS = 10 * 60;

export type StripeOAuthFlow = "stripe-connect" | "stripe-reconnect";

export type StripeOAuthStatePayload = SignedOAuthStateBase & {
    provider: "stripe";
    flow: StripeOAuthFlow;
};

export async function makeState(args: {
    userId: string;
    flow?: StripeOAuthFlow;
    returnTo?: string;
}): Promise<{ state: string; nonce: string }> {
    const { state, nonce } = makeSignedState({
        ttlSeconds: STATE_TTL_SECONDS,
        payload: {
            userId: args.userId,
            provider: "stripe",
            flow: args.flow ?? "stripe-connect",
            returnTo: sanitizeReturnTo(args.returnTo),
        },
    });

    return { state, nonce };
}

export async function verifyStripeOAuthState(args: {
    state: string | null;
    currentUserId: string;
    cookieNonce: string | null;
}): Promise<VerifySignedStateResult<StripeOAuthStatePayload>> {
    const base = verifySignedState<StripeOAuthStatePayload>({
        state: args.state,
        currentUserId: args.currentUserId,
        cookieNonce: args.cookieNonce,
    });

    if (!base.ok) return base;

    const p = base.payload;

    if (p.provider !== "stripe") return { ok: false, reason: "bad_payload" };
    if (p.flow !== "stripe-connect" && p.flow !== "stripe-reconnect") return { ok: false, reason: "bad_payload" };

    return base;
}
