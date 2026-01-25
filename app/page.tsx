// app/page.tsx

import { SiteHeader } from "@/components/layout/site-header";
import { Hero } from "@/components/marketing/hero";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { FinalCtaSection } from "@/components/marketing/final-cta-section";

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900">
            <SiteHeader variant="public" />

            <main className="mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-16 pt-12 lg:pt-16">
                <Hero />
                <HowItWorksSection />
                {/* <FaqSection /> */}
                <FinalCtaSection />
            </main>
        </div>
    );
}
