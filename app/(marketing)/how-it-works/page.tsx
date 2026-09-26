import Image from "next/image";
import Link from "next/link";
import { createMarketingMetadata } from "@/lib/marketing/seo-metadata";

export const metadata = createMarketingMetadata({
    title: "How SyncStaq Works: Stripe Data in Google Sheets | SyncStaq",
    description:
        "Connect Stripe with read-only access, create your Google Sheet, and bring in six months of billing history. SyncStaq keeps the data updated hourly.",
    path: "/how-it-works",
});

const setupSteps = [
    {
        title: "Connect Stripe",
        body: "Sign in with Google, then authorize read-only access to your Stripe account. No custom API keys or scripts to maintain.",
    },
    {
        title: "Create your Google Sheet",
        body: "Grant Google Sheets access during setup. SyncStaq creates a dedicated Sheet in your Drive, with structured data tabs and a Working Sheet.",
    },
    {
        title: "Backfill, then update hourly",
        body: "The first sync brings in six months of Stripe billing history. After that, SyncStaq refreshes the connected data every hour.",
    },
];
const dataRows = [
    ["Invoices & line items", "Amounts, status, products, discounts, taxes", "Billed revenue and product-level detail"],
    ["Charges", "Amounts, fees, refunds, payment status", "Collected amounts, fees, and refunds"],
    ["Customers", "Customer ID, name, description", "Customer billing context and labels"],
    ["Subscriptions", "Status, items, amounts, billing interval", "Recurring billing and subscription changes"],
    ["Payouts", "Amount, currency, status, arrival date", "Payout timing and reconciliation context"],
    ["Disputes", "Charge ID, amount, reason, status", "Disputed payments and their current status"],
];
const workflows = [
    {
        title: "Report on revenue",
        body: "Build formulas and pivots for customer, product, or subscription analysis. Define whether your report uses billed, collected, or net amounts.",
        href: "/blog/stripe-revenue-by-product",
        label: "Reporting revenue by product",
    },
    {
        title: "Review fees and payouts",
        body: "Work with charge, fee, refund, and payout context without assembling a fresh set of CSV exports each week.",
        href: "/blog/stripe-payout-reconciliation-google-sheets",
        label: "Payout reconciliation in Sheets",
    },
    {
        title: "Calculate commissions",
        body: "Add ownership and rates to your spreadsheet workflow. Your formulas and agreements define the commission calculation.",
        href: "/use-cases/stripe-commission-revenue-share",
        label: "Commission and revenue share template",
    },
];
const boundaries = [
    {
        title: "Read-only in Stripe",
        body: "SyncStaq does not create or change Stripe records, process payments, issue refunds, or cancel subscriptions.",
    },
    {
        title: "A dedicated Google Sheet",
        body: "The connection uses a Sheet created through SyncStaq, not an arbitrary existing spreadsheet you select.",
    },
    {
        title: "Your analysis and decisions",
        body: "You own formulas, labels, reporting definitions, and review. SyncStaq does not replace your accounting system or professional advice.",
    },
];
const faqs = [
    {
        question: "How often does the Sheet update?",
        answer: "The connected data updates hourly. The first sync includes six months of Stripe billing history. SyncStaq is not a real-time stream.",
    },
    {
        question: "Can I use my existing spreadsheet?",
        answer: "Setup creates a dedicated Google Sheet through SyncStaq. Build your formulas and reports in its Working Sheet, using the synced data as the source.",
    },
    {
        question: "Can I edit the synced data?",
        answer: "The source data tabs are protected. Use the Working Sheet to add formulas, labels, pivots, and reports without editing the synced source rows.",
    },
    {
        question: "What happens when a Stripe record changes later?",
        answer: "SyncStaq uses Stripe events together with object retrieval to support updates to billing records after they were created. Your reporting workflow can use the refreshed source data rather than relying only on a one-time export.",
    },
    {
        question: "Does SyncStaq calculate reports or commissions for me?",
        answer: "SyncStaq supplies the Stripe data. You build the reports and calculations in Sheets, using your definitions, formulas, and ownership rules. The free commission template is one starting point.",
    },
];

