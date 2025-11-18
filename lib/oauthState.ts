import crypto from "crypto";

const CRYPTO_SECRET = process.env.CRYPTO_SECRET!;
const STATE_TTL_SECONDS = 5 * 60; // 10 minutes

function base64url(buf: Buffer) {
    return buf.toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function hmacSign(data: string) {
    return base64url(
        crypto
            .createHmac("sha256", CRYPTO_SECRET)
            .update(data, "utf8")
            .digest()
    );
}

// Call this in your /api/stripe/connect route
// Pass in whatever you consider the current app user ID
export async function makeState(userId: string): Promise<string> {
    // 1. random nonce
    const nonce = base64url(crypto.randomBytes(16));

    // 2. expiry timestamp
    const expUnix = Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS;

    // 3. data we will sign
    const payload = `${nonce}.${expUnix}.${userId}`;

    // 4. HMAC signature
    const sig = hmacSign(payload);

    // 5. final state token
    return `${nonce}.${expUnix}.${userId}.${sig}`;
}

// Call this in your /api/stripe/callback route
// Returns { ok: true, userId } if valid, else { ok: false }
export async function verifyState(
    state: string | null,
    currentUserId: string
): Promise<{ ok: boolean; userId?: string }> {
    if (!state) return { ok: false };

    const parts = state.split(".");
    // expected: [nonce, expUnix, userIdFromState, sig]
    if (parts.length !== 4) return { ok: false };

    const [nonce, expUnixStr, userIdFromState, sig] = parts;

    // 1. check expiration
    const nowUnix = Math.floor(Date.now() / 1000);
    const expUnix = Number(expUnixStr);
    if (!Number.isFinite(expUnix) || nowUnix > expUnix) {
        return { ok: false };
    }

    // 2. recompute signature
    const payload = `${nonce}.${expUnix}.${userIdFromState}`;
    const expectedSig = hmacSign(payload);

    // use timingSafeEqual to prevent subtle timing attacks
    const validSig =
        sig.length === expectedSig.length &&
        crypto.timingSafeEqual(
            Buffer.from(sig),
            Buffer.from(expectedSig)
        );

    if (!validSig) return { ok: false };

    // 3. bind to the logged-in user
    if (userIdFromState !== currentUserId) return { ok: false };

    return { ok: true, userId: userIdFromState };
}
