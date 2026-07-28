import { HighIntentLandingPage } from "@/components/marketing/high-intent-landing-page";
import { createMarketingMetadata } from "@/lib/marketing/seo-metadata";

const sampleSheetUrl =
    "https://docs.google.com/spreadsheets/d/1f4A9fwCsRk8Hsu_OJ2NjwfbfAmup6BQFuvDpDwmc7ZE/view?usp=sharing";

export const metadata = createMarketingMetadata({
    title: "Stripe CSV Export Alternative | SyncStaq",
    description:
        "Use SyncStaq as a Stripe CSV export alternative for recurring Google Sheets reporting. Keep Stripe billing data synced instead of rebuilding exports.",
    path: "/stripe-csv-export-alternative",
});

export default function StripeCsvExportAlternativePage() {
    return (
        <HighIntentLandingPage
            eyebrow="Stripe CSV export alternative"
            title="Stop rebuilding Stripe reports from CSV exports."
            primaryCta={{ href: "/pricing", label: "Replace CSV exports" }}
            secondaryCta={{ href: sampleSheetUrl, label: "See the sample Sheet", external: true }}
            heroDetails={[
                { label: "6-month", text: "first backfill" },
                { label: "Hourly", text: "updates after setup" },
                { label: "Works in", text: "Google Sheets" },
            ]}
            visualTitle="From export cleanup to synced Stripe data"
            visualSubtitle="Keep the spreadsheet workflow without repeating the CSV cycle."
            visualRows={[
                {
                    title: "Manual CSV loop",
                    body: "Export from Stripe, upload to Sheets, clean columns, fix formulas, repeat when details change.",
                    pill: "Repeated",
                },
                {
                    title: "Synced Sheet workflow",
                    body: "Work from structured Stripe data that SyncStaq writes into raw tabs and keeps updated hourly.",
                    pill: "Automated",
                },
            ]}
            summary="Stripe CSV exports are fine for one-off questions. SyncStaq is for teams that need Stripe billing data in Google Sheets every week without export, import, cleanup, and formula repair."
            cards={[
                {
                    title: "When CSVs break down",
                    body: "Recurring reports need current data. One-off exports become messy once invoices, subscriptions, refunds, and payouts keep changing.",
                },
                {
                    title: "Keep the spreadsheet workflow",
                    body: "SyncStaq does not replace Sheets. It gets Stripe data there so your team can keep using the spreadsheet workflows they already know.",
                },
                {
                    title: "Lower maintenance than scripts",
                    body: "No custom API keys, scheduled jobs, browser export automation, or sheet-writing code to own.",
                },
            ]}
            relatedLinks={[
                { href: "/stripe-google-sheets-integration", label: "Stripe Google Sheets integration" },
                { href: "/blog", label: "SyncStaq blog" },
                { href: "/pricing", label: "Pricing" },
            ]}
        />
    );
}
