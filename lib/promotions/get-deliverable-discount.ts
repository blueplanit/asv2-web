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

// The active Promotion plus its live Stripe discount, or null if undeliverable. Never
// throws, so a bad Promotion Code means full price, never a broken page or dead button.
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

// True only for a `forever` coupon — a `once`/`repeating` coupon still applies at
// checkout, but showing it as the ongoing rate would be false after the next invoice.
export function isOngoingDiscount(coupon: Stripe.Coupon): boolean {
    return coupon.duration === "forever";
}
