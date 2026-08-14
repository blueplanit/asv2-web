// app/pricing/page.tsx
import { PricingClient } from "@/components/pricing/pricing-client";
import { getPricingCopy } from "@/lib/pricing/pricing-config";
import { createMarketingMetadata } from "@/lib/marketing/seo-metadata";

export const metadata = createMarketingMetadata({
    title: "Pricing — Stripe to Google Sheets Sync | SyncStaq",
    description:
        "Simple pricing for automated Stripe to Google Sheets sync. Hourly refresh, 6 months of backfill, read-only access, and a 14-day free trial. Cancel anytime.",
    path: "/pricing",
});

// PricingClient reads the session in the browser, so this page stays static.
// force-static holds that: a server-side session read here fails the build.
export const dynamic = "force-static";
export const revalidate = 604800; // BACKSTOP_WINDOW_SECONDS

export default async function PricingPage() {
    const pricingCopy = await getPricingCopy();

    return <PricingClient copy={pricingCopy} />;
}
