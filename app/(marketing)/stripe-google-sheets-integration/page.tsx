import Link from "next/link";
import { createMarketingMetadata } from "@/lib/marketing/seo-metadata";

const sampleSheetUrl =
    "https://docs.google.com/spreadsheets/d/1f4A9fwCsRk8Hsu_OJ2NjwfbfAmup6BQFuvDpDwmc7ZE/view?usp=sharing";
const sampleSheetPreviewUrl =
    "https://docs.google.com/spreadsheets/d/1f4A9fwCsRk8Hsu_OJ2NjwfbfAmup6BQFuvDpDwmc7ZE/preview";

const setupSteps = [
    {
        title: "Authorize Stripe",
        body: "Connect your Stripe account with read-only access. SyncStaq reads billing records without changing them.",
    },
    {
        title: "Create your Google Sheet",
        body: "SyncStaq creates a dedicated Sheet with structured raw tabs and a Working Sheet for your own formulas and reports.",
    },
    {
        title: "Use current billing data",
        body: "The first sync brings in six months of history. Data updates hourly, so you can report without repeating the CSV export process.",
    },
];

const approaches = [
    {
        name: "Manual CSV export",
        fit: "One-time checks and occasional analysis",
        work: "Download and import a new file when the data changes",
    },
    {
        name: "Custom API script",
        fit: "Teams with a specific data model and engineering capacity",
        work: "Maintain API access, updates, and error handling",
    },
    {
        name: "SyncStaq",
        fit: "Recurring billing reports in Google Sheets",
        work: "Use the Sheet for formulas, labels, reporting, and analysis",
    },
];

const questions = [
    {
        question: "Does SyncStaq change anything in Stripe?",
        answer: "No. The connection uses read-only Stripe access to bring billing data into your Google Sheet.",
    },
    {
        question: "How often does the Sheet update?",
        answer: "SyncStaq updates the synced data hourly. It is not a real-time feed.",
    },
    {
        question: "How much history does the first sync include?",
        answer: "The first sync brings in six months of Stripe billing history.",
    },
    {
        question: "Can I build my own reports in the Sheet?",
        answer: "Yes. Use the Working Sheet for formulas, pivots, charts, and analysis based on the synced data.",
    },
];

const textLinkClassName =
    "font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-800";
const primaryCtaClassName =
    "inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500";
const secondaryCtaClassName =
    "inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500";

export const metadata = createMarketingMetadata({
    title: "Stripe to Google Sheets Integration | SyncStaq",
    description:
        "Connect Stripe to Google Sheets with SyncStaq. Get a dedicated Sheet, six months of billing history, structured raw tabs, and hourly updates for reporting.",
    path: "/stripe-google-sheets-integration",
});

