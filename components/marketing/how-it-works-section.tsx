// components/marketing/how-it-works-section.tsx

import { marketingCopy } from "@/lib/marketing-copy";

export function HowItWorksSection() {
    const { howItWorks } = marketingCopy;

    return (
        <section
            aria-labelledby="how-it-works-heading"
            className="space-y-6 border-t border-slate-100 pt-10"
        >
            <div className="space-y-2 max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {howItWorks.eyebrow}
                </p>
                <h2
                    id="how-it-works-heading"
                    className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl"
                >
                    {howItWorks.heading}
                </h2>

            </div>

            <ol className="grid gap-4 md:grid-cols-3">
                {howItWorks.steps.map((step, index) => (
                    <li
                        key={step.id}
                        className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] text-white">
                                {index + 1}
                            </span>
                            <span>Step {index + 1}</span>
                        </div>
                        <h3 className="mt-3 text-sm font-semibold text-slate-900">{step.title}</h3>
                        <p className="mt-2 text-sm text-slate-600">{step.description}</p>
                    </li>
                ))}
            </ol>
        </section>
    );
}
