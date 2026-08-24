import type Stripe from "stripe";
import { stripeBilling, BILLING_PRICES } from "@/lib/stripe/stripe-billing";
import { getDeliverableDiscount, isOngoingDiscount } from "@/lib/promotions/get-deliverable-discount";

export type BillingInterval = "monthly" | "yearly";

export type BillingDisplay = Record<
    BillingInterval,
    {
        price: string;
        intervalLabel: string;
        // Both null together, or both set together.
        discountedPrice: string | null;
        percentOff: number | null;
    }
>;

export type BillingDisplayResult = {
    billingDisplay: BillingDisplay;
    // The Promotion's Contentful entry id — same id space as the banner's own
    // analytics (components/layout/promotion-banner.tsx), for funnel correlation.
    promotionId: string | null;
};

function formatMoney(unitAmount: number, currency: string) {
    const hasCents = unitAmount % 100 !== 0;
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
        minimumFractionDigits: hasCents ? 2 : 0,
        maximumFractionDigits: hasCents ? 2 : 0,
    }).format(unitAmount / 100);
}

function discountedAmount(unitAmount: number, coupon: Stripe.Coupon): number {
    if (coupon.percent_off) {
        return Math.round(unitAmount * (1 - coupon.percent_off / 100));
    }
    if (coupon.amount_off) {
        return Math.max(0, unitAmount - coupon.amount_off);
    }
    return unitAmount;
}

// Computed from the price difference, not `coupon.percent_off` — an amount_off
// coupon has no percent_off field, so this works for both discount shapes.
function percentOffFor(unitAmount: number, discounted: number): number {
    return Math.round(((unitAmount - discounted) / unitAmount) * 100);
}

export async function getBillingDisplay(): Promise<BillingDisplayResult> {
    const monthlyId = BILLING_PRICES.pro.monthly;
    const yearlyId = BILLING_PRICES.pro.yearly;

    const [monthly, yearly, discount] = await Promise.all([
        stripeBilling.prices.retrieve(monthlyId),
        stripeBilling.prices.retrieve(yearlyId),
        getDeliverableDiscount(),
    ]);

    if (!monthly.unit_amount || !monthly.currency) throw new Error("Monthly price missing unit_amount/currency");
    if (!yearly.unit_amount || !yearly.currency) throw new Error("Yearly price missing unit_amount/currency");

    // A non-ongoing discount still applies at checkout, so it stays reportable below
    // — it just cannot be shown as the per-interval rate.
    const shownCoupon = discount && isOngoingDiscount(discount.coupon) ? discount.coupon : null;

    function display(unitAmount: number, currency: string, intervalLabel: string) {
        if (!shownCoupon) {
            return { price: formatMoney(unitAmount, currency), intervalLabel, discountedPrice: null, percentOff: null };
        }

        const discounted = discountedAmount(unitAmount, shownCoupon);
        return {
            price: formatMoney(unitAmount, currency),
            intervalLabel,
            discountedPrice: formatMoney(discounted, currency),
            percentOff: percentOffFor(unitAmount, discounted),
        };
    }

    return {
        billingDisplay: {
            monthly: display(monthly.unit_amount, monthly.currency, "/month"),
            yearly: display(yearly.unit_amount, yearly.currency, "/year"),
        },
        promotionId: discount?.promotion.id ?? null,
    };
}
