// lib/promotions/get-deliverable-discount.ts
import "server-only";
import { createHash } from "node:crypto";
import type Stripe from "stripe";
import { stripeBilling } from "@/lib/stripe/stripe-billing";
import { getActivePromotion } from "./get-active-promotion";
import type { PromotionFields } from "@/lib/contentful/contentful";

export type DeliverableDiscount = {
    promotion: PromotionFields;
    promotionCodeId: string;
    coupon: Stripe.Coupon;
};

export function deliverableDiscountVersion(discount: DeliverableDiscount | null): string | null {
    return discount
        ? createHash("sha256")
            .update(`${discount.promotion.id}\0${discount.promotionCodeId}`)
            .digest("base64url")
        : null;
}

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

// Bills an Introductory Discount covers at this interval, or null for an Ongoing Discount.
// Stripe discounts any bill created before the Discount Period ends, so a 3-month coupon
// covers a whole yearly bill. See ADR-0006.
export function discountedBillCount(
    coupon: Pick<Stripe.Coupon, "duration" | "duration_in_months">,
    intervalMonths: number,
): number | null {
    if (coupon.duration === "forever") return null;
    if (coupon.duration === "once") return 1;
    return Math.ceil((coupon.duration_in_months ?? 0) / intervalMonths);
}
