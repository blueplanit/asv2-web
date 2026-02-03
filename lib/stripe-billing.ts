import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");

const apiVersion = process.env.STRIPE_API_VERSION as Stripe.LatestApiVersion | undefined;

declare global {
    // eslint-disable-next-line no-var
    var __stripeBilling: Stripe | undefined;
}

export const stripeBilling =
    global.__stripeBilling ??
    new Stripe(process.env.STRIPE_SECRET_KEY, apiVersion ? { apiVersion } : undefined);

if (process.env.NODE_ENV !== "production") global.__stripeBilling = stripeBilling;

export const BILLING_PRICES = {
    pro: {
        monthly: process.env.STRIPE_PRICE_PRO_MONTHLY!,
        yearly: process.env.STRIPE_PRICE_PRO_YEARLY!,
    },
} as const;

export type BillingPlanId = "pro";
export type BillingInterval = "monthly" | "yearly";
