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

// Reads the currently active Promotion, or null when none should be shown.
//
// The fallback sits outside the cached read, so a Contentful outage never stores it
// — see docs/adr/0003-contentful-delivery-quota.md point 7. This wrapper exists
// (rather than every caller catching its own) because a Promotion is decorative on
// every marketing page it touches, not core page content like a Copy Config entry:
// an uncaught error here would fail the render of every marketing page, not just
// omit a banner. "No promotion" is the one correct fallback for every consumer —
// the banner, pricing display, checkout — so there is no per-caller default to lose
// by sharing it here.
//
// A malformed entry (a required field missing or blank) also falls back to null
// rather than rendering a banner with holes in it — same failure mode, same fix.
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
