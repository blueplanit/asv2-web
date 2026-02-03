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
    "hero": {
        "title": "Simple pricing for automated Stripe → Sheets sync.",
        "freeTrialText": "Free 14-day trial after sign in and setup.",
        "secondaryText": "No long-term contracts. Cancel anytime.",
        "freeTrialLinkHref": "/login"
    },
    "plan": {
        "name": "Pro",
        "bullets": [
            "1 Stripe account synced to Google Sheets",
            "Automated backfill + 1 hour sync cadence",
            "Sync invoices and line items, charges, customers, payouts, subscriptions, payment intents, disputes",
            "Priority email support"
        ],
        "badgeLabel": "Recommended",
        "description": "For teams that rely on accurate Stripe data in Sheets every day.",
        "checkoutNote": "You’ll be redirected to a secure Stripe-hosted payment page to checkout."
    },
    "toggle": {
        "yearlyLabel": "Annual",
        "monthlyLabel": "Monthly",
        "yearlySavingsTag": "Save 3 months"
    },
    "included": {
        "faqs": [
            {
                "answer": "Core Stripe data (invoices + line items, charges, customers, payouts, subscriptions, payment intents, and disputes) are synced into structured “raw” tabs so you can build reports based on product, fees, revenue and more.",
                "question": "What Stripe data can SyncStaq bring into Google Sheets?"
            },
            {
                "answer": "No. We only read data via the Stripe API and write into your Sheets.",
                "question": "Does this change anything in my Stripe account?"
            },
            {
                "answer": "No. SyncStaq only updates the dedicated, protected 'raw' tabs; your formulas, dashboards, and models in other 'working' tabs stay untouched.",
                "question": "Will SyncStaq overwrite my existing formulas or reports in the sheet?"
            },
            {
                "answer": "Your Stripe → Sheets sync will stop running until you choose a paid plan.",
                "question": "What happens when my free trial ends?"
            },
            {
                "answer": "Yes, you can cancel anytime before your next billing period to avoid future charges. If you’ve already been billed, refunds are available within 14 days",
                "question": "Can I cancel or get a refund if SyncStaq isn’t a fit?"
            }
        ],
        "title": "What’s included",
        "bullets": [
            "One-way sync from Stripe to your Google Sheet every hour.",
            "No more exporting CSVs from the Stripe dashboard.",
            "Privacy-first: we only access Google Sheets created in the app."
        ],
        "faqTitle": "FAQ"
    },
    "snackbar": {
        "title": "You’re signed in with Google",
        "description": "You can now continue to checkout."
    },
    "ctaLabels": {
        "signedInIdle": "Continue to checkout",
        "signedOutIdle": "Sign in to checkout",
        "signedInLoading": "Redirecting to secure checkout…",
        "signedOutLoading": "Opening secure sign-in…"
    }
};

export async function getPricingCopy(): Promise<PricingCopy> {
    try {
        const res = await contentfulClient.getEntries({
            content_type: "aSv2CopyAndConfig",
            limit: 1,
            "fields.pageKey": "pricing",
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
