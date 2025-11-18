// lib/schemas/stripe-connection.ts
import { z } from "zod";

export const StripeConnectionSchema = z.object({
    pk: z.string().regex(/^USER#/),
    sk: z.string().regex(/^STRIPE#/),
    type: z.literal("StripeConnection"),
    userId: z.string(),
    stripeAccountId: z.string(),
    businessName: z.string(),
    status: z.enum(["connected", "revoked", "error"]),
    createdAt: z.string(), // ISO
    updatedAt: z.string(), // ISO
});

export type StripeConnection = z.infer<typeof StripeConnectionSchema>;
