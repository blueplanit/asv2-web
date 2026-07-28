// app/pricing/page.tsx
import { PricingClient } from "@/components/pricing/pricing-client";
import { getPricingCopy } from "@/lib/pricing/pricing-config";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createMarketingMetadata } from "@/lib/marketing/seo-metadata";

export const metadata = createMarketingMetadata({
    title: "Pricing — Stripe to Google Sheets Sync | SyncStaq",
    description:
        "Simple pricing for automated Stripe to Google Sheets sync. Hourly refresh, 6 months of backfill, read-only access, and a 14-day free trial. Cancel anytime.",
    path: "/pricing",
});

export const revalidate = 60;

export default async function PricingPage() {
    const session = await getServerSession(authOptions);
    const isLoggedIn = !!session?.user;

    const pricingCopy = await getPricingCopy();

    return <PricingClient isLoggedIn={isLoggedIn} copy={pricingCopy} />;
}
