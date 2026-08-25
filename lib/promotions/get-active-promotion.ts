// lib/promotions/get-active-promotion.ts
import "server-only";
import { z } from "zod";
import { getActivePromotionEntry } from "@/lib/contentful/contentful-queries";
import type { PromotionFields } from "@/lib/contentful/contentful";

const promotionFieldsSchema = z.object({
    stripePromotionCodeId: z.string().min(1),
    bannerHeadline: z.string().min(1),
    ctaLabel: z.string().min(1),
    ctaHref: z.string().min(1),
    showInProduction: z.boolean().optional(),
});

// Reads the currently active Promotion, or null when none should be shown. Never
// throws — a Contentful error or a malformed entry falls back to null outside the
// cache, so an outage or a bad entry never fails a marketing page's render.
export async function getActivePromotion(): Promise<PromotionFields | null> {
    try {
        const entry = await getActivePromotionEntry();
        if (!entry) return null;

        const parsed = promotionFieldsSchema.safeParse(entry.fields);
        if (!parsed.success) {
            console.error("getActivePromotion: malformed entry, showing no promotion", {
                issues: parsed.error.issues,
            });
            return null;
        }

        return { ...parsed.data, id: entry.id };
    } catch (err) {
        console.error("getActivePromotion: Contentful error, showing no promotion", err);
        return null;
    }
}
