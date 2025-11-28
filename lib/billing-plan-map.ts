// lib/billing-plan-map.ts
import { BILLING_PRICES } from "./stripe-billing";

export function mapStripePriceToPlan(priceId: string | null | undefined): {
    planId: string;
    interval: "monthly" | "yearly";
} | null {
    if (!priceId) return null;

    if (priceId === BILLING_PRICES.pro.monthly) {
        return { planId: "pro", interval: "monthly" };
    }
    if (priceId === BILLING_PRICES.pro.yearly) {
        return { planId: "pro", interval: "yearly" };
    }

    return null;
}
