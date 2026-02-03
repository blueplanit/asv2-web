// lib/marketing-copy.ts
import { APP_NAME } from "./constants";

export interface HeroCopy {
    eyebrow: string;
    title: string;
    title1: string;
    title2: string;
    subtitle: string;
    primaryCtaLabel: string;
    primaryCtaHref: string;
    supportingText: string;
    highlights: string[];
}

export interface HowItWorksStep {
    id: number;
    title: string;
    description: string;
}

export interface FaqItem {
    question: string;
    answer: string;
}

export interface FinalCtaCopy {
    heading: string;
    ctaLabel: string;
    ctaHref: string;
    supportingText?: string;
}

export interface MarketingCopy {
    productName: string;
    hero: HeroCopy;
    howItWorks: {
        heading: string;
        eyebrow: string;
        steps: HowItWorksStep[];
    };
    faq: {
        heading: string;
        items: FaqItem[];
    };
    finalCta: FinalCtaCopy;
}

// Default / fallback copy baked into the app
export const DEFAULT_MARKETING_COPY: MarketingCopy = {
    productName: APP_NAME,
    hero: {
        eyebrow: "Stripe → Google Sheets, continuously",
        title: "Sync Stripe data into Google Sheets without exporting another CSV.",
        title1: "Your Stripe data,",
        title2: "already in Google Sheets.",
        subtitle: `${APP_NAME} keeps your Stripe data flowing into a structured Google Sheet, so revenue ops, founders, and technical leads can answer real questions, not fight with exports and stale files.`,
        primaryCtaLabel: "Get started",
        primaryCtaHref: "/login",
        supportingText: "Sign in with Google. No credit card required.",
        highlights: [
            "Never export another CSV from Stripe.",
            "Keep one source of truth in Google Sheets.",
            "Built for revenue ops and Stripe-powered teams.",
        ],
    },
    howItWorks: {
        eyebrow: "How it works",
        heading: "Connect Stripe once. Your sheet stays fresh.",
        steps: [
            {
                id: 1,
                title: "Connect Stripe and Google",
                description:
                    "Sign in with Google, connect your Stripe account via OAuth, and create a Google Sheet in your drive. No scripts, no add-ons, no code.",
            },
            {
                id: 2,
                title: `${APP_NAME} creates a structured workspace`,
                description: `${APP_NAME} sets up protected sheet tabs for your Stripe's raw data and backfills recent history, so you start from a clean, reliable dataset.`,
            },
            {
                id: 3,
                title: `Build reports while ${APP_NAME} keeps data current`,
                description: `Use your own formulas, pivot tables, and charts on a dedicated Working tab. ${APP_NAME} keeps the raw tabs synced with Stripe in the background.`,
            },
        ],
    },
    faq: {
        heading: "Frequently asked questions",
        items: [
            {
                question: "Why not just keep exporting CSVs from Stripe?",
                answer: `Manual exports work until they don’t. They cost time, are easy to forget, and make it hard to handle late payments or updated records without redoing your work. ${APP_NAME} removes the export step and keeps one sheet current.`,
            },
            {
                question: `How often does ${APP_NAME} update my sheet?`,
                answer: `${APP_NAME} runs on a regular background schedule so new or updated Stripe data appears in your sheet automatically. You work in Sheets; the sync keeps Stripe and your raw tabs aligned.`,
            },
            {
                question: `Does ${APP_NAME} support tools beyond Google Sheets?`,
                answer: `Today ${APP_NAME} writes to Google Sheets as the primary destination. The underlying data model is designed so additional destinations like data warehouses or other spreadsheet tools can be added over time.`,
            },
            {
                question:
                    "Can I combine Stripe data with Salesforce, Airtable, or other sources?",
                answer: `Yes. ${APP_NAME} keeps Stripe data fresh in structured raw tabs. From there, you can join it with Salesforce, Airtable, or other sources using formulas, query functions, or your existing integrations.`,
            },
        ],
    },
    finalCta: {
        heading: "Ready to stop exporting CSVs from Stripe?",
        ctaLabel: "Sign in with Google",
        ctaHref: "/login",
        supportingText:
            "Connect Stripe and start syncing in minutes. No credit card required. 🚀",
    },
};

// Keep old name if anything else relies on it (optional)
export const marketingCopy = DEFAULT_MARKETING_COPY;
