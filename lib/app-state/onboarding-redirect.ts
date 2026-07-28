// Shared redirect helpers for companion "start" entry pages (Stripe app,
// Google Sheets add-on). Both send an authenticated user to the right point in
// onboarding (or the dashboard) based on their stage.
import type { OnboardingStage } from "@/lib/app-state/user-state";

type SearchParamValue = string | string[] | undefined;

// Only these inbound keys survive onto callbackUrl / post-login redirects.
// Add keys intentionally (e.g. spreadsheetId) — never forward arbitrary query.
export const COMPANION_START_ALLOWED_PARAMS: readonly string[] = [];

export function pickAllowedSearchParams(
    searchParams: Record<string, SearchParamValue>,
    allowedKeys: readonly string[],
): Record<string, SearchParamValue> {
    const allowed = new Set(allowedKeys);
    const picked: Record<string, SearchParamValue> = {};
    for (const key of allowed) {
        if (key in searchParams) {
            picked[key] = searchParams[key];
        }
    }
    return picked;
}

export function appendSearchParams(
    path: string,
    searchParams: Record<string, SearchParamValue>,
) {
    const [pathname, existingQuery = ""] = path.split("?");
    const nextSearchParams = new URLSearchParams(existingQuery);

    for (const [key, value] of Object.entries(searchParams)) {
        if (Array.isArray(value)) {
            for (const item of value) {
                nextSearchParams.append(key, item);
            }
            continue;
        }

        if (typeof value === "string") {
            nextSearchParams.set(key, value);
        }
    }

    const queryString = nextSearchParams.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
}

export function nextPathForStage(stage: OnboardingStage) {
    switch (stage) {
        case "account_only":
        case "google_connected":
            return "/onboarding?step=1";
        case "stripe_connected":
            return "/onboarding?step=2";
        case "connections_linked":
        case "sheet_created":
            return "/onboarding?step=3";
        case "ready":
            return "/dashboard";
        default:
            return "/onboarding?step=1";
    }
}

// Relative paths only — blocks open redirects into NextAuth callbackUrl.
export function sanitizeCallbackUrl(
    value: string | undefined,
    fallback = "/dashboard",
) {
    if (!value) return fallback;
    if (!value.startsWith("/")) return fallback;
    if (value.startsWith("//")) return fallback;
    if (value.includes("://")) return fallback;
    return value;
}
