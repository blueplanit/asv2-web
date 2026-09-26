import Image from "next/image";
import Link from "next/link";
import { createMarketingMetadata } from "@/lib/marketing/seo-metadata";

export const metadata = createMarketingMetadata({
    title: "Sample Sheet: Stripe Data in Google Sheets | SyncStaq",
    description:
        "Explore a public sample Google Sheet showing how SyncStaq structures Stripe invoices, charges, subscriptions, and disputes into raw tabs you can build on.",
    path: "/sample-sheet",
});

const SAMPLE_SHEET_URL =
    "https://docs.google.com/spreadsheets/d/1f4A9fwCsRk8Hsu_OJ2NjwfbfAmup6BQFuvDpDwmc7ZE/view?usp=sharing";
const SAMPLE_SHEET_PREVIEW_URL =
    "https://docs.google.com/spreadsheets/d/1f4A9fwCsRk8Hsu_OJ2NjwfbfAmup6BQFuvDpDwmc7ZE/preview";
const primaryButton =
    "inline-flex min-h-12 items-center justify-center rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600";

const highlights = [
    {
        title: "Amounts, fees, and refunds",
        description: "In Charges and Invoices, inspect the amount fields, payment status, and customer references.",
    },
    {
        title: "Product and subscription detail",
        description: "In Invoice Line Items and Subscriptions, look at product fields, quantities, and billing intervals.",
    },
    {
        title: "Working Sheet examples",
        description: "Explore examples of reports you can build from the data. These are starting points, not reports SyncStaq generates for you.",
    },
];

export default function SampleSheetPage() {
    return (
        <main className="bg-white text-slate-950">
            <section className="bg-slate-50 pt-8 pb-6 text-center min-[701px]:pt-10 min-[701px]:pb-7">
                <div className="mx-auto max-w-6xl px-6">
                    <h1 className="text-[32px] leading-tight font-semibold min-[701px]:text-[42px]">
                        SyncStaq Sample Sheet
                    </h1>
                    <p className="mx-auto mt-5 mb-6 max-w-[690px] text-lg leading-7 text-slate-600">
                        Explore the Stripe data tabs and reporting examples in a public Google Sheet.
                    </p>
                    <a href={SAMPLE_SHEET_URL} target="_blank" rel="noopener noreferrer" className={primaryButton}>
                        Open Sample Sheet
                    </a>
                    <p className="mt-4 text-sm text-slate-600">
                        View-only example data. No Stripe connection required.
                    </p>
                </div>
            </section>

            <section aria-label="Sample Sheet preview" className="bg-slate-50 pb-9 min-[701px]:pb-12">
                <figure className="mx-auto max-w-6xl px-6">
                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-3.5 min-[701px]:flex-row min-[701px]:items-center min-[701px]:justify-between min-[701px]:gap-5 min-[701px]:px-5">
                            <strong className="text-base">SyncStaq Sample Data</strong>
                            <a href={SAMPLE_SHEET_URL} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-indigo-600 underline underline-offset-4 hover:text-indigo-800">
                                Open full Sheet
                            </a>
                        </div>
                        <iframe
                            title="SyncStaq public sample Google Sheet"
                            src={SAMPLE_SHEET_PREVIEW_URL}
                            className="hidden h-[480px] w-full border-0 min-[701px]:block"
                        />
                        <div tabIndex={0} role="region" aria-label="Sample Charges data preview" className="max-h-80 overflow-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-indigo-600 min-[701px]:hidden">
                            <Image
                                src="/images/how-it-works/sample-charges.jpg"
                                width={1280}
                                height={720}
                                unoptimized
                                alt="Public SyncStaq Sample Sheet showing example charge records and separate billing data tabs."
                                className="block h-[720px] w-[1280px] max-w-none"
                            />
                        </div>
                    </div>
                    <figcaption className="mt-3 text-sm leading-6 text-slate-600">
                        The sample contains example records, not your Stripe data. Your connected Sheet uses data from your own account.
                    </figcaption>
                </figure>
            </section>

            <section className="mx-auto max-w-6xl px-6 py-10 min-[701px]:py-14">
                <h2 className="mb-7 text-3xl leading-snug font-semibold">What to look for.</h2>
                <div className="grid gap-6 min-[701px]:grid-cols-3 min-[701px]:gap-8">
                    {highlights.map((highlight) => (
                        <div key={highlight.title} className="border-t-2 border-slate-200 pt-5">
                            <h3 className="text-xl leading-snug font-semibold">{highlight.title}</h3>
                            <p className="mt-3 text-base leading-7 text-slate-600">{highlight.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="border-t border-slate-200 py-12 text-center">
                <div className="mx-auto max-w-6xl px-6">
                    <h2 className="text-3xl leading-snug font-semibold">Want a Sheet connected to your Stripe account?</h2>
                    <div className="mt-6 flex flex-col justify-center gap-3 min-[701px]:flex-row">
                        <Link href="/pricing" className={primaryButton}>Start 14-day free trial</Link>
                        <Link href="/how-it-works" className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600">
                            See how it works
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
