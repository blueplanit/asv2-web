// lib/schemas/sync-config.ts
import { z } from "zod";


export const DEFAULT_ENABLED_STRIPE_OBJECTS = ["charges", "invoices", "customers", "payouts", "subscriptions"];
export const StripeObjectEnum = z.enum(DEFAULT_ENABLED_STRIPE_OBJECTS);
export type StripeObject = z.infer<typeof StripeObjectEnum>;

export const SyncConfigSchema = z.object({
    pk: z.string().regex(/^USER#/),                 // USER#<authUserId>
    sk: z.string().regex(/^SYNC#/),                 // SYNC#<spreadsheetId>
    type: z.literal("SyncConfig"),

    userId: z.string(),                             // same as authUserId
    spreadsheetId: z.string(),
    stripeAccountId: z.string(),                    // connected account this sheet belongs to

    enabledStripeObjects: z.array(StripeObjectEnum).default([]),
    historyMode: z.enum(["full", "since"]).default("since"),         // "full" = all history, "since" = recent window
    historySinceDays: z.number().int().positive().default(90), // e.g. last 90 days when historyMode="since"

    // sync lifecycle
    lastSyncAt: z.string().nullable().default(null),              // ISO or null
    lastError: z.string().nullable().default(null),               // human-readable or code

    createdAt: z.string(),                          // ISO
    updatedAt: z.string(),                          // ISO
});

export type SyncConfig = z.infer<typeof SyncConfigSchema>;
