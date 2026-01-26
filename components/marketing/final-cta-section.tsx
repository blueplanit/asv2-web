// components/marketing/final-cta-section.tsx
import Link from "next/link";
import type { FinalCtaCopy } from "@/lib/marketing-copy";

type Props = {
    copy: FinalCtaCopy;
};

export function FinalCtaSection({ copy }: Props) {
    return (
        <section className="border-t border-slate-100 pt-10 pb-6">
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                    {copy.heading}
                </h2>
                {copy.supportingText ? (
                    <p className="text-sm text-slate-600">{copy.supportingText}</p>
                ) : null}
                <Link
                    href={copy.ctaHref}
                    className="mt-1 inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                >
                    {copy.ctaLabel} →
                </Link>
            </div>
        </section>
    );
}
