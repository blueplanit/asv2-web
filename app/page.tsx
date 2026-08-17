// app/page.tsx

import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { Hero } from "@/components/marketing/hero";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { FinalCtaSection } from "@/components/marketing/final-cta-section";
import { getMarketingCopy } from "@/lib/marketing/marketing-config";
import { STRIPE_MARKETPLACE_URL } from "@/lib/constants";
import Link from "next/link";

export const metadata: Metadata = {
    alternates: {
        canonical: "/",
    },
};

// The Backstop Window. A Contentful webhook expires the landing Copy Config when it changes.
// See docs/adr/0003-contentful-delivery-quota.md.
export const dynamic = "force-static";
export const revalidate = 604800; // BACKSTOP_WINDOW_SECONDS

export default async function HomePage() {
    const copy = await getMarketingCopy();

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900">
            <SiteHeader variant="public" />

            <main className="mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-16 pt-12 lg:pt-16">
                <Hero copy={copy.hero} />
                <div className="mt-4">
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200/70 to-transparent" />
                </div>
                <HowItWorksSection copy={copy.howItWorks} />
                <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Link
                        href="/stripe-google-sheets-integration"
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
                    >
                        <h2 className="text-base font-semibold text-slate-950">
                            Stripe Google Sheets integration
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                            Connect Stripe to Google Sheets for recurring billing reports, reconciliation,
                            and spreadsheet analysis.
                        </p>
                    </Link>
                    <Link
                        href="/stripe-csv-export-alternative"
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
                    >
                        <h2 className="text-base font-semibold text-slate-950">
                            Stripe CSV export alternative
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                            Keep Stripe billing data synced in Sheets instead of rebuilding recurring
                            reports from exports.
                        </p>
                    </Link>
                    <a
                        href={STRIPE_MARKETPLACE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
                    >
                        <h2 className="text-base font-semibold text-slate-950">
                            Stripe App Marketplace
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                            Monitor your sync status directly from Stripe, with a quick link to your
                            SyncStaq dashboard.
                        </p>
                    </a>
                </section>
                {/* FaqSection could take copy.faq the same way */}
                <FinalCtaSection copy={copy.finalCta} />
            </main>
        </div>
    );
}
