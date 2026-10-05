// Implementation notes for Eng:
// Slug: /use-cases/stripe-subscription-dashboard-google-sheets
// Primary keywords: stripe subscription dashboard, mrr dashboard, stripe subscription status
// Long tail: see all active subscriptions in stripe, stripe past due subscriptions, export stripe subscriptions
//   to google sheets, stripe subscription status list, stripe past_due vs unpaid, stripe mrr google sheets
// FAQ: The FAQ block below is marked up as FAQPage schema with JSON-LD.

import Link from "next/link";
import { Check } from "lucide-react";
import { createMarketingMetadata } from "@/lib/marketing/seo-metadata";

const PAGE_PATH = "/use-cases/stripe-subscription-dashboard-google-sheets";

const SUBSCRIPTION_TEMPLATE_URL =
    "https://docs.google.com/spreadsheets/d/1_vo_gJYF1DurfOfCjIeR1-efnAjxK3ON0oFbK6BY3KI/copy";

export const metadata = {
    ...createMarketingMetadata({
        title: "Stripe Subscription & MRR Dashboard for Google Sheets | SyncStaq",
        description:
            "See every active, past due, and canceled Stripe subscription in one Google Sheet, with an MRR dashboard and a link to each subscription in Stripe. Free template.",
        path: PAGE_PATH,
    }),
    keywords: [
        "stripe subscription dashboard",
        "mrr dashboard",
        "stripe mrr dashboard",
        "stripe subscription status",
        "stripe subscriptions google sheets",
        "stripe active subscriptions",
        "stripe past due subscriptions",
        "export stripe subscriptions to google sheets",
        "stripe subscription status list",
        "stripe mrr google sheets",
    ],
};

const trustItems = [
    "Free Google Sheets template",
    "Active, past due, and canceled in one list",
    "One-click link to each subscription in Stripe",
    "Updates hourly with SyncStaq",
];

const tiles = [
    { label: "Active", value: "8", className: "bg-emerald-50 text-emerald-800 ring-emerald-100" },
    { label: "Past due", value: "3", className: "bg-amber-50 text-amber-800 ring-amber-100" },
    { label: "Canceled", value: "3", className: "bg-slate-100 text-slate-700 ring-slate-200" },
    { label: "MRR", value: "$1,017", className: "bg-indigo-50 text-indigo-800 ring-indigo-100" },
];

const sampleRows = [
    { status: "past_due", customer: "Cloud Ledger", product: "Pro Plan", amount: "$59.00", interval: "month" },
    { status: "past_due", customer: "Nimbus Tools", product: "Team Plan", amount: "$149.00", interval: "month" },
    { status: "active", customer: "Vector Finance", product: "Enterprise Plan", amount: "$299.00", interval: "month" },
    { status: "active", customer: "Atlas Ops", product: "Team Plan", amount: "$149.00", interval: "month" },
    { status: "active", customer: "Metric Labs", product: "Pro Plan", amount: "$79.00", interval: "month" },
    { status: "canceled", customer: "Beacon Works", product: "Pro Plan", amount: "$59.00", interval: "month" },
];

const statusBadgeClasses: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    past_due: "bg-amber-50 text-amber-800 ring-amber-100",
    canceled: "bg-slate-100 text-slate-600 ring-slate-200",
};

const featureCards = [
    {
        title: "Status counts and MRR at a glance",
        body: "Tiles at the top count active, past due, and canceled subscriptions and total your monthly recurring revenue, so the health of your subscriber base is the first thing you see.",
    },
    {
        title: "Every subscription in one list",
        body: "Customer, email, product, amount, billing interval, start date, cancel date, and end date. Past due subscriptions sort to the top because they need attention first.",
    },
    {
        title: "Filter by status",
        body: "Pick a status from the dropdown to see only past due subscriptions, only active subscribers, or only the ones that canceled.",
    },
    {
        title: "Open in Stripe",
        body: "Each row links to that subscription in the Stripe Dashboard, so you can retry a payment, update a plan, or check the invoice history without searching.",
    },
];

const painCards = [
    {
        title: "The Stripe Subscriptions page is one filter at a time",
        body: "You can filter by status in Stripe, but you cannot keep active, past due, and canceled side by side, add your own columns, or share the view with someone who has no Stripe login.",
    },
    {
        title: "A CSV export is stale the moment you download it",
        body: "Subscriptions change status every day as renewals succeed, cards fail, and customers cancel. An exported list of active subscribers needs re-exporting to stay right.",
    },
    {
        title: "Past due subscriptions are easy to miss",
        body: "A failed renewal does not cancel the subscription right away. Without a list that surfaces past due accounts, recoverable revenue quietly churns.",
    },
];

