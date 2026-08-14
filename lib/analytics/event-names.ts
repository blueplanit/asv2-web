// Funnel event names, shared by the browser and server emitters. These strings
// are a wire contract with Amplitude: a typo in one call site splits a funnel
// step into two unrelated events, silently and unrecoverably.
//
// Deliberately no "use client" or "server-only" — both sides import this.
//
// What belongs here: the acquisition and monetization events listed in
// "What is emitted, and where from" in docs/adr/0002 — the ones a conversion
// or onboarding chart is built from. One-off product events (Column Request,
// Recovery, Spreadsheet Link Clicked) stay inline — each has a single emitter,
// so there is nothing for them to drift against.
export const EVENT_NAMES = {
    PRICING_PAGE_VIEWED: "Pricing Page Viewed",
    SIGN_IN_STARTED: "Sign In Started",
    SIGNED_UP: "Signed Up",
    LOGGED_IN: "Logged In",
    STRIPE_CONNECT_STARTED: "Stripe Connect Started",
    STRIPE_CONNECTED: "Stripe Connected",
    GOOGLE_CONNECT_STARTED: "Google Connect Started",
    GOOGLE_CONNECTED: "Google Connected",
    WORKSPACE_SPREADSHEET_CREATION_STARTED: "Workspace Spreadsheet Creation Started",
    WORKSPACE_SPREADSHEET_CREATED: "Workspace Spreadsheet Created",
    SYNC_CONFIG_SETUP_STARTED: "Sync Config Setup Started",
    TRIAL_STARTED: "Trial Started",
    ONBOARDING_COMPLETED: "Onboarding Completed",
    BACKFILL_COMPLETED: "Backfill Completed",
    CHECKOUT_STARTED: "Checkout Started",
    SUBSCRIPTION_PAID: "Subscription Paid",
} as const;

// Both the auto-create path (server) and the manual fallback (client) can emit
// the spreadsheet event. Sharing one insert_id lets Amplitude collapse them if
// they ever both fire for the same spreadsheet.
export function workspaceSpreadsheetCreatedInsertId(
    userId: string,
    spreadsheetId: string,
) {
    return `${userId}:${spreadsheetId}:sheet-created`;
}
