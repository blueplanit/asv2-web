// lib/schemas/user-profile.ts
import { z } from "zod";

export const UserProfileSchema = z.object({
    pk: z.string().regex(/^USER#/),
    sk: z.literal("PROFILE"),
    userId: z.string(),        // your authUserId/appUserId
    email: z.email(),
    googleUserId: z.string(),
    createdAt: z.string(),     // ISO string
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
