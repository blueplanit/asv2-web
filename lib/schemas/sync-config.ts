// lib/schemas/sync-config.ts
import { z } from "zod";


export const DEFAULT_ENABLED_STRIPE_OBJECTS = ["charges", "invoices", "customers", "payouts", "subscriptions", "payment_intents", "disputes"];
export const StripeObjectEnum = z.enum(DEFAULT_ENABLED_STRIPE_OBJECTS);
export type StripeObject = z.infer<typeof StripeObjectEnum>;

export const StripeDataSyncKindEnum = z.enum([
    "object_table",   // 1:1 Stripe object table
    "derived",       // derived / multi-source like revenue insights
    "custom",         // future user-defined
]);

export const StripeDataSyncEntrySchema = z.object({
    id: z.string().min(1), // e.g. "charges", "invoices", "customers", "payouts", "subscriptions", or later: "revenue_insights", "custom_user_defined"

    kind: StripeDataSyncKindEnum,

    // Google Sheets tab id (gid). Null until created/bound.
    sheetId: z.number().int().nonnegative().nullable().default(null),

    // For object_table views
    primaryStripeObject: StripeObjectEnum.optional(),

    // For insights/composite views
    sourceStripeObjects: z.array(StripeObjectEnum).default([]),

    enabled: z.boolean().default(true),

    layoutVersion: z.number().int().positive().default(1),

    displayName: z.string().optional(),
});

export type StripeDataSyncEntry = z.infer<typeof StripeDataSyncEntrySchema>;

export function buildDefaultStripeDataSyncMap(): StripeDataSyncEntry[] {
    return DEFAULT_ENABLED_STRIPE_OBJECTS.map((obj) => {
        let display = obj.charAt(0).toUpperCase() + obj.slice(1); // "Charges", "Invoices", "Customers", "Payouts", "Subscriptions", "Payment Intents", "Disputes"
        if (obj === "payment_intents") display = "Payment Intents";

        return {
            id: obj, // "charges", "invoices", "customers", "payouts", "subscriptions", "payment_intents", "disputes"
            kind: "object_table",
            sheetId: null,
            primaryStripeObject: obj as StripeObject,
            sourceStripeObjects: [obj as StripeObject],
            enabled: true,
            layoutVersion: 1,
            displayName: display,
        } satisfies StripeDataSyncEntry;
    });
}

export const SyncConfigSchema = z.object({
    pk: z.string().regex(/^USER#/),                 // USER#<authUserId>
    sk: z.string().regex(/^SYNC#/),                 // SYNC#<spreadsheetId>
    type: z.literal("SyncConfig"),

    userId: z.string(),                             // same as authUserId
    spreadsheetId: z.string(),
    stripeAccountId: z.string(),                    // connected account this sheet belongs to

    stripeDataSyncMap: z.array(StripeDataSyncEntrySchema).default([]), // what and how stripe data is synced to which sheet tab 
    historyMode: z.enum(["full", "since"]).default("since"),         // "full" = all history, "since" = recent window
    historySinceDays: z.number().int().positive().default(90), // e.g. last 90 days when historyMode="since"

    // sync lifecycle
    syncStatus: z.enum(["onboarding", "backfill_running", "paused", "error", "syncing"]).default("onboarding"),
    lastSyncAt: z.string().nullable().default(null),              // ISO or null
    lastError: z.string().nullable().default(null),               // human-readable or code

    createdAt: z.string(),                          // ISO
    updatedAt: z.string(),                          // ISO
});

export type SyncConfig = z.infer<typeof SyncConfigSchema>;
