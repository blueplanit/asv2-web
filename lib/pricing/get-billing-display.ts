import { stripeBilling, BILLING_PRICES } from "@/lib/stripe/stripe-billing";

export type BillingInterval = "monthly" | "yearly";
export type BillingDisplay = Record<BillingInterval, { price: string; intervalLabel: string }>;

function formatMoney(unitAmount: number, currency: string) {
    const hasCents = unitAmount % 100 !== 0;
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
        minimumFractionDigits: hasCents ? 2 : 0,
        maximumFractionDigits: hasCents ? 2 : 0,
    }).format(unitAmount / 100);
}

export async function getBillingDisplay(): Promise<BillingDisplay> {
    const monthlyId = BILLING_PRICES.pro.monthly;
    const yearlyId = BILLING_PRICES.pro.yearly;

    const [monthly, yearly] = await Promise.all([
        stripeBilling.prices.retrieve(monthlyId),
        stripeBilling.prices.retrieve(yearlyId),
    ]);

    if (!monthly.unit_amount || !monthly.currency) throw new Error("Monthly price missing unit_amount/currency");
    if (!yearly.unit_amount || !yearly.currency) throw new Error("Yearly price missing unit_amount/currency");

    return {
        monthly: { price: formatMoney(monthly.unit_amount, monthly.currency), intervalLabel: "/month" },
        yearly: { price: formatMoney(yearly.unit_amount, yearly.currency), intervalLabel: "/year" },
    };
}
