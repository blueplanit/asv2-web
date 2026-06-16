import Link from "next/link";

const stripeObjects = [
    "Invoices",
    "Line items",
    "Charges",
    "Customers",
    "Payouts",
    "Subscriptions",
    "Disputes",
];

const setupSteps = [
    {
        title: "Connect Stripe",
        body:
            "Authorize read-only Stripe billing data access through OAuth. SyncStaq does not create, edit, refund, or cancel Stripe records.",
    },
    {
        title: "Create your Google Sheet",
        body:
            "SyncStaq creates a dedicated Sheet with raw tabs and a Working Sheet for your own formulas and reports.",
    },
    {
        title: "Backfill, then sync hourly",
        body:
            "The first sync backfills 6 months of Stripe history. After that, ongoing sync keeps the Sheet updated every hour.",
    },
];

export default function HowItWorksPage() {
    return (
        <main className="bg-white text-slate-950">
            <section className="border-b border-slate-200 bg-slate-50">
                <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:py-20">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                            How SyncStaq works
                        </p>
                        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                            From Stripe to a structured Google Sheet.
                        </h1>
                        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
                            SyncStaq connects to Stripe with read-only access, creates a dedicated
                            Google Sheet, backfills recent history, and keeps your raw tabs updated
                            hourly.
                        </p>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Link
                                href="/pricing"
                                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                Start 14-day free trial
                            </Link>
                            <Link
                                href="/sample-sheet"
                                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                            >
                                View sample Sheet
                            </Link>
                        </div>
                        <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
                            <span>Read-only Stripe access</span>
                            <span aria-hidden="true">•</span>
                            <span>App-created Google Sheet</span>
                            <span aria-hidden="true">•</span>
                            <span>Hourly sync</span>
                        </div>
                    </div>

                    <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="space-y-4">
                            {setupSteps.map((step, index) => (
                                <div key={step.title} className="flex gap-4 rounded-xl bg-slate-50 p-4">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                                        {index + 1}
                                    </span>
                                    <div>
                                        <h2 className="text-sm font-semibold text-slate-950">{step.title}</h2>
                                        <p className="mt-1 text-sm leading-6 text-slate-600">{step.body}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </aside>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-6 py-14 lg:py-20">
                <div className="grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)]">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">01</p>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                            What lands in your Sheet
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                            Start with the raw Stripe billing data teams usually have to export and
                            clean manually.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-950">Structured raw tabs</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            Stripe billing data is written into raw tabs so you can build
                            spreadsheet-native reporting without re-exporting CSVs.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2">
                            {stripeObjects.map((item) => (
                                <span
                                    key={item}
                                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                                >
                                    {item}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-12 grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)]">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">02</p>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                            What you do after sync
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                            SyncStaq handles the Stripe-to-Sheets layer. Your team keeps working in
                            Sheets.
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-950">Reporting</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Report on revenue, fees, customers, products, and subscriptions from
                                the Working Sheet.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-950">Reconciliation</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Review payout, invoice, and charge context without rebuilding exports
                                each week.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-12 grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)]">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">03</p>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                            What SyncStaq does not do
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                            Know what SyncStaq does, and what stays under your control.
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-950">Stripe stays unchanged</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                SyncStaq does not change Stripe records, process payments, issue
                                refunds, or manage subscriptions.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-950">Not financial advice</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                SyncStaq does not replace accounting, tax, legal, or financial advice
                                workflows.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-12 grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)]">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">04</p>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                            Why not just export CSVs?
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                            Exports are fine once. They break down when reporting becomes a recurring
                            workflow.
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-950">Recurring reporting</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                SyncStaq is for Stripe-to-Sheets workflows where stale data and
                                repeated cleanup become the problem.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-950">No script ownership</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                No custom API keys, event handling, sheet-writing code, or
                                browser-export automation required.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
