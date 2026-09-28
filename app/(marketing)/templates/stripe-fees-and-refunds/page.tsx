import Link from "next/link";
import { FeesWorkbookPreview } from "@/components/marketing/fees-workbook-preview";
import { createMarketingMetadata } from "@/lib/marketing/seo-metadata";
import {
    FEES_COPY_URL,
    FEES_TEMPLATE_PATH,
    feesTemplateFaqs,
} from "@/lib/marketing/fees-and-refunds-template";

export const metadata = createMarketingMetadata({
    title: "Stripe Fees and Refunds Google Sheets Template | SyncStaq",
    description: "Explore a Google Sheets report for Stripe charge amounts, charge fees, and cumulative refunds. Copy one reporting tab into your SyncStaq Sheet to use your data.",
    path: FEES_TEMPLATE_PATH,
});

const wrap = "mx-auto max-w-[1120px] px-5 min-[701px]:px-7";
const button = "inline-flex min-h-12 items-center justify-center rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600";
const secondary = "inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600";
const inlineLink = "text-indigo-600 underline underline-offset-4 hover:text-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600";
const heading = "text-[25px] leading-snug font-semibold min-[701px]:text-[30px]";
const body = "leading-7 text-slate-600";
const guides = [
    { href: "/blog/stripe-fees-report-google-sheets", title: "Stripe fees in Google Sheets" },
    { href: "/blog/stripe-refund-reporting-google-sheets", title: "Stripe refund reporting" },
    { href: "/blog/stripe-payout-reconciliation-google-sheets", title: "Stripe payout reconciliation" },
];

export default function FeesAndRefundsTemplatePage() {
    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: feesTemplateFaqs.map(({ question, answer }) => ({
            "@type": "Question", name: question,
            acceptedAnswer: { "@type": "Answer", text: answer },
        })),
    };

    return (
        <main className="bg-white text-slate-950">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }} />
            <section className="bg-slate-50 pt-8 pb-[30px] text-center min-[701px]:pt-11">
                <div className={wrap}>
                    <p className="mb-3.5 text-xs font-bold text-emerald-700 uppercase">Free reporting template</p>
                    <h1 className="mx-auto max-w-[880px] text-[31px] leading-tight font-semibold min-[701px]:text-[42px]">
                        Stripe Fees and Refunds Google Sheets Template
                    </h1>
                    <p className="mx-auto mt-[18px] mb-6 max-w-[740px] text-base leading-7 text-slate-600 min-[701px]:text-lg min-[701px]:leading-8">
                        See charge amounts, Stripe charge fees, and cumulative refunds by month. Add one reporting tab to your SyncStaq Sheet to use your data.
                    </p>
                    <div className="flex flex-col justify-center gap-3 min-[701px]:flex-row">
                        <a href={FEES_COPY_URL} target="_blank" rel="noopener noreferrer" className={button}>Copy the template</a>
                        <a href="#setup" className={secondary}>Use your data</a>
                    </div>
                </div>
            </section>

            <section aria-label="Workbook preview" className="bg-slate-50 pb-12">
                <div className={wrap}>
                    <FeesWorkbookPreview />
                    <p className="mt-5 max-w-[900px] text-sm leading-6 text-slate-600">
                        <strong className="text-slate-950">Reporting basis:</strong> Refunds are grouped by the original charge month, not the month they were issued. Totals can change when an older charge is refunded later.
                    </p>
                </div>
            </section>

            <section id="setup" className="scroll-mt-6 py-10 min-[701px]:py-14">
                <div className={wrap}>
                    <h2 className={`mb-6 ${heading}`}>Use it with your SyncStaq Sheet</h2>
                    <ol className="grid list-none gap-7 min-[701px]:grid-cols-3 min-[701px]:gap-8">
                        {[
                            { title: "Copy the template", description: <>Open the workbook and choose <strong>Make a copy</strong>.</> },
                            { title: "Add the reporting tab", description: <>Right-click <strong>Working Sheet</strong>, then choose <strong>Copy to &gt; Existing spreadsheet</strong>. Select your dedicated SyncStaq Sheet and rename the new tab <strong>Fees and Refunds</strong>.</> },
                            { title: "Explore refunds", description: <>Choose a charge month in the yellow cell to see its refunded charges. The monthly overview stays on the latest year in your synced data.</> },
                        ].map((step, index) => (
                            <li key={step.title} className="border-t border-slate-200 pt-[18px]">
                                <h3 className="flex items-baseline gap-3 text-xl leading-snug font-semibold">
                                    <span aria-hidden="true" className="text-[22px] text-indigo-600">{index + 1})</span>{step.title}
                                </h3>
                                <p className={`mt-2.5 ${body}`}>{step.description}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <section className="bg-slate-50 py-10 min-[701px]:py-14">
                <div className="mx-auto max-w-[850px] px-5 min-[701px]:px-7">
                    <h2 className={`mb-4 ${heading}`}>Template questions</h2>
                    {feesTemplateFaqs.map((faq) => (
                        <details key={faq.question} className="border-b border-slate-200 py-5">
                            <summary className="cursor-pointer text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600">{faq.question}</summary>
                            <p className={`mt-3 ${body}`}>{faq.answer}</p>
                        </details>
                    ))}
                </div>
            </section>

            <section className="py-10 min-[701px]:py-11">
                <div className={wrap}>
                    <h2 className="mb-4 text-2xl leading-snug font-semibold">Related guides</h2>
                    <nav aria-label="Related guides" className="flex flex-wrap gap-x-7 gap-y-3">
                        {guides.map((guide) => (
                            <Link key={guide.href} href={guide.href} className={inlineLink}>{guide.title}</Link>
                        ))}
                    </nav>
                </div>
            </section>

            <section className="bg-emerald-50 py-10 text-center">
                <div className={wrap}>
                    <h2 className={heading}>Keep your Stripe data in Sheets</h2>
                    <p className="mx-auto mt-4 mb-5 max-w-[660px] leading-7 text-slate-600">
                        SyncStaq creates a dedicated Google Sheet and keeps your Stripe billing data updated for reporting and reconciliation.
                    </p>
                    <Link href="/login" className={button}>Start 14-day free trial</Link>
                </div>
            </section>
        </main>
    );
}
