// lib/schemas/user-profile.ts
import { z } from "zod";

export const UserProfileSchema = z.object({
    pk: z.string().regex(/^USER#/), // User#<ULID>
    sk: z.literal("PROFILE"),
    userId: z.string(),        // your authUserId/appUserId
    email: z.email(),
    googleUserId: z.string(),
    createdAt: z.string(),     // ISO string
    updatedAt: z.string(),     // ISO string
    subscriptionStatus: z.enum(["active", "inactive"]).default("inactive"), // subscription status updated by webhooks
    //Stripe metadata
    subscriptionId: z.string().default("").optional(), // Stripe subscription ID
    subscriptionPlanId: z.string().optional(),              // e.g. "pro"
    subscriptionInterval: z.enum(["monthly", "yearly"]).optional(), // normalized interval
    subscriptionCurrentPeriodEnd: z.string().optional(),    // ISO date of the current period end
    subscriptionCustomerId: z.string().optional(),          // Stripe customer id
    subscriptionRawStatus: z.string().optional(),           // incomplete, incomplete_expired, trialing, active, past_due, canceled, unpaid, canceling, or paused. (only for UI copy/decisions)
    // GSI to query active subscriptions 
    ACTIVE_SUB_GSI_PK: z.string().optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
