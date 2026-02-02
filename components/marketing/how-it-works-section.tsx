// components/marketing/how-it-works-section.tsx
import type { MarketingCopy } from "@/lib/marketing-copy";

type HowItWorksCopy = MarketingCopy["howItWorks"];

type Props = {
    copy: HowItWorksCopy;
};

export function HowItWorksSection({ copy }: Props) {
    return (
        <section id="how-it-works" className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl text-center">
                    {copy.heading}
                </h2>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 text-center">
                    {copy.eyebrow}
                </p>
            </div>

            <ol className="grid gap-4 sm:grid-cols-3">
                {copy.steps.map((step) => (
                    <li
                        key={step.id}
                        className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm"
                    >
                        <div className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                            {step.id}
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900">
                            {step.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-600">{step.description}</p>
                    </li>
                ))}
            </ol>
        </section>
    );
}