const wrap = "mx-auto max-w-6xl px-6";
const heading = "text-[27px] font-semibold leading-tight sm:text-[32px]";
const body = "text-base leading-7 text-slate-600";
const eyebrow = "mb-4 text-xs font-semibold uppercase text-emerald-700";
const button = "inline-flex min-h-12 w-full items-center justify-center rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600 sm:w-auto";
const secondary = "inline-flex min-h-12 w-full items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600 sm:w-auto";
const inlineLink = "text-indigo-700 underline underline-offset-4 hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600";

export default function HowItWorksPage() {
    return (
        <main className="bg-white tracking-normal text-slate-950">
            <section className="bg-slate-50 py-10 text-center sm:pb-11 sm:pt-14">
                <div className={wrap}>
                    <p className={eyebrow}>Stripe data. Your spreadsheet.</p>
                    <h1 className="text-[34px] font-semibold leading-tight sm:text-[46px]">How SyncStaq works</h1>
                    <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600 sm:text-[19px]">
                        Connect Stripe. Create your Google Sheet.<br />
                        Keep billing data updated for the reports you build.
                    </p>
                    <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
                        <Link href="/pricing" className={button}>Start 14-day free trial</Link>
                        <Link href="#your-sheet" className={secondary}>See what you get</Link>
                    </div>
                    <ul className="mt-6 flex flex-wrap justify-center gap-3 text-sm text-slate-600 sm:gap-7">
                        {["Read-only Stripe access", "Six months of history", "Hourly updates"].map((fact) => (
                            <li key={fact} className="border-l-[3px] border-emerald-600 pl-3">{fact}</li>
                        ))}
                    </ul>
                </div>
            </section>

            <section className="py-12 sm:py-16">
                <div className={wrap}>
                    <h2 className={heading}>Three steps to your synced Sheet.</h2>
                    <p className={`mt-4 ${body}`}>Connect your accounts. SyncStaq creates your Sheet and keeps Stripe data updated.</p>
                    <ol className="mt-8 grid gap-8 min-[701px]:grid-cols-3 min-[701px]:gap-10">
                        {setupSteps.map((step, index) => (
                            <li key={step.title} className="border-t-2 border-slate-200 pt-6">
                                <div aria-hidden="true" className="mb-4 text-2xl font-bold text-indigo-600">{index + 1})</div>
                                <h3 className="text-xl font-semibold leading-snug">{step.title}</h3>
                                <p className={`mt-3 ${body}`}>{step.body}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <section id="your-sheet" className="scroll-mt-6 bg-slate-50 py-12 sm:py-16">
                <div className={wrap}>
                    <div className="mb-8 max-w-3xl">
                        <p className={eyebrow}>The result</p>
                        <h2 className={heading}>A Sheet you can actually work with.</h2>
                        <p className={`mt-4 ${body}`}>Stripe billing data is organized into separate tabs. Use the Working Sheet for your own formulas, pivots, labels, and reports.</p>
                    </div>
                    <figure>
                        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                            <div className="flex flex-col justify-between gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
                                <strong>SyncStaq Sample Data</strong>
                                <a href="https://docs.google.com/spreadsheets/d/1f4A9fwCsRk8Hsu_OJ2NjwfbfAmup6BQFuvDpDwmc7ZE/view?usp=sharing" target="_blank" rel="noopener noreferrer" className={inlineLink}>Open the Sample Sheet</a>
                            </div>
                            <Image src="/images/how-it-works/sample-charges.jpg" width={1280} height={720} alt="SyncStaq Sample Data Sheet showing the Charges data tab and separate invoice, subscription, customer, and payout tabs." className="h-auto w-full" unoptimized />
                        </div>
                        <figcaption className="mt-3 text-xs leading-5 text-slate-600">Public Sample Sheet with example data. Your connected Sheet contains data from your Stripe account.</figcaption>
                    </figure>
                    <div className="mt-8 grid gap-6 min-[701px]:grid-cols-2 min-[701px]:gap-0">
                        <div className="min-[701px]:pr-8">
                            <h3 className="text-xl font-semibold">Synced data</h3>
                            <p className={`mt-3 ${body}`}>Protected data tabs contain the Stripe records SyncStaq maintains. Reference them in your formulas rather than editing the source rows.</p>
                        </div>
                        <div className="border-t border-slate-200 pt-6 min-[701px]:border-l min-[701px]:border-t-0 min-[701px]:pl-8 min-[701px]:pt-0">
                            <h3 className="text-xl font-semibold">Your Working Sheet</h3>
                            <p className={`mt-3 ${body}`}>Your editable space for analysis. Build the report your team needs while keeping it separate from the synced source data.</p>
                        </div>
                    </div>
                    <div tabIndex={0} role="region" aria-label="Included Stripe data" className="mt-7 overflow-x-auto rounded-lg border border-slate-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600">
                        <table className="w-full min-w-[660px] border-collapse text-left text-sm leading-6">
                            <thead className="bg-slate-100">
                                <tr>{["Data tab", "Example fields", "What you can investigate"].map((label) => (
                                    <th key={label} scope="col" className="border-b border-slate-200 px-5 py-4 align-top font-bold">{label}</th>
                                ))}</tr>
                            </thead>
                            <tbody>{dataRows.map(([tab, fields, workflow]) => (
                                <tr key={tab} className="border-b border-slate-200 last:border-b-0">
                                    <th scope="row" className="whitespace-nowrap px-5 py-4 align-top font-semibold">{tab}</th>
                                    <td className="px-5 py-4 align-top text-slate-600">{fields}</td>
                                    <td className="px-5 py-4 align-top text-slate-600">{workflow}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="py-12 sm:py-16">
                <div className={wrap}>
                    <p className={eyebrow}>After the sync</p>
                    <h2 className={heading}>Keep the reporting workflow yours.</h2>
                    <p className={`mt-4 ${body}`}>SyncStaq gets the billing data into Sheets. You decide how to group it, label it, and use it.</p>
                    <div className="mt-8 grid gap-8 min-[701px]:grid-cols-3 min-[701px]:gap-10">
                        {workflows.map((workflow) => (
                            <div key={workflow.title} className="border-t-2 border-slate-200 pt-6">
                                <h3 className="text-xl font-semibold">{workflow.title}</h3>
                                <p className={`mt-3 ${body}`}>{workflow.body}</p>
                                <Link href={workflow.href} className={`mt-4 inline-block text-sm font-semibold ${inlineLink}`}>{workflow.label}</Link>
                            </div>
                        ))}
                    </div>
                    <p className="mt-7 border-l-[3px] border-slate-300 pl-4 text-sm leading-6 text-slate-600">
                        A CSV export is useful for a one-off analysis. SyncStaq is for recurring work where you need the Stripe source data refreshed without another export or a custom script. Learn more about <Link href="/stripe-google-sheets-integration" className={inlineLink}>connecting Stripe to Google Sheets</Link>.
                    </p>
                </div>
            </section>

            <section className="bg-emerald-50 py-12 sm:py-16">
                <div className={wrap}>
                    <h2 className={heading}>Clear boundaries. No surprises.</h2>
                    <div className="mt-8 grid gap-8 min-[701px]:grid-cols-3">
                        {boundaries.map((item) => (
                            <div key={item.title}>
                                <h3 className="text-lg font-semibold">{item.title}</h3>
                                <p className={`mt-3 ${body}`}>{item.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
                <h2 className={heading}>Before you connect.</h2>
                <div className="mt-6">
                    {faqs.map((faq, index) => (
                        <details key={faq.question} open={index === 0} className="border-b border-slate-200 py-5">
                            <summary className="cursor-pointer text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600">{faq.question}</summary>
                            <p className={`mt-4 ${body}`}>{faq.answer}</p>
                        </details>
                    ))}
                    <details className="border-b border-slate-200 py-5">
                        <summary className="cursor-pointer text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600">Where can I inspect the data before signing up?</summary>
                        <p className={`mt-4 ${body}`}>Open the <Link href="/sample-sheet" className={inlineLink}>Sample Sheet page</Link> to explore the public example. It shows the structure and example fields without connecting your Stripe account.</p>
                    </details>
                </div>
            </section>

            <section className="border-t border-slate-200 py-12 text-center">
                <div className={wrap}>
                    <h2 className={heading}>Start with the data. Build your own report.</h2>
                    <p className={`mx-auto mt-4 max-w-2xl ${body}`}>Inspect the Sample Sheet first, or connect your accounts and start a 14-day free trial.</p>
                    <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
                        <Link href="/pricing" className={button}>Start 14-day free trial</Link>
                        <Link href="/sample-sheet" className={secondary}>View Sample Sheet</Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
