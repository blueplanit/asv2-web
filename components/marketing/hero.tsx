import Image from "next/image";
import Link from "next/link";
import type { HeroCopy } from "@/lib/marketing/marketing-copy";

type HeroProps = {
    copy: HeroCopy;
};

export function Hero({ copy }: HeroProps) {
    return (
        <>
            <section aria-labelledby="hero-heading" className="bg-slate-50 pt-8 pb-7 text-center min-[701px]:pt-12">
                <div className="mx-auto max-w-6xl px-6">
                    <h1 id="hero-heading" className="mx-auto max-w-[760px] text-[34px] leading-[1.15] font-semibold min-[701px]:text-[46px]">
                        {copy.title ? <span className="block">{copy.title}</span> : null}
                        {copy.title1 ? <span className="block">{copy.title1}</span> : null}
                        {copy.title2 ? <span className="block">{copy.title2}</span> : null}
                    </h1>
                    <p className="mx-auto mt-5 mb-6 max-w-[690px] text-lg leading-8 text-slate-600">{copy.subtitle}</p>
                    <div className="flex flex-col justify-center gap-3 min-[701px]:flex-row">
                        <Link href={copy.primaryCtaHref} className="inline-flex min-h-12 items-center justify-center rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600">
                            {copy.primaryCtaLabel}
                        </Link>
                        <Link href="/sample-sheet" className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600">
                            View Sample Sheet
                        </Link>
                    </div>
                    <ul className="mt-7 grid grid-cols-2 gap-4 text-left text-sm text-slate-600 min-[701px]:flex min-[701px]:flex-wrap min-[701px]:justify-center min-[701px]:gap-7">
                        {copy.highlights.map((item) => <li key={item} className="border-l-[3px] border-emerald-600 pl-3">{item}</li>)}
                    </ul>
                </div>
            </section>
            <section aria-label="Sample product output" className="bg-slate-50 pb-11">
                <figure className="mx-auto max-w-6xl px-6">
                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-3 text-sm min-[701px]:flex-row min-[701px]:items-center min-[701px]:justify-between min-[701px]:gap-4 min-[701px]:px-5">
                            <strong>Stripe billing data, organized in Sheets</strong>
                            <Link href="/sample-sheet" className="font-semibold text-indigo-600 underline underline-offset-4 hover:text-indigo-800">Explore the Sample Sheet</Link>
                        </div>
                        <div tabIndex={0} role="region" aria-label="Example Stripe charge records" className="max-h-[300px] overflow-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-indigo-600">
                            <Image src="/images/how-it-works/sample-charges.jpg" width={1280} height={720} unoptimized alt="Public SyncStaq Sample Sheet with example charge records, customer references, and separate billing data tabs." className="block h-auto w-[1000px] max-w-none min-[701px]:w-full" />
                        </div>
                    </div>
                    <figcaption className="mt-3 text-sm leading-6 text-slate-600">Public Sample Sheet with example data. Your connected Sheet contains data from your own Stripe account.</figcaption>
                </figure>
            </section>
        </>
    );
}
