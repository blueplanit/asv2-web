// components/marketing/hero.tsx
import Link from "next/link";
import type { HeroCopy } from "@/lib/marketing-copy";
import { SpreadsheetMockup } from "./spreadsheet-mockup";

type HeroProps = {
    copy: HeroCopy;
};

export function Hero({ copy }: HeroProps) {
    return (
        <section
            aria-labelledby="hero-heading"
            className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16"
        >
            {/* LEFT */}
            <div className="max-w-xl">

                {/* Title + subtitle */}
                <div className="mt-6 space-y-4">
                    <h1
                        id="hero-heading"
                        className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl"
                    >
                        <div>
                            {copy.title}
                        </div>
                        <div>
                            {copy.title1}
                        </div>
                        <div>
                            {copy.title2}
                        </div>
                    </h1>
                    <p className="max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
                        {copy.subtitle}
                    </p>
                </div>

                {/* CTA + trust ticks */}
                <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                    <Link
                        href={copy.primaryCtaHref}
                        className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                    >
                        {copy.primaryCtaLabel}
                    </Link>
                </div>

                {/* Highlights (lighter, less “listy”) */}
                <div className="mt-8">
                    <div className="flex flex-col gap-2 text-sm text-slate-600">
                        {copy.highlights.map((item) => (
                            <div key={item} className="flex items-start gap-3">
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                                    ✓
                                </span>
                                <span className="leading-relaxed">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT */}
            <SpreadsheetMockup />
        </section>
    );
}
