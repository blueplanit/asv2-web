// components/marketing/faq-section.tsx

import { marketingCopy } from "@/lib/marketing/marketing-copy";

export function FaqSection() {
    const { faq } = marketingCopy;

    return (
        <section
            aria-labelledby="faq-heading"
            className="space-y-6 border-t border-slate-100 pt-10"
        >
            <div className="space-y-2 max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    FAQ
                </p>
                <h2
                    id="faq-heading"
                    className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl"
                >
                    {faq.heading}
                </h2>
                <p className="text-sm text-slate-600">
                    A few of the questions that come up most often when teams move away from manual
                    Stripe exports.
                </p>
            </div>

            <dl className="space-y-4">
                {faq.items.map((item) => (
                    <div
                        key={item.question}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                        <dt className="text-sm font-semibold text-slate-900">{item.question}</dt>
                        <dd className="mt-2 text-sm text-slate-600">{item.answer}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
