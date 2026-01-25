// components/marketing/hero.tsx

import Link from "next/link";
import { marketingCopy } from "@/lib/marketing-copy";

export function Hero() {
    const { hero, productName } = marketingCopy;

    return (
        <section
            aria-labelledby="hero-heading"
            className="flex flex-col gap-12 lg:flex-row lg:items-center lg:justify-between lg:gap-16"
        >
            <div className="max-w-xl space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>{hero.eyebrow}</span>
                </div>

                <div className="space-y-4">
                    <h1
                        id="hero-heading"
                        className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl"
                    >
                        {hero.title}
                    </h1>
                    <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
                        {hero.subtitle}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Link
                        href={hero.primaryCtaHref}
                        className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                    >
                        {hero.primaryCtaLabel} →
                    </Link>
                    <span className="text-xs text-slate-500">{hero.supportingText} 🚀</span>
                </div>

                <ul className="space-y-1.5 text-xs text-slate-600 sm:text-sm">
                    {hero.highlights.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-300" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="w-full max-w-md">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                        <span className="font-medium text-slate-900">Workspace preview</span>
                        <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                            Demo
                        </span>
                    </div>

                    <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between text-xs text-slate-700">
                            <span className="font-medium text-slate-900">
                                Stripe sync – Demo workspace
                            </span>
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                                <span className="mr-1 inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                Healthy
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600">
                            <div className="rounded-lg border border-slate-200 bg-white p-2">
                                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                                    Invoices
                                </p>
                                <p className="mt-1 text-sm font-medium text-slate-900">1,532</p>
                                <p className="mt-0.5 text-[10px] text-slate-500">Live from Stripe</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-2">
                                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                                    Customers
                                </p>
                                <p className="mt-1 text-sm font-medium text-slate-900">384</p>
                                <p className="mt-0.5 text-[10px] text-slate-500">Updated hourly</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-2">
                                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                                    Last sync
                                </p>
                                <p className="mt-1 text-sm font-medium text-slate-900">Just now</p>
                                <p className="mt-0.5 text-[10px] text-emerald-700">On schedule</p>
                            </div>
                        </div>

                        {/* <div className="mt-2 space-y-2 rounded-xl border border-dashed border-slate-200 bg-white p-3">
                            <div className="flex items-center justify-between">
                                <p className="text-[11px] font-medium text-slate-900">
                                    Structured tabs for Stripe data
                                </p>
                                <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-slate-500">
                                    invoices_raw · charges_raw · customers_raw
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-600">
                                {productName} maintains protected raw tabs for Stripe objects and a Working
                                tab for your own models. You never overwrite incoming data; your formulas
                                stay safe.
                            </p>
                        </div> */}

                        <div className="rounded-xl border border-slate-200 bg-slate-900 px-3 py-3 text-[11px] text-slate-50">
                            <p className="font-medium">
                                “Never export another CSV from Stripe. Open the sheet and your numbers are
                                already there.”
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
