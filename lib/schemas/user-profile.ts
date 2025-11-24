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
    subscriptionId: z.string().default("").optional(), // Stripe subscription ID
    subscriptionStatus: z.enum(["active", "inactive"]).default("inactive"), // subscription status updated by webhooks
    ACTIVE_SUB_GSI_PK: z.string().optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
