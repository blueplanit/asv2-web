// Implementation notes for Eng:
// Suggested slug: /use-cases/stripe-commission-revenue-share
// Meta title: Calculate Stripe Commissions & Revenue Share in Google Sheets | SyncStaq
// Meta description: Pay reps and partners from accurate Stripe data. SyncStaq syncs gross, fees, refunds, and net revenue into Google Sheets every hour without monthly CSV exports.
// Target keywords: stripe commission calculation, stripe revenue share, partner payout reconciliation, net revenue after stripe fees, stripe commissions google sheets
// FAQ: The FAQ block below is marked up as FAQPage schema with JSON-LD.

import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";

const metaTitle = "Calculate Stripe Commissions & Revenue Share in Google Sheets | SyncStaq";
const metaDescription =
    "Pay reps and partners from accurate Stripe data. SyncStaq syncs gross, fees, refunds, and net revenue into Google Sheets every hour without monthly CSV exports.";

export const metadata: Metadata = {
    title: metaTitle,
    description: metaDescription,
    keywords: [
        "stripe commission calculation",
        "stripe revenue share",
        "partner payout reconciliation",
        "net revenue after stripe fees",
        "stripe commissions google sheets",
    ],
    openGraph: {
        title: metaTitle,
        description: metaDescription,
        type: "website",
        url: "/use-cases/stripe-commission-revenue-share",
    },
    twitter: {
        card: "summary_large_image",
        title: metaTitle,
        description: metaDescription,
    },
};

const trustItems = [
    "Ongoing hourly sync",
    "Read-only Stripe access",
    "Structured Google Sheets output",
    "14-day free trial",
];

const painCards = [
    {
        title: "Fees and refunds hide the real number",
        body: "Commissionable revenue is rarely gross. You need net of Stripe fees, refunds, and discounts, not a disconnected CSV that has to be rebuilt by hand.",
    },
    {
        title: "Late changes break last month's numbers",
        body: "Refunds, disputes, and invoice updates can land after payout day. Date-based exports and simple polling scripts can miss records that change later.",
    },
    {
        title: "Exports do not scale with trust",
        body: "When a paycheck depends on the number, re-downloading CSVs and reworking pivots is hard to defend. Teams need calculations that tie back to Stripe rows.",
    },
];

const audienceCards = [
    {
        title: "Revenue and sales operations",
        body: "Reconcile sales-rep commissions against paid invoice line items, with consistent timestamps and cleaner refund handling.",
    },
    {
        title: "Partner and affiliate programs",
        body: "Calculate monthly or quarterly revenue share on net revenue after fees without rebuilding the report each cycle.",
    },
    {
        title: "Publishers and ad networks",
        body: "Prepare payout reports from Stripe invoice and charge data with fees, refunds, credits, and account context in one spreadsheet workflow.",
    },
    {
        title: "Agencies and multi-product teams",
        body: "Split revenue by product or stream and report it from a Sheet that stays connected to the underlying Stripe billing data.",
    },
];

const steps = [
    {
        number: "1",
        title: "Connect Stripe and Google",
        body: "Sign in with Google, connect Stripe with read-only access, and create a Sheet in your Drive. No scripts, no code.",
    },
    {
        number: "2",
        title: "SyncStaq keeps it fresh",
        body: "Your synced tabs update hourly with Stripe billing data, including records that change after the first time they appear.",
    },
    {
        number: "3",
        title: "Add rates, get payouts",
        body: "Layer ownership and commission rules on top with normal formulas and pivots. Your payout table can tie back to Stripe source rows each period.",
    },
];

const sampleRows = [
    ["Vector Finance", "$299.00", "$0.00", "$9.05", "$289.95", "15%", "$43.49"],
    ["Atlas Ops", "$149.00", "$0.00", "$4.62", "$144.38", "15%", "$21.66"],
    ["Metric Labs", "$79.00", "$0.00", "$2.61", "$76.39", "15%", "$11.46"],
    ["Beacon Works", "$59.00", "$15.00", "$2.01", "$41.99", "15%", "$6.30"],
];

