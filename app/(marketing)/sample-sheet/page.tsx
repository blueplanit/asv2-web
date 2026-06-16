import Link from "next/link";

const SAMPLE_SHEET_URL =
    "https://docs.google.com/spreadsheets/d/1KvTHaQhWPHWYkficjgwVfzLw4ft_rPobd2GQ9MMPy6k/edit?usp=sharing";

const tabs = ["Working Sheet", "Invoices_raw", "Charges_raw", "Subscriptions_raw"];

export default function SampleSheetPage() {
    return (
        <main className="bg-white text-slate-950">
            <section className="border-b border-slate-200 bg-slate-50">
                <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:py-20">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                            Public sample Sheet
                        </p>
                        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                            See how SyncStaq structures Stripe data in Google Sheets.
                        </h1>
                        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
                            Explore the public SyncStaq sample Sheet to see raw Stripe tabs and
                            example reports on the Working Sheet. Then use SyncStaq to create a new
                            Sheet synced with your own Stripe billing data.
                        </p>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <a
                                href={SAMPLE_SHEET_URL}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                            >
                                View sample Sheet
                            </a>
                            <Link
                                href="/pricing"
                                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                Create my synced Sheet
                            </Link>
                        </div>
                        <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
                            <span>Public sample data</span>
                            <span aria-hidden="true">•</span>
                            <span>Raw Stripe tabs</span>
                            <span aria-hidden="true">•</span>
                            <span>Working Sheet for formulas</span>
                        </div>
                    </div>

                    <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                            <span className="text-sm font-semibold text-slate-800">Working Sheet examples</span>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                Sample
                            </span>
                        </div>
                        <div className="p-5">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-xs text-slate-500">Total revenue</p>
                                    <p className="mt-1 text-xl font-semibold text-slate-950">$48.2k</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-xs text-slate-500">Fees</p>
                                    <p className="mt-1 text-xl font-semibold text-slate-950">$1.6k</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-xs text-slate-500">Net</p>
                                    <p className="mt-1 text-xl font-semibold text-slate-950">$46.6k</p>
                                </div>
                            </div>
                            <div className="mt-5 flex h-36 items-end gap-3 rounded-xl bg-slate-50 p-4">
                                {[58, 72, 48, 86, 64, 93].map((height, index) => (
                                    <div
                                        key={index}
                                        className="flex-1 rounded-t-lg bg-emerald-500"
                                        style={{ height: `${height}%` }}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 border-t border-slate-200 px-5 py-3">
                            {tabs.map((tab, index) => (
                                <span
                                    key={tab}
                                    className={
                                        index === 0
                                            ? "rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white"
                                            : "rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                                    }
                                >
                                    {tab}
                                </span>
                            ))}
                        </div>
                    </aside>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-6 py-14 lg:py-20">
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-950">What the sample shows</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            How synced invoices, charges, fees, and product fields can support
                            spreadsheet-native reporting.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-950">What SyncStaq creates</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            A new Google Sheet with tabs for your own Stripe data and a Working
                            Sheet for formulas and reports.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-950">Create your dashboards</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            Build charts, pivots, and reports from synced raw tabs so your dashboards
                            update as SyncStaq keeps the Sheet current.
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}