export default function StripeGoogleSheetsIntegrationPage() {
    return (
        <main className="bg-white text-slate-900">
            <section className="mx-auto max-w-6xl px-6 pb-14 pt-14 sm:pt-16 lg:pb-16">
                <p className="text-xs font-semibold uppercase text-emerald-700">
                    Stripe to Google Sheets integration
                </p>
                <h1 className="mt-4 max-w-5xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
                    Connect Stripe to Google Sheets and keep billing data current.
                </h1>
                <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
                    Get Stripe billing data in a dedicated Google Sheet, starting with six months of
                    history. SyncStaq updates the data hourly, so you can build reports on the
                    Working Sheet.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Link href="/pricing" className={primaryCtaClassName}>
                        Start 14-day free trial
                    </Link>
                    <a
                        href={sampleSheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={secondaryCtaClassName}
                    >
                        View sample Sheet
                    </a>
                </div>
                <ul className="mt-7 flex flex-wrap gap-x-7 gap-y-2 text-sm text-slate-600">
                    <li>Read-only Stripe access</li>
                    <li>App-created Google Sheet</li>
                    <li>Hourly updates</li>
                </ul>
            </section>

            <section className="border-t border-slate-200 bg-slate-50">
                <div className="mx-auto max-w-6xl px-6 py-14 lg:py-16">
                    <h2 className="text-3xl font-semibold text-slate-950 sm:text-4xl">
                        See the Sheet you can build on.
                    </h2>
                    <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                        The public sample shows the Working Sheet and the raw tabs that hold Stripe
                        billing data. {" "}
                        <Link href="/sample-sheet" className={textLinkClassName}>
                            See how a connected Stripe Sheet is structured
                        </Link>
                        .
                    </p>
                    <div className="mt-8 overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-5 py-3 text-sm">
                            <span className="font-semibold text-slate-800">SyncStaq public sample Sheet</span>
                            <a
                                href={sampleSheetUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={textLinkClassName}
                            >
                                Open full Sheet
                            </a>
                        </div>
                        <iframe
                            title="SyncStaq public sample Google Sheet"
                            src={sampleSheetPreviewUrl}
                            loading="lazy"
                            className="block h-[340px] w-full border-0 sm:h-[420px]"
                        />
                    </div>
                    <p className="mt-3 text-sm text-slate-500">
                        If the preview does not load, open the full sample Sheet above.
                    </p>
                </div>
            </section>

            <section className="border-t border-slate-200">
                <div className="mx-auto max-w-6xl px-6 py-14 lg:py-16">
                    <h2 className="text-3xl font-semibold text-slate-950 sm:text-4xl">
                        How the connection works
                    </h2>
                    <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                        Three steps take you from a Stripe account to a spreadsheet you can use for
                        recurring work.
                    </p>
                    <div className="mt-9 grid gap-8 md:grid-cols-3">
                        {setupSteps.map((step, index) => (
                            <div key={step.title} className="border-t-2 border-slate-300 pt-5">
                                <span className="text-sm font-bold text-emerald-700">{index + 1})</span>
                                <h3 className="mt-4 text-xl font-semibold text-slate-950">{step.title}</h3>
                                <p className="mt-2 leading-7 text-slate-600">{step.body}</p>
                            </div>
                        ))}
                    </div>
                    <p className="mt-7 text-sm text-slate-600">
                        For the full setup flow, see {" "}
                        <Link href="/how-it-works" className={textLinkClassName}>
                            how SyncStaq works
                        </Link>
                        .
                    </p>
                </div>
            </section>

            <section className="border-t border-slate-200 bg-slate-50">
                <div className="mx-auto max-w-6xl px-6 py-14 lg:py-16">
                    <h2 className="text-3xl font-semibold text-slate-950 sm:text-4xl">
                        Which route fits your reporting workflow?
                    </h2>
                    <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                        You can get Stripe data into Sheets in several ways. The main difference is
                        how much repeat work or maintenance you want to own.
                    </p>
                    <div className="mt-8 border-y border-slate-300">
                        <div className="hidden grid-cols-[1fr_1.4fr_1.6fr] gap-6 border-b border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 md:grid">
                            <span>Approach</span>
                            <span>Good fit</span>
                            <span>Ongoing work</span>
                        </div>
                        {approaches.map((approach) => (
                            <div
                                key={approach.name}
                                className="grid gap-4 border-b border-slate-200 px-4 py-5 last:border-b-0 md:grid-cols-[1fr_1.4fr_1.6fr] md:gap-6"
                            >
                                <h3 className="font-semibold text-slate-950">{approach.name}</h3>
                                <p className="text-slate-600">
                                    <span className="mb-1 block text-xs font-semibold text-slate-500 md:hidden">
                                        Good fit
                                    </span>
                                    {approach.fit}
                                </p>
                                <p className="text-slate-600">
                                    <span className="mb-1 block text-xs font-semibold text-slate-500 md:hidden">
                                        Ongoing work
                                    </span>
                                    {approach.work}
                                </p>
                            </div>
                        ))}
                    </div>
                    <p className="mt-6 max-w-4xl leading-7 text-slate-600">
                        For a deeper comparison, read about {" "}
                        <Link href="/stripe-csv-export-alternative" className={textLinkClassName}>
                            moving beyond repeated Stripe CSV exports
                        </Link>{" "}
                        or {" "}
                        <Link
                            href="/blog/stripe-export-google-sheets-automatically"
                            className={textLinkClassName}
                        >
                            exporting Stripe data to Google Sheets automatically
                        </Link>
                        .
                    </p>
                </div>
            </section>

            <section className="border-t border-slate-200">
                <div className="mx-auto max-w-6xl px-6 py-14 lg:py-16">
                    <h2 className="text-3xl font-semibold text-slate-950 sm:text-4xl">
                        Common questions
                    </h2>
                    <div className="mt-7 max-w-4xl border-b border-slate-200">
                        {questions.map((item) => (
                            <details key={item.question} className="border-t border-slate-200 py-5">
                                <summary className="cursor-pointer font-semibold text-slate-900">
                                    {item.question}
                                </summary>
                                <p className="mt-3 leading-7 text-slate-600">{item.answer}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            <section className="border-t border-slate-200 bg-blue-50">
                <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-7 px-6 py-14 lg:flex-row lg:items-center">
                    <div>
                        <h2 className="text-3xl font-semibold text-slate-950">
                            Work from a Stripe-connected Sheet.
                        </h2>
                        <p className="mt-2 text-slate-600">
                            Keep billing data available for reporting without rebuilding exports
                            each time.
                        </p>
                    </div>
                    <Link href="/pricing" className={primaryCtaClassName}>
                        Start 14-day free trial
                    </Link>
                </div>
            </section>
        </main>
    );
}