const faqs = [
    {
        question: "Does SyncStaq calculate commissions for me?",
        answer: "SyncStaq delivers the Stripe data your calculation depends on, including gross amounts, fees, refunds, net amounts, and invoice line items in Google Sheets. You keep control of rates, splits, ownership, and payout policy in the sheet.",
    },
    {
        question: "How do you handle refunds that arrive after a payout?",
        answer: "SyncStaq refreshes your Stripe billing data hourly, so refund and dispute changes can update the underlying sheet rows. You decide the clawback or adjustment policy in your spreadsheet.",
    },
    {
        question: "Can I get net revenue after Stripe fees?",
        answer: "Yes. Fee and net amount fields sync alongside charges, and invoice line items include product, discount, and tax detail that can help you define commissionable revenue more precisely.",
    },
    {
        question: "How far back does the data go?",
        answer: "Confirm the current backfill range in the app during setup. After the sheet is created, SyncStaq keeps the connected Stripe billing data updated hourly.",
    },
    {
        question: "Is my Stripe account safe?",
        answer: "SyncStaq uses read-only Stripe access and mirrors data into Google Sheets in your own Google Drive. It does not write changes back to Stripe.",
    },
];

const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
        },
    })),
};

export default function StripeCommissionRevenueSharePage() {
    return (
        <main className="bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />

            <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-16 pt-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] lg:items-center lg:pb-20 lg:pt-20">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                        Commissions and revenue share
                    </p>
                    <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                        Pay reps and partners from Stripe data you can actually trust.
                    </h1>
                    <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                        Commissions and revenue-share payouts fall apart when they are built on
                        stale CSV exports. SyncStaq keeps gross, Stripe fees, refunds, and net
                        revenue synced into Google Sheets every hour, so payout math starts from
                        current Stripe billing data.
                    </p>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                        >
                            Start a 14-day trial
                        </Link>
                        <Link
                            href="#sample"
                            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                            See the data you get
                        </Link>
                    </div>

                    <div className="mt-8 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                        {trustItems.map((item) => (
                            <div key={item} className="flex items-start gap-3">
                                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                </span>
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <CommissionSheetPreview />
            </section>

            <section className="border-y border-slate-200 bg-white/70">
                <div className="mx-auto max-w-6xl px-6 py-16">
                    <div className="max-w-3xl">
                        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                            Why payout math breaks in Stripe
                        </h2>
                        <p className="mt-4 text-base leading-8 text-slate-600">
                            Stripe records payments, but payout rules usually live somewhere else.
                            The hard part is getting current, fee-adjusted revenue to multiply
                            against rep, partner, or publisher rates.
                        </p>
                    </div>
                    <div className="mt-10 grid gap-5 md:grid-cols-3">
                        {painCards.map((card) => (
                            <article
                                key={card.title}
                                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                            >
                                <h3 className="text-base font-semibold text-slate-950">{card.title}</h3>
                                <p className="mt-3 text-sm leading-7 text-slate-600">{card.body}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section id="sample" className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                <div>
                    <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700 ring-1 ring-indigo-100">
                        Straight from your synced sheet
                    </span>
                    <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
                        Net revenue, ready for your payout rules
                    </h2>
                    <p className="mt-4 text-base leading-8 text-slate-600">
                        SyncStaq syncs charges, invoices, invoice line items, payouts,
                        subscriptions, customers, and disputes into structured tabs. Add rates,
                        ownership, and formulas in Sheets, then review payout math against the
                        Stripe rows underneath.
                    </p>
                    <p className="mt-4 text-base leading-8 text-slate-600">
                        Because the data refreshes hourly, changes like refunds and disputes do
                        not require rebuilding a payout workbook from another CSV export.
                    </p>
                </div>
                <SamplePayoutTable />
            </section>

            <section className="border-y border-slate-200 bg-slate-50">
                <div className="mx-auto max-w-6xl px-6 py-16">
                    <div className="max-w-3xl">
                        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                            Built for anyone paying out on Stripe revenue
                        </h2>
                        <p className="mt-4 text-base leading-8 text-slate-600">
                            If a payout depends on Stripe numbers, the work below is probably
                            familiar.
                        </p>
                    </div>
                    <div className="mt-10 grid gap-5 md:grid-cols-2">
                        {audienceCards.map((card) => (
                            <article
                                key={card.title}
                                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                            >
                                <h3 className="text-base font-semibold text-slate-950">{card.title}</h3>
                                <p className="mt-3 text-sm leading-7 text-slate-600">{card.body}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-6 py-16">
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                    From Stripe to payout-ready in minutes
                </h2>
                <div className="mt-10 grid gap-5 md:grid-cols-3">
                    {steps.map((step) => (
                        <article
                            key={step.number}
                            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                        >
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                                {step.number}
                            </div>
                            <h3 className="mt-5 text-base font-semibold text-slate-950">{step.title}</h3>
                            <p className="mt-3 text-sm leading-7 text-slate-600">{step.body}</p>
                        </article>
                    ))}
                </div>
                <p className="mt-6 max-w-3xl text-sm leading-7 text-slate-500">
                    Want the methodology first? Read{" "}
                    <Link
                        href="/blog/stripe-sales-commissions"
                        className="font-semibold text-indigo-700 underline decoration-indigo-200 underline-offset-4 hover:text-indigo-500"
                    >
                        The Cleanest Way to Calculate Sales Commissions from Stripe Data
                    </Link>
                    , or see{" "}
                    <Link
                        href="/blog/stripe-revenue-by-product"
                        className="font-semibold text-indigo-700 underline decoration-indigo-200 underline-offset-4 hover:text-indigo-500"
                    >
                        how to calculate revenue by product
                    </Link>
                    .
                </p>
            </section>

            <section className="border-y border-slate-200 bg-white">
                <div className="mx-auto max-w-3xl px-6 py-16">
                    <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                        Common questions
                    </h2>
                    <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
                        {faqs.map((faq, index) => (
                            <details key={faq.question} className="group p-5" open={index === 0}>
                                <summary className="cursor-pointer list-none text-base font-semibold text-slate-950">
                                    <span className="inline-flex w-full items-center justify-between gap-4">
                                        {faq.question}
                                        <span className="text-lg text-slate-400 group-open:hidden">+</span>
                                        <span className="hidden text-lg text-slate-400 group-open:inline">-</span>
                                    </span>
                                </summary>
                                <p className="mt-3 text-sm leading-7 text-slate-600">{faq.answer}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-6 py-16">
                <div className="rounded-3xl bg-slate-950 px-6 py-10 text-center shadow-xl sm:px-10">
                    <h2 className="text-3xl font-semibold tracking-tight text-white">
                        Stop rebuilding payout reports from CSV exports.
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-300">
                        Connect Stripe and start syncing billing data into Google Sheets. The
                        14-day trial starts after sign in and setup.
                    </p>
                    <Link
                        href="/login"
                        className="mt-7 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-slate-100"
                    >
                        Start a 14-day trial
                    </Link>
                </div>
            </section>
        </main>
    );
}

function CommissionSheetPreview() {
    return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                    <p className="text-sm font-semibold text-slate-950">Commission workbook</p>
                    <p className="text-xs text-slate-500">Stripe data synced to Google Sheets</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700 ring-1 ring-emerald-100">
                    Updated hourly
                </span>
            </div>
            <div className="overflow-x-auto bg-slate-50 px-4 py-4">
                <div className="min-w-[430px] overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="grid grid-cols-[84px_repeat(4,minmax(86px,1fr))] border-b border-slate-200 bg-slate-100 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        <div className="border-r border-slate-200 px-3 py-2">Owner</div>
                        <div className="border-r border-slate-200 px-3 py-2">Gross</div>
                        <div className="border-r border-slate-200 px-3 py-2">Refunds</div>
                        <div className="border-r border-slate-200 px-3 py-2">Fees</div>
                        <div className="px-3 py-2">Net</div>
                    </div>
                    {sampleRows.slice(0, 4).map((row) => (
                        <div
                            key={row[0]}
                            className="grid grid-cols-[84px_repeat(4,minmax(86px,1fr))] border-b border-slate-100 text-xs text-slate-700 last:border-b-0"
                        >
                            {row.slice(0, 5).map((cell, index) => (
                                <div
                                    key={`${row[0]}-${cell}`}
                                    className={index === 4 ? "px-3 py-3 font-semibold text-slate-950" : "border-r border-slate-100 px-3 py-3"}
                                >
                                    {cell}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                    {["Charges", "Invoices", "Line Items", "Payouts", "Customers"].map((tab) => (
                        <span
                            key={tab}
                            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
                        >
                            {tab}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

function SamplePayoutTable() {
    return (
        <div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-[680px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
                        <tr>
                            {["Partner / Rep", "Gross", "Refunds", "Fees", "Net", "Share", "Payout"].map((heading) => (
                                <th key={heading} scope="col" className="px-4 py-3 font-semibold">
                                    {heading}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        {sampleRows.map((row) => (
                            <tr key={row[0]}>
                                {row.map((cell, index) => (
                                    <td
                                        key={`${row[0]}-${cell}`}
                                        className={index === row.length - 1 ? "px-4 py-3 font-semibold text-slate-950" : "px-4 py-3"}
                                    >
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-950">
                        <tr>
                            {["Total", "$586.00", "$15.00", "$18.29", "$552.71", "", "$82.91"].map((cell, index) => (
                                <td key={`${cell}-${index}`} className="px-4 py-3">
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>
            <p className="mt-3 text-xs leading-6 text-slate-500">
                Illustrative example using sample Stripe billing data. Net = gross minus refunds
                minus Stripe fees. Rates and ownership are yours to set.
            </p>
        </div>
    );
}
