import "server-only";
import { APP_URL, IS_DEV } from "@/lib/constants";

// Canonical production origins for the web app. `APP_URL` is included so the
// check follows NEXTAUTH_URL across environments; the apex/www variants are
// listed explicitly because either may appear as a browser Origin header.
const PRODUCTION_ORIGINS = [
    "https://syncstaq.com",
    "https://www.syncstaq.com",
];

const DEV_ORIGINS = ["http://localhost:3000"];

function getAllowedOrigins(): Set<string> {
    const origins = new Set<string>(PRODUCTION_ORIGINS);
    origins.add(APP_URL);
    if (IS_DEV) {
        for (const origin of DEV_ORIGINS) origins.add(origin);
    }
    return origins;
}

/**
 * CSRF/origin allow-list check for state-changing route handlers.
 *
 * Returns true when there is no Origin header: non-browser clients and some
 * same-origin requests omit it, and these endpoints are additionally protected
 * by an authenticated session. Cross-origin browser POSTs always send Origin,
 * so a disallowed origin is rejected.
 */
export function isAllowedOrigin(origin: string | null): boolean {
    if (!origin) return true;
    return getAllowedOrigins().has(origin);
}