const statuses = [
    {
        status: "trialing",
        meaning: "The customer is in a free trial. The subscription becomes active when the first payment succeeds.",
        action: "Nothing yet. Watch the trial end date.",
    },
    {
        status: "active",
        meaning: "The subscription is in good standing and the latest invoice is paid.",
        action: "None. This is the list of your paying subscribers.",
    },
    {
        status: "past_due",
        meaning: "The latest renewal payment failed. Stripe keeps retrying on your retry schedule.",
        action: "Contact the customer or ask them to update their card.",
    },
    {
        status: "unpaid",
        meaning: "Retries ran out and your settings keep the subscription open instead of canceling it. New invoices are created but not charged.",
        action: "Collect payment or cancel the subscription.",
    },
    {
        status: "incomplete",
        meaning: "The first payment failed or needs customer action. The customer has about 23 hours to complete it.",
        action: "Follow up quickly, before it expires.",
    },
    {
        status: "incomplete_expired",
        meaning: "The first payment was never completed in time. The subscription never started.",
        action: "None. The customer has to subscribe again.",
    },
    {
        status: "paused",
        meaning: "A trial ended without a payment method on file and your settings pause instead of cancel.",
        action: "Ask the customer to add a payment method.",
    },
    {
        status: "canceled",
        meaning: "The subscription has ended and cannot be reactivated.",
        action: "Review the cancellation reason for churn patterns.",
    },
];

const steps = [
    {
        number: "1",
        title: "Copy the free template",
        body: "Open the template and make a copy. It comes with sample Stripe subscriptions so you can see the dashboard working before you connect anything.",
    },
    {
        number: "2",
        title: "Sync your Stripe subscriptions",
        body: "Connect Stripe to SyncStaq with read-only access. It creates a Google Sheet in your Drive with a Subscriptions_raw tab and refreshes it every hour.",
    },
    {
        number: "3",
        title: "Add the dashboard tab",
        body: "Right-click the Subscription Dashboard tab, choose Copy to, then Existing spreadsheet, and pick your SyncStaq sheet. It fills in with your own subscriptions.",
    },
];

