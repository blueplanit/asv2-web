import { APP_NAME, SITE_URL } from "@/lib/constants";
import type { BillingDisplayResult } from "@/lib/pricing/get-billing-display";

export function StructuredData({ data }: { data: Record<string, unknown> }) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
        />
    );
}

export function SiteStructuredData() {
    return <StructuredData data={{
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "@id": `${SITE_URL}/#organization`,
                name: APP_NAME,
                url: SITE_URL,
                sameAs: ["https://www.youtube.com/@SyncStaq"],
            },
            {
                "@type": "WebSite",
                "@id": `${SITE_URL}/#website`,
                name: APP_NAME,
                url: SITE_URL,
                publisher: { "@id": `${SITE_URL}/#organization` },
            },
        ],
    }} />;
}

export function AppStructuredData({ pricing }: { pricing: BillingDisplayResult | null }) {
    return <StructuredData data={{
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#application`,
        name: APP_NAME,
        url: SITE_URL,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web browser",
        description: "Keep Stripe billing data in Google Sheets for reporting, reconciliation, and analysis without repeated CSV exports or custom scripts.",
        publisher: { "@id": `${SITE_URL}/#organization` },
        ...(pricing ? {
            offers: (["monthly", "yearly"] as const).map((interval) => ({
                "@type": "Offer",
                name: `Pro ${interval}`,
                url: `${SITE_URL}/pricing`,
                price: pricing.offerAmounts[interval].amount,
                priceCurrency: pricing.offerAmounts[interval].currency,
                priceSpecification: {
                    "@type": "UnitPriceSpecification",
                    price: pricing.offerAmounts[interval].amount,
                    priceCurrency: pricing.offerAmounts[interval].currency,
                    billingDuration: interval === "monthly" ? "P1M" : "P1Y",
                },
            })),
        } : {}),
    }} />;
}
