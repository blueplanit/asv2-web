import type { Metadata } from "next";
import { Hero } from "@/components/marketing/hero";
import { FinalCtaSection } from "@/components/marketing/final-cta-section";
import { getMarketingCopy } from "@/lib/marketing/marketing-config";
import { SiteStructuredData } from "@/components/marketing/structured-data";

export const metadata: Metadata = {
    alternates: { canonical: "/" },
};

// Keep the Contentful cache backstop and webhook invalidation behavior.
export const dynamic = "force-static";
export const revalidate = 604800;

const workflows = [
    {
        title: "Recurring revenue reports",
        description: "Work with invoice and product data without repeating the export-and-import cycle.",
    },
    {
        title: "Fees, refunds, and payout review",
        description: "Keep the billing records you reference available alongside your reconciliation work.",
    },
    {
        title: "Your labels and calculations",
        description: "Build your own formulas, pivots, and product labels in the Working Sheet.",
    },
];

export default async function HomePage() {
    const copy = await getMarketingCopy();

    return (
        <main className="bg-white text-slate-950">
            <SiteStructuredData />
            <Hero copy={{
                ...copy.hero,
                // Pin the reviewed homepage wording; retain CMS-backed title and highlights fields.
                subtitle: "Stop rebuilding reports from CSV exports. Keep Stripe billing data in Sheets for reporting, reconciliation, and product labeling.",
                primaryCtaLabel: "Start 14-day free trial",
                primaryCtaHref: "/pricing",
            }} />
            <section className="mx-auto max-w-6xl px-6 py-10 min-[701px]:py-14">
                <h2 className="text-3xl leading-snug font-semibold">For teams that keep coming back to Stripe exports.</h2>
                <p className="mt-4 mb-8 max-w-[700px] text-base leading-7 text-slate-600">If billing reports and reviews happen in Google Sheets, start with connected data instead of another download.</p>
                <div className="grid gap-7 min-[701px]:grid-cols-3 min-[701px]:gap-8">
                    {workflows.map((workflow) => (
                        <div key={workflow.title} className="border-t-2 border-slate-200 pt-5">
                            <h3 className="text-xl leading-snug font-semibold">{workflow.title}</h3>
                            <p className="mt-3 text-base leading-7 text-slate-600">{workflow.description}</p>
                        </div>
                    ))}
                </div>
            </section>
            <FinalCtaSection copy={{
                heading: "Stop exporting. Start working with your data.",
                supportingText: "Connect your Stripe account and create your own synced Google Sheet.",
                ctaLabel: "Start 14-day free trial",
                ctaHref: "/pricing",
            }} />
        </main>
    );
}
