// lib/marketing/marketing-config.ts
import "server-only";
import { z } from "zod";
import { getCopyConfig } from "../contentful/contentful-queries";
import { COPY_PAGE_KEYS } from "../contentful/content-routes";
import { DEFAULT_MARKETING_COPY, type MarketingCopy } from "./marketing-copy";

const heroSchema = z.object({
    eyebrow: z.string(),
    title: z.string(),
    title1: z.string(),
    title2: z.string(),
    subtitle: z.string(),
    primaryCtaLabel: z.string(),
    primaryCtaHref: z.string(),
    supportingText: z.string(),
    highlights: z.array(z.string()),
});

const howItWorksStepSchema = z.object({
    id: z.number(),
    title: z.string(),
    description: z.string(),
});

const faqItemSchema = z.object({
    question: z.string(),
    answer: z.string(),
});

const finalCtaSchema = z.object({
    heading: z.string(),
    ctaLabel: z.string(),
    ctaHref: z.string(),
    supportingText: z.string().optional(),
});

const marketingCopySchema = z.object({
    hero: heroSchema,
    howItWorks: z.object({
        heading: z.string(),
        eyebrow: z.string(),
        steps: z.array(howItWorksStepSchema),
    }),
    faq: z.object({
        heading: z.string(),
        items: z.array(faqItemSchema),
    }),
    finalCta: finalCtaSchema,
});

// The fallback below sits outside the cached read, so a Contentful outage never stores
// DEFAULT_MARKETING_COPY. See docs/adr/0003-contentful-delivery-quota.md.
export async function getMarketingCopy(): Promise<MarketingCopy> {
    try {
        const entry = await getCopyConfig(COPY_PAGE_KEYS.LANDING);
        const fields = entry.fields as any;
        const rawConfig = fields.config ?? fields.marketingCopy ?? null;

        if (!rawConfig) {
            console.warn(
                "getMarketingCopy: entry missing `config`/`marketingCopy`, using defaults",
            );
            return DEFAULT_MARKETING_COPY;
        }

        const parsed = marketingCopySchema.safeParse(rawConfig);
        if (!parsed.success) {
            console.error("getMarketingCopy: invalid marketing config, using defaults", {
                issues: parsed.error.issues,
            });
            return DEFAULT_MARKETING_COPY;
        }

        return parsed.data as MarketingCopy;
    } catch (err) {
        console.error("getMarketingCopy: Contentful error, using defaults", err);
        return DEFAULT_MARKETING_COPY;
    }
}
