// lib/pricing-config.ts
import "server-only";
import { z } from "zod";
import { contentfulClient } from "./contentful";

const pricingCopySchema = z.object({
    hero: z.object({
        title: z.string(),
        secondaryText: z.string(),
        freeTrialLinkHref: z.string(),
        freeTrialText: z.string(),
    }),
    toggle: z.object({
        monthlyLabel: z.string(),
        yearlyLabel: z.string(),
        yearlySavingsTag: z.string(),
    }),
    plan: z.object({
        badgeLabel: z.string(),
        name: z.string(),
        description: z.string(),
        bullets: z.array(z.string()),
        checkoutNote: z.string(),
    }),
    included: z.object({
        title: z.string(),
        bullets: z.array(z.string()),
        faqTitle: z.string(),
        faqs: z.array(
            z.object({
                question: z.string(),
                answer: z.string(),
            }),
        ),
    }),
    snackbar: z.object({
        title: z.string(),
        description: z.string(),
    }),
    ctaLabels: z.object({
        signedInIdle: z.string(),
        signedInLoading: z.string(),
        signedOutIdle: z.string(),
        signedOutLoading: z.string(),
    }),
});

export type PricingCopy = z.infer<typeof pricingCopySchema>;

// Fallback if Contentful is unavailable/invalid
export const DEFAULT_PRICING_COPY: PricingCopy = {
    hero: {
        title: "Simple pricing for automated Stripe → Sheets sync.",
        secondaryText: "No long-term contracts. Cancel anytime.",
        freeTrialLinkHref: "/login",
        freeTrialText: "Free 14-day trial after sign in and setup.",
    },
    toggle: {
        monthlyLabel: "Monthly",
        yearlyLabel: "Annual",
        yearlySavingsTag: "Save 3.5 months",
    },
    plan: {
        badgeLabel: "Recommended",
        name: "Pro",
        description: "For teams that rely on accurate Stripe data in Sheets every day.",
        bullets: [
            "1 Stripe account synced to Sheets",
            "Automated backfill + 30-minute sync cadence",
            "Invoices, charges, customers, payouts, subscriptions",
            "Priority email support",
        ],
        checkoutNote:
            "You’ll be redirected to a secure Stripe-hosted payment page to checkout.",
    },
    included: {
        title: "What’s included",
        bullets: [
            "Unlimited sync runs during your trial",
            "Drive ownership stays with your Google account",
            "Safe to use with existing analysis / working tabs",
        ],
        faqTitle: "FAQ",
        faqs: [
            {
                question: "Can I cancel during my trial?",
                answer: "Yes. Cancel before your 14 days are up and you won’t be charged.",
            },
            {
                question: "Does this change anything in my Stripe account?",
                answer:
                    "No. We only read data via the Stripe API and write into your Sheets.",
            },
        ],
    },
    snackbar: {
        title: "You’re signed in with Google",
        description: "You can now continue to checkout.",
    },
    ctaLabels: {
        signedInIdle: "Continue to checkout",
        signedInLoading: "Redirecting to secure checkout…",
        signedOutIdle: "Sign in to checkout",
        signedOutLoading: "Opening secure sign-in…",
    },
};

export async function getPricingCopy(): Promise<PricingCopy> {
    try {
        const res = await contentfulClient.getEntries({
            content_type: "pricingPageASv2",
            limit: 1,
        });

        if (!res.items.length) {
            console.warn("getPricingCopy: no pricing entries, using defaults");
            return DEFAULT_PRICING_COPY;
        }

        const fields = res.items[0].fields as any;
        const rawConfig = fields.config ?? fields.pricingCopy ?? null;

        if (!rawConfig) {
            console.warn(
                "getPricingCopy: pricing entry missing `config`/`pricingCopy`, using defaults",
            );
            return DEFAULT_PRICING_COPY;
        }

        const parsed = pricingCopySchema.safeParse(rawConfig);
        if (!parsed.success) {
            console.error("getPricingCopy: invalid pricing config, using defaults", {
                issues: parsed.error.issues,
            });
            return DEFAULT_PRICING_COPY;
        }

        return parsed.data;
    } catch (err) {
        console.error("getPricingCopy: Contentful error, using defaults", err);
        return DEFAULT_PRICING_COPY;
    }
}
