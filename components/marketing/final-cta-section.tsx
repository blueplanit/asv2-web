import Link from "next/link";
import type { FinalCtaCopy } from "@/lib/marketing/marketing-copy";

type Props = {
    copy: FinalCtaCopy;
};

export function FinalCtaSection({ copy }: Props) {
    return (
        <section className="border-t border-slate-200 py-12 text-center">
            <div className="mx-auto max-w-6xl px-6">
                <h2 className="text-3xl leading-snug font-semibold">{copy.heading}</h2>
                {copy.supportingText ? <p className="mt-4 text-base leading-7 text-slate-600">{copy.supportingText}</p> : null}
                <div className="mt-6 flex flex-col justify-center gap-3 min-[701px]:flex-row">
                    <Link href={copy.ctaHref} className="inline-flex min-h-12 items-center justify-center rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600">{copy.ctaLabel}</Link>
                    <Link href="/sample-sheet" className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600">View Sample Sheet</Link>
                </div>
                <Link href="/how-it-works" className="mt-5 inline-block text-sm font-semibold text-indigo-600 underline underline-offset-4 hover:text-indigo-800">Questions about setup? See how it works.</Link>
            </div>
        </section>
    );
}