const faqs = [
    {
        question: "How do I see all active subscriptions in Stripe?",
        answer: "In the Stripe Dashboard, open Billing, then Subscriptions, and filter by the Active status. That shows one status at a time. To see active, past due, and canceled subscriptions together, sync your subscriptions into Google Sheets and use this dashboard template, which counts each status and lists every subscription in one view.",
    },
    {
        question: "How do I export Stripe subscriptions to Google Sheets?",
        answer: "You can export a CSV from the Subscriptions page in Stripe and import it into Google Sheets, but the file is a snapshot and has to be exported again whenever statuses change. SyncStaq syncs Stripe subscriptions into a Google Sheet automatically and refreshes them every hour.",
    },
    {
        question: "What is the difference between past_due and unpaid in Stripe?",
        answer: "A subscription is past_due when its latest renewal payment failed and Stripe is still retrying. It becomes unpaid when the retries are exhausted and your billing settings leave the subscription open instead of canceling it. Past due subscriptions are usually still recoverable, which is why the dashboard sorts them to the top.",
    },
    {
        question: "Is the subscription dashboard template free?",
        answer: "Yes. The Google Sheets template is free to copy and includes sample data. SyncStaq is the paid part: it keeps the Subscriptions_raw tab filled with your live Stripe data, and it has a 14-day free trial.",
    },
    {
        question: "Can I use the template without SyncStaq?",
        answer: "Yes, if you maintain the data yourself. The dashboard reads from a tab named Subscriptions_raw and finds its columns by header name, so a manual Stripe CSV export works once its column headers are renamed to match the ones in the template. You will need to paste in a fresh export each time you want current numbers.",
    },
    {
        question: "How is MRR calculated in the dashboard?",
        answer: "MRR is the plan price multiplied by quantity for every active and past due subscription, with yearly, weekly, and daily plans converted to a monthly amount. It uses list prices, so coupons and discounts are not subtracted, and it assumes a single currency.",
    },
    {
        question: "Does the dashboard update automatically?",
        answer: "The dashboard is built from formulas, so it recalculates whenever the Subscriptions_raw tab changes. With SyncStaq that tab refreshes hourly, including subscriptions that change status after they were first synced.",
    },
    {
        question: "How many subscriptions can the template handle?",
        answer: "The template reads the first 1,000 rows of the Subscriptions_raw tab. A subscription with several items takes one row per item.",
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

export default function StripeSubscriptionDashboardPage() {
    return (
        <main className="bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />

            <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-16 pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(440px,1fr)] lg:items-center lg:pb-20 lg:pt-20">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                        Free Google Sheets template
                    </p>
                    <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                        A Stripe subscription and MRR dashboard in Google Sheets.
                    </h1>
                    <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                        See every active, past due, and canceled Stripe subscription in one
                        Sheet, with MRR at the top and a link that opens each subscription in
                        Stripe. Copy the free template, then let SyncStaq keep it current every
                        hour.
                    </p>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <a
                            href={SUBSCRIPTION_TEMPLATE_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                        >
                            Get the free template
                        </a>
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                            Start a 14-day trial
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

                <DashboardPreview />
            </section>

            <section className="border-y border-slate-200 bg-white/70">
                <div className="mx-auto max-w-6xl px-6 py-16">
                    <div className="max-w-3xl">
                        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                            Track active, past due, and canceled subscriptions in one view
                        </h2>
                        <p className="mt-4 text-base leading-8 text-slate-600">
                            The template is a single tab that reads your Stripe subscription
                            data and turns it into a report you can scan in a few seconds.
                        </p>
                    </div>
                    <div className="mt-10 grid gap-5 md:grid-cols-2">
                        {featureCards.map((card) => (
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
                <div className="max-w-3xl">
                    <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                        Why a Stripe subscription report is hard to keep current
                    </h2>
                    <p className="mt-4 text-base leading-8 text-slate-600">
                        Stripe knows the status of every subscription. Getting that into a list
                        your team can work from is the part that takes effort.
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
            </section>

            <section className="border-y border-slate-200 bg-slate-50">
                <div className="mx-auto max-w-6xl px-6 py-16">
                    <div className="max-w-3xl">
                        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                            Stripe subscription statuses, and what to do about each
                        </h2>
                        <p className="mt-4 text-base leading-8 text-slate-600">
                            The Status column in the dashboard uses Stripe&apos;s own status
                            values. This is what each one means.
                        </p>
                    </div>
                    <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <table className="min-w-[720px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
                                <tr>
                                    {["Status", "What it means", "What to do"].map((heading) => (
                                        <th key={heading} scope="col" className="px-4 py-3 font-semibold">
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {statuses.map((row) => (
                                    <tr key={row.status}>
                                        <th scope="row" className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-slate-950">
                                            {row.status}
                                        </th>
                                        <td className="px-4 py-3 leading-6">{row.meaning}</td>
                                        <td className="px-4 py-3 leading-6">{row.action}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-6 py-16">
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                    How to build the dashboard from your own Stripe data
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
                    Want to see the raw data first? Browse the{" "}
                    <Link
                        href="/sample-sheet"
                        className="font-semibold text-indigo-700 underline decoration-indigo-200 underline-offset-4 hover:text-indigo-500"
                    >
                        sample Sheet
                    </Link>
                    , read how the{" "}
                    <Link
                        href="/stripe-google-sheets-integration"
                        className="font-semibold text-indigo-700 underline decoration-indigo-200 underline-offset-4 hover:text-indigo-500"
                    >
                        Stripe to Google Sheets integration
                    </Link>{" "}
                    works, or compare it with{" "}
                    <Link
                        href="/stripe-csv-export-alternative"
                        className="font-semibold text-indigo-700 underline decoration-indigo-200 underline-offset-4 hover:text-indigo-500"
                    >
                        exporting CSVs from Stripe
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
                        Stop re-exporting your Stripe subscriptions.
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-300">
                        Copy the template, connect Stripe, and keep one subscription dashboard
                        that stays current. The 14-day trial starts after sign in and setup.
                    </p>
                    <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <a
                            href={SUBSCRIPTION_TEMPLATE_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-slate-100"
                        >
                            Get the free template
                        </a>
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
                        >
                            Start a 14-day trial
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}

function DashboardPreview() {
    return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                    <p className="text-sm font-semibold text-slate-950">Subscription Dashboard</p>
                    <p className="text-xs text-slate-500">Stripe subscriptions synced to Google Sheets</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700 ring-1 ring-emerald-100">
                    Updated hourly
                </span>
            </div>
            <div className="bg-slate-50 px-4 py-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {tiles.map((tile) => (
                        <div key={tile.label} className={`rounded-xl px-3 py-2 ring-1 ${tile.className}`}>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">{tile.label}</p>
                            <p className="mt-1 text-xl font-semibold">{tile.value}</p>
                        </div>
                    ))}
                </div>
                <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                    <table className="min-w-[440px] w-full text-left text-xs">
                        <thead className="bg-slate-100 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                            <tr>
                                {["Status", "Customer", "Product", "Amount", "Stripe"].map((heading) => (
                                    <th key={heading} scope="col" className="px-3 py-2 font-semibold">
                                        {heading}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {sampleRows.map((row) => (
                                <tr key={row.customer}>
                                    <td className="px-3 py-2.5">
                                        <span className={`rounded-full px-2 py-0.5 font-semibold ring-1 ${statusBadgeClasses[row.status]}`}>
                                            {row.status}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 font-medium text-slate-950">{row.customer}</td>
                                    <td className="px-3 py-2.5">{row.product}</td>
                                    <td className="whitespace-nowrap px-3 py-2.5">
                                        {row.amount} / {row.interval}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2.5 font-medium text-indigo-700 underline decoration-indigo-200 underline-offset-2">
                                        Open in Stripe
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                    Illustrative example using the sample data included in the template.
                </p>
            </div>
        </div>
    );
}
