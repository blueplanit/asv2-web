// lib/stripe-billing.ts
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripeBilling = new Stripe(process.env.STRIPE_SECRET_KEY);

export const BILLING_PRICES = {
    pro: {
        monthly: process.env.STRIPE_PRICE_PRO_MONTHLY!,
        yearly: process.env.STRIPE_PRICE_PRO_YEARLY!,
    },
} as const;

export type BillingPlanId = "pro";
export type BillingInterval = "monthly" | "yearly";
