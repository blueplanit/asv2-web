// lib/schemas/stripe-connection.ts
import { StripeConnectionSchema as SharedStripeConnectionSchema } from "@blueplanit/asv2-shared";
import { z } from "zod";

export const StripeConnectionSchema = SharedStripeConnectionSchema.extend({
    STRIPE_ACCOUNT_GSI_PK: z.string().optional(),
});

export type StripeConnection = z.infer<typeof StripeConnectionSchema>;
