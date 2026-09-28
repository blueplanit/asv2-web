import type Stripe from "stripe";
import { unstable_cache } from "next/cache";
import { stripeBilling, BILLING_PRICES } from "@/lib/stripe/stripe-billing";
import {
    deliverableDiscountVersion,
    getDeliverableDiscount,
    discountedBillCount,
} from "@/lib/promotions/get-deliverable-discount";

export type BillingInterval = "monthly" | "yearly";

// Set only for an Introductory Discount: states when the discounted price ends.
export type DiscountPeriodDisplay = {
    terms: string;
    short: string;
};

export type BillingDisplay = Record<
    BillingInterval,
    {
        price: string;
        intervalLabel: string;
        // Both null together, or both set together.
        discountedPrice: string | null;
        percentOff: number | null;
        discountPeriod: DiscountPeriodDisplay | null;
    }
>;

export type BillingDisplayResult = {
    billingDisplay: BillingDisplay;
    // The Promotion's Contentful entry id — same id space as the banner's own
    // analytics (components/layout/promotion-banner.tsx), for funnel correlation.
    promotionId: string | null;
    // An optimistic concurrency token for the exact Promotion Code behind the display.
    promotionVersion: string | null;
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

// List prices carry no Promotion state and change rarely, so they hold the hour the
// HTTP response used to buy. A throw caches nothing — see ADR-0003 point 7.
const getProPriceAmounts = unstable_cache(
    async () => {
        const [monthly, yearly] = await Promise.all([
            stripeBilling.prices.retrieve(BILLING_PRICES.pro.monthly),
            stripeBilling.prices.retrieve(BILLING_PRICES.pro.yearly),
        ]);

        if (!monthly.unit_amount || !monthly.currency) throw new Error("Monthly price missing unit_amount/currency");
        if (!yearly.unit_amount || !yearly.currency) throw new Error("Yearly price missing unit_amount/currency");

        return {
            monthly: { unitAmount: monthly.unit_amount, currency: monthly.currency },
            yearly: { unitAmount: yearly.unit_amount, currency: yearly.currency },
        };
    },
    ["stripe-pro-prices", BILLING_PRICES.pro.monthly, BILLING_PRICES.pro.yearly],
    { revalidate: 3600 },
);

export async function getBillingDisplay(): Promise<BillingDisplayResult> {
    const [prices, discount] = await Promise.all([
        getProPriceAmounts(),
        getDeliverableDiscount(),
    ]);

    const coupon = discount?.coupon ?? null;

    function display(unitAmount: number, currency: string, intervalLabel: string, intervalMonths: number, unit: string) {
        const price = formatMoney(unitAmount, currency);
        const billCount = coupon ? discountedBillCount(coupon, intervalMonths) : null;

        // A zero count means Stripe discounts no bill here, so showing a discount would be false.
        if (!coupon || billCount === 0) {
            return { price, intervalLabel, discountedPrice: null, percentOff: null, discountPeriod: null };
        }

        const discounted = discountedAmount(unitAmount, coupon);
        const period = billCount === 1 ? `first ${unit}` : `first ${billCount} ${unit}s`;
        return {
            price,
            intervalLabel,
            discountedPrice: formatMoney(discounted, currency),
            percentOff: percentOffFor(unitAmount, discounted),
            discountPeriod: billCount === null
                ? null
                : { terms: `for your ${period}, then ${price}${intervalLabel}`, short: period },
        };
    }

    return {
        billingDisplay: {
            monthly: display(prices.monthly.unitAmount, prices.monthly.currency, "/month", 1, "month"),
            yearly: display(prices.yearly.unitAmount, prices.yearly.currency, "/year", 12, "year"),
        },
        promotionId: discount?.promotion.id ?? null,
        promotionVersion: deliverableDiscountVersion(discount),
    };
}
