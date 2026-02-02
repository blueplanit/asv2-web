// app/page.tsx

import { SiteHeader } from "@/components/layout/site-header";
import { Hero } from "@/components/marketing/hero";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { FinalCtaSection } from "@/components/marketing/final-cta-section";
import { getMarketingCopy } from "@/lib/marketing-config";

export const revalidate = 60;

export default async function HomePage() {
    const copy = await getMarketingCopy();

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900">
            <SiteHeader variant="public" />

            <main className="mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-16 pt-12 lg:pt-16">
                <Hero copy={copy.hero} />
                <div className="mt-10">
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200/70 to-transparent" />
                </div>
                <HowItWorksSection copy={copy.howItWorks} />
                {/* FaqSection could take copy.faq the same way */}
                <FinalCtaSection copy={copy.finalCta} />
            </main>
        </div>
    );
}
