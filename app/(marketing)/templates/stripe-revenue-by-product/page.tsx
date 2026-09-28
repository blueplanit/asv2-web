import Link from "next/link";
import { RevenueWorkbookPreview } from "@/components/marketing/revenue-workbook-preview";
import { createMarketingMetadata } from "@/lib/marketing/seo-metadata";
import {
    REVENUE_COPY_URL,
    REVENUE_TEMPLATE_PATH,
    revenueTemplateFaqs,
} from "@/lib/marketing/revenue-by-product-template";

export const metadata = createMarketingMetadata({
    title: "Stripe Revenue by Product Google Sheets Template | SyncStaq",
    description: "Track billed Stripe revenue by product and month in Google Sheets. Copy a reporting tab with a monthly product table, stacked chart, and selected-month breakdown.",
    path: REVENUE_TEMPLATE_PATH,
});

const wrap = "mx-auto max-w-[1120px] px-[22px] min-[701px]:px-7";
const button = "inline-flex min-h-12 items-center justify-center rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600";
const secondary = "inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600";
const inlineLink = "text-indigo-600 underline underline-offset-4 hover:text-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600";
const heading = "text-[26px] leading-snug font-semibold min-[701px]:text-[30px]";
const body = "leading-7 text-slate-600";
const guides = [
    { href: "/blog/stripe-revenue-by-product", title: "How to calculate Stripe revenue by product", description: "Choose a revenue definition before comparing products." },
    { href: "/blog/stripe-invoice-line-items-explained", title: "Stripe invoice line items explained", description: "Understand the product and price detail within an invoice." },
    { href: "/blog/stripe-revenue-report-google-sheets", title: "Stripe revenue reporting in Google Sheets", description: "Distinguish billed amounts from collected and net revenue." },
];

export default function RevenueByProductTemplatePage() {
    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: revenueTemplateFaqs.map(({ question, answer }) => ({
            "@type": "Question", name: question,
            acceptedAnswer: { "@type": "Answer", text: answer },
        })),
    };

    return (
        <main className="bg-white text-slate-950">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }} />
            <section className="bg-slate-50 pt-8 pb-[30px] text-center min-[701px]:pt-[42px]">
                <div className={wrap}>
                    <p className="mb-3.5 text-xs font-bold text-emerald-700 uppercase">Free reporting template</p>
                    <h1 className="mx-auto max-w-[850px] text-[32px] leading-tight font-semibold min-[701px]:text-[42px]">
                        Stripe Revenue by Product<br />Google Sheets Template
                    </h1>
                    <p className="mx-auto mt-[18px] mb-[22px] max-w-[730px] text-lg leading-8 text-slate-600">
                        Compare monthly billed revenue by product. Add this reporting tab to your SyncStaq Sheet to use your synced invoice data.
                    </p>
                    <div className="flex flex-col justify-center gap-3 min-[701px]:flex-row">
                        <a href={REVENUE_COPY_URL} target="_blank" rel="noopener noreferrer" className={button}>Copy the template</a>
                        <a href="#setup" className={secondary}>Use your data</a>
                    </div>
                </div>
            </section>

            <section aria-label="Workbook preview" className="bg-slate-50 pb-11">
                <div className={wrap}><RevenueWorkbookPreview /></div>
            </section>

            <section id="setup" className="scroll-mt-6 py-10 min-[701px]:py-[54px]">
                <div className={wrap}>
                    <div className="mb-7 max-w-[740px]">
                        <p className="mb-3.5 text-xs font-bold text-emerald-700 uppercase">Use your synced data</p>
                        <h2 className={heading}>Add the report to your SyncStaq Sheet.</h2>
                        <p className={`mt-4 ${body}`}>Start with a dedicated SyncStaq spreadsheet that already has synced invoices and invoice line items.</p>
                    </div>
                    <ol className="grid list-none gap-8 min-[701px]:grid-cols-2 min-[701px]:gap-x-12">
                        {[
                            { title: "Make your own template copy", description: <>Click <a href={REVENUE_COPY_URL} target="_blank" rel="noopener noreferrer" className={inlineLink}>Copy the template</a> to create an editable copy.</> },
                            { title: "Copy the reporting tab", description: <>Right-click <strong>Working Sheet</strong>, then choose <strong>Copy to &gt; Existing spreadsheet</strong>. Select your dedicated SyncStaq spreadsheet or paste its URL into the picker.</> },
                            { title: "Name your report", description: <>In the destination spreadsheet, rename <strong>Copy of Working Sheet</strong> to <strong>Revenue by Product</strong>. Leave your original Working Sheet and synced data tabs unchanged.</> },
                            { title: "Choose a month to explore", description: <>Enter a date in the yellow <strong>Month</strong> cell for the lower breakdown. The monthly overview uses the latest year in your finalized invoice data.</> },
                        ].map((step, index) => (
                            <li key={step.title} className="grid grid-cols-[24px_minmax(0,1fr)] gap-x-3 border-t border-slate-200 pt-5">
                                <span aria-hidden="true" className="text-xl leading-snug font-bold text-indigo-600">{index + 1})</span>
                                <div>
                                    <h3 className="text-xl leading-snug font-semibold">{step.title}</h3>
                                    <p className={`mt-3 ${body}`}>{step.description}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <section className="bg-slate-50 py-10 min-[701px]:py-[54px]">
                <div className="mx-auto max-w-[850px] px-[22px] min-[701px]:px-7">
                    <h2 className={`mb-4 ${heading}`}>Template questions</h2>
                    {revenueTemplateFaqs.map((faq, index) => (
                        <details key={faq.question} open={index === 0} className="border-b border-slate-200 py-5">
                            <summary className="cursor-pointer text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600">{faq.question}</summary>
                            <p className={`mt-3.5 ${body}`}>{faq.answer}</p>
                        </details>
                    ))}
                </div>
            </section>

            <section className="py-10 min-[701px]:py-[54px]">
                <div className={wrap}>
                    <h2 className={`mb-7 ${heading}`}>Understand the data behind the report.</h2>
                    <div className="grid gap-8 min-[701px]:grid-cols-3">
                        {guides.map((guide) => (
                            <div key={guide.href} className="border-t border-slate-200 pt-5">
                                <Link href={guide.href} className={`font-semibold ${inlineLink}`}>{guide.title}</Link>
                                <p className="mt-3 text-sm leading-6 text-slate-600">{guide.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="bg-emerald-50 py-[42px] text-center">
                <div className={wrap}>
                    <h2 className={heading}>Need Stripe billing data in Sheets?</h2>
                    <p className="mx-auto mt-4 mb-[22px] max-w-[670px] leading-7 text-slate-600">
                        SyncStaq keeps the source data available without repeated CSV exports or custom scripts. Add this reporting tab after your dedicated Sheet has synced.
                    </p>
                    <div className="flex flex-col justify-center gap-3 min-[701px]:flex-row">
                        <Link href="/login" className={button}>Start a 14-day free trial</Link>
                        <Link href="/how-it-works" className={secondary}>See how SyncStaq works</Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
