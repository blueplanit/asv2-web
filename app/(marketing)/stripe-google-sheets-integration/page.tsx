import { HighIntentLandingPage } from "@/components/marketing/high-intent-landing-page";
import { createMarketingMetadata } from "@/lib/marketing/seo-metadata";

const sampleSheetUrl =
    "https://docs.google.com/spreadsheets/d/1f4A9fwCsRk8Hsu_OJ2NjwfbfAmup6BQFuvDpDwmc7ZE/view?usp=sharing";

export const metadata = createMarketingMetadata({
    title: "Stripe Google Sheets Integration | SyncStaq",
    description:
        "Connect Stripe to Google Sheets with SyncStaq. Backfill recent Stripe billing history and keep structured raw tabs updated hourly for reporting.",
    path: "/stripe-google-sheets-integration",
});

export default function StripeGoogleSheetsIntegrationPage() {
    return (
        <HighIntentLandingPage
            eyebrow="Stripe Google Sheets integration"
            title="Connect Stripe to Google Sheets for recurring billing reports."
            primaryCta={{ href: "/pricing", label: "Start 14-day free trial" }}
            secondaryCta={{ href: sampleSheetUrl, label: "View sample Sheet", external: true }}
            heroDetails={[
                { label: "Read-only", text: "Stripe access" },
                { label: "App-created", text: "Google Sheet" },
                { label: "Hourly", text: "updates" },
            ]}
            visualTitle="Stripe billing data in Google Sheets"
            visualSubtitle="A structured Sheet for reporting, reconciliation, and analysis."
            visualRows={[
                {
                    title: "Stripe",
                    body: "Invoices, line items, charges, customers, subscriptions, payouts, and disputes.",
                    pill: "Read-only",
                },
                {
                    title: "SyncStaq",
                    body: "Backfills recent history and keeps raw tabs updated hourly.",
                    pill: "Sync",
                },
                {
                    title: "Google Sheets",
                    body: "Use formulas, pivots, charts, and dashboards on your Working Sheet.",
                    pill: "Updated",
                },
            ]}
            summary="SyncStaq gives your team a Stripe-to-Google-Sheets integration designed for billing data. Create a dedicated Sheet, backfill recent history, and keep structured raw tabs updated hourly without building a custom row-copy automation."
            cards={[
                {
                    title: "Built for Stripe billing",
                    body: "Sync invoices, line items, charges, customers, subscriptions, payouts, and disputes into a Sheet structure built for reporting.",
                },
                {
                    title: "Not a generic row copy",
                    body: "Avoid wiring individual Stripe triggers into separate rows and then rebuilding the reporting model yourself.",
                },
                {
                    title: "Sheets stay flexible",
                    body: "Use the synced raw tabs as the stable source for formulas, pivots, charts, analysis, and team reporting.",
                },
            ]}
            relatedLinks={[
                { href: "/stripe-csv-export-alternative", label: "Stripe CSV export alternative" },
                { href: "/blog", label: "SyncStaq blog" },
                { href: "/pricing", label: "Pricing" },
            ]}
        />
    );
}
