// app/page.tsx
import Link from "next/link";

export default function HomePage() {
    const year = new Date().getFullYear();

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900">
            {/* Top nav */}
            <header className="border-b border-slate-200 bg-white/70 backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                            AS
                        </span>
                        <span className="text-sm font-semibold tracking-tight text-slate-900">
                            AutoSync
                        </span>
                    </div>

                    <nav className="flex items-center gap-4 text-sm">
                        <a
                            href="#how-it-works"
                            className="text-slate-600 hover:text-slate-900 transition"
                        >
                            How it works
                        </a>
                        <a
                            href="/pricing"
                            className="text-slate-600 hover:text-slate-900 transition"
                        >
                            Pricing
                        </a>
                        <Link
                            href="/login"
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Log in
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Hero */}
            <main className="mx-auto flex max-w-6xl flex-1 flex-col px-6 py-12 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
                <section className="max-w-xl space-y-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        Stripe → Google Sheets, continuously
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                            Keep your Stripe data in sync with Google Sheets.
                        </h1>
                        <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
                            AutoSync mirrors your Stripe business data into a single, structured Google
                            Sheet—so you can build the reports and workflows you need without wrestling
                            with exports or stale CSVs.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                        >
                            Get started →
                        </Link>
                        <span className="text-xs text-slate-500">
                            Sign in with Google. No credit card required.
                        </span>
                    </div>

                    <div
                        id="features"
                        className="grid gap-3 pt-4 text-xs text-slate-700 sm:grid-cols-3 sm:text-sm"
                    >
                        <div className="space-y-1">
                            <p className="font-semibold text-slate-900">Accurate by design</p>
                            <p className="text-slate-600">
                                One workspace per Stripe account with protected raw tabs and built-in
                                reconciliation.
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="font-semibold text-slate-900">Flexible analysis</p>
                            <p className="text-slate-600">
                                Use your own formulas, pivot tables, and charts on a dedicated Working tab.
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="font-semibold text-slate-900">Low-friction setup</p>
                            <p className="text-slate-600">
                                Guided onboarding: connect Stripe, grant Sheets access, create your
                                workspace, and start syncing in minutes.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Right side: light preview card */}
                <section
                    id="how-it-works"
                    className="mt-10 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:mt-0"
                >
                    <div className="flex items-center justify-between text-xs text-slate-600">
                        <span className="font-medium text-slate-900">Workspace preview</span>
                        <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                            Demo
                        </span>
                    </div>

                    <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between text-xs text-slate-700">
                            <span className="font-medium text-slate-900">Stripe Sync – Acme Inc.</span>
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                                Healthy
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600">
                            <div className="rounded-lg border border-slate-200 bg-white p-2">
                                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                                    Invoices
                                </p>
                                <p className="mt-1 text-sm font-medium text-slate-900">12,487</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-2">
                                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                                    Customers
                                </p>
                                <p className="mt-1 text-sm font-medium text-slate-900">3,219</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-2">
                                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                                    Last sync
                                </p>
                                <p className="mt-1 text-sm font-medium text-slate-900">Just now</p>
                            </div>
                        </div>

                        <div className="mt-2 rounded-xl border border-dashed border-slate-200 bg-white p-3">
                            <p className="text-[11px] font-medium text-slate-900">
                                Protected *_raw tabs
                            </p>
                            <p className="mt-1 text-[11px] text-slate-600">
                                System-managed raw data for Invoices, Charges, Customers, and more. Use the
                                Working tab for your own models—no more broken exports.
                            </p>
                        </div>
                    </div>
                </section>
            </main>

        </div>
    );
}
