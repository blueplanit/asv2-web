// lib/promotions/get-deliverable-discount.ts
import "server-only";
import type Stripe from "stripe";
import { stripeBilling } from "@/lib/stripe/stripe-billing";
import { getActivePromotion } from "./get-active-promotion";
import type { PromotionFields } from "@/lib/contentful/contentful";

export type DeliverableDiscount = {
    promotion: PromotionFields;
    promotionCodeId: string;
    coupon: Stripe.Coupon;
};

// The active Promotion plus its live Stripe discount, or null when none can be
// delivered. Never throws: an unreadable or stale Promotion Code means full price,
// not a broken page or a dead Subscribe button.
//
// The pricing display and checkout share this so they cannot disagree about whether
// a Promotion is usable. See docs/adr/0005-promotions-sourced-from-stripe.md.
export async function getDeliverableDiscount(): Promise<DeliverableDiscount | null> {
    let promotion: PromotionFields | null = null;

    try {
        promotion = await getActivePromotion();
        if (!promotion) return null;

        const promotionCode = await stripeBilling.promotionCodes.retrieve(
            promotion.stripePromotionCodeId,
            { expand: ["promotion.coupon"] },
        );

        if (!promotionCode.active) return null;

        const coupon = promotionCode.promotion.coupon;
        if (!coupon || typeof coupon === "string" || !coupon.valid) return null;

        return { promotion, promotionCodeId: promotionCode.id, coupon };
    } catch (err) {
        // getActivePromotion catches its own errors, so this is the Stripe read.
        console.error(
            `getDeliverableDiscount: Promotion ${promotion?.id ?? "unknown"} names an unreadable Promotion Code, showing full price`,
            err,
        );
        return null;
    }
}

// Whether a discount can honestly be shown as the ongoing per-interval price. A
// `once` or `repeating` coupon still applies at checkout, but stating it as the rate
// would be false from the next invoice on. See ADR-0005 decision 7.
export function isOngoingDiscount(coupon: Stripe.Coupon): boolean {
    return coupon.duration === "forever";
}
