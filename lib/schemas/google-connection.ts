// lib/schemas/google-connection.ts
import { z } from "zod";

export const GoogleConnectionSchema = z.object({
    pk: z.string().regex(/^USER#/),
    sk: z.string().regex(/^GOOGLE#/),
    type: z.literal("GoogleConnection"),
    userId: z.string(),
    googleUserId: z.string(),
    email: z.email(),
    status: z.enum(["connected", "revoked", "error"]),
    accessTokenEncrypted: z.string(), // your KMS-encrypted blob or similar
    refreshTokenEncrypted: z.string(), // your KMS-encrypted blob or similar
    createdAt: z.string(),
    updatedAt: z.string(),
});

export type GoogleConnection = z.infer<typeof GoogleConnectionSchema>;
