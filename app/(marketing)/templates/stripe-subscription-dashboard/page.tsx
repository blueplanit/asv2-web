import Link from "next/link";
import { SubscriptionDashboardPreview } from "@/components/marketing/subscription-dashboard-preview";
import { createMarketingMetadata } from "@/lib/marketing/seo-metadata";
import {
    SUBSCRIPTION_DASHBOARD_COPY_URL,
    SUBSCRIPTION_DASHBOARD_TEMPLATE_PATH,
    subscriptionDashboardFaqs,
    subscriptionStatuses,
} from "@/lib/marketing/subscription-dashboard-template";

export const metadata = createMarketingMetadata({
    title: "Stripe Subscription and MRR Dashboard Google Sheets Template | SyncStaq",
    description: "See every active, past due, and canceled Stripe subscription in one Google Sheet, with an MRR dashboard and a link to each subscription in Stripe. Free template.",
    path: SUBSCRIPTION_DASHBOARD_TEMPLATE_PATH,
});

const wrap = "mx-auto max-w-[1120px] px-5 min-[701px]:px-7";
const button = "inline-flex min-h-12 items-center justify-center rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600";
const secondary = "inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600";
const inlineLink = "text-indigo-600 underline underline-offset-4 hover:text-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600";
const heading = "text-[25px] leading-snug font-semibold min-[701px]:text-[30px]";
const body = "leading-7 text-slate-600";
const related = [
    { href: "/templates/stripe-revenue-by-product", title: "Revenue by product template" },
    { href: "/templates/stripe-customer-revenue", title: "Customer revenue template" },
    { href: "/templates/stripe-fees-and-refunds", title: "Fees and refunds template" },
    { href: "/stripe-google-sheets-integration", title: "Stripe to Google Sheets" },
];

export default function SubscriptionDashboardTemplatePage() {
    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: subscriptionDashboardFaqs.map(({ question, answer }) => ({
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
                        Stripe Subscription and MRR Dashboard Google Sheets Template
                    </h1>
                    <p className="mx-auto mt-[18px] mb-6 max-w-[740px] text-base leading-7 text-slate-600 min-[701px]:text-lg min-[701px]:leading-8">
                        See active, past due, and canceled Stripe subscriptions in one list, with MRR at the top and a link to each subscription in Stripe. Add one reporting tab to your SyncStaq Sheet to use your data.
                    </p>
                    <div className="flex flex-col justify-center gap-3 min-[701px]:flex-row">
                        <a href={SUBSCRIPTION_DASHBOARD_COPY_URL} target="_blank" rel="noopener noreferrer" className={button}>Copy the template</a>
                        <a href="#setup" className={secondary}>Use your data</a>
                    </div>
                </div>
            </section>

            <section aria-label="Workbook preview" className="bg-slate-50 pb-12">
                <div className={wrap}>
                    <SubscriptionDashboardPreview />
                    <p className="mt-5 max-w-[900px] text-sm leading-6 text-slate-600">
                        <strong className="text-slate-950">Reporting basis:</strong> MRR is list price times quantity for active and past due subscriptions, converted to a monthly amount. Coupons and discounts are not subtracted.
                    </p>
                </div>
            </section>

            <section id="setup" className="scroll-mt-6 py-10 min-[701px]:py-14">
                <div className={wrap}>
                    <h2 className={`mb-6 ${heading}`}>Use it with your SyncStaq Sheet</h2>
                    <ol className="grid list-none gap-7 min-[701px]:grid-cols-3 min-[701px]:gap-8">
                        {[
                            { title: "Copy the template", description: <>Open the workbook and choose <strong>Make a copy</strong>.</> },
                            { title: "Add the reporting tab", description: <>Right-click <strong>Subscription Dashboard</strong>, then choose <strong>Copy to &gt; Existing spreadsheet</strong>. Select your dedicated SyncStaq Sheet. The tab reads its <strong>Subscriptions_raw</strong> tab.</> },
                            { title: "Filter by status", description: <>Choose a status in the yellow cell to list only those subscriptions. Past due subscriptions sort to the top, and <strong>Open in Stripe</strong> takes you to each one.</> },
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
                <div className={wrap}>
                    <h2 className={`mb-3 ${heading}`}>Stripe subscription statuses in the dashboard</h2>
                    <p className={`mb-6 max-w-[740px] ${body}`}>
                        The Status column uses Stripe&apos;s own subscription status values. This is what each one means and what to do about it.
                    </p>
                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead className="border-b border-slate-200 text-slate-600">
                                <tr>
                                    {["Status", "What it means", "What to do"].map((column) => (
                                        <th key={column} scope="col" className="px-4 py-3 font-semibold">{column}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {subscriptionStatuses.map((row) => (
                                    <tr key={row.status}>
                                        <th scope="row" className="px-4 py-3 font-mono text-xs font-semibold whitespace-nowrap">{row.status}</th>
                                        <td className="px-4 py-3 leading-6 text-slate-600">{row.meaning}</td>
                                        <td className="px-4 py-3 leading-6 text-slate-600">{row.action}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="py-10 min-[701px]:py-14">
                <div className="mx-auto max-w-[850px] px-5 min-[701px]:px-7">
                    <h2 className={`mb-4 ${heading}`}>Template questions</h2>
                    {subscriptionDashboardFaqs.map((faq) => (
                        <details key={faq.question} className="border-b border-slate-200 py-5">
                            <summary className="cursor-pointer text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600">{faq.question}</summary>
                            <p className={`mt-3 ${body}`}>{faq.answer}</p>
                        </details>
                    ))}
                </div>
            </section>

            <section className="bg-slate-50 py-10 min-[701px]:py-11">
                <div className={wrap}>
                    <h2 className="mb-4 text-2xl leading-snug font-semibold">Related templates</h2>
                    <nav aria-label="Related templates" className="flex flex-wrap gap-x-7 gap-y-3">
                        {related.map((item) => (
                            <Link key={item.href} href={item.href} className={inlineLink}>{item.title}</Link>
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
