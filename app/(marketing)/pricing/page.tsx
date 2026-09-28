// app/pricing/page.tsx
import { PricingClient } from "@/components/pricing/pricing-client";
import { getPricingCopy } from "@/lib/pricing/pricing-config";
import { createMarketingMetadata } from "@/lib/marketing/seo-metadata";
import type { BillingDisplayResult } from "@/lib/pricing/get-billing-display";
import { AppStructuredData } from "@/components/marketing/structured-data";

export const metadata = createMarketingMetadata({
    title: "Pricing — Stripe to Google Sheets Sync | SyncStaq",
    description:
        "Simple pricing for automated Stripe to Google Sheets sync. Hourly refresh, 6 months of backfill, read-only access, and a 14-day free trial. Cancel anytime.",
    path: "/pricing",
});

// The HTML carries the price, so a Promotion Code that ends at Stripe stays visible until
// the next rebuild. 10 minutes bounds that. See ADR-0003 decision 5.
export const dynamic = "force-static";
export const revalidate = 600;

export default async function PricingPage() {
    const pricingCopy = await getPricingCopy();
    let initialPricing: BillingDisplayResult | null = null;
    try {
        const { getBillingDisplay } = await import("@/lib/pricing/get-billing-display");
        initialPricing = await getBillingDisplay();
    } catch {
        console.error("PricingPage: current pricing unavailable; browser will retry");
    }

    return <>
        <AppStructuredData pricing={initialPricing} />
        <PricingClient copy={pricingCopy} initialPricing={initialPricing} />
    </>;
}
