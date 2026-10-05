import Image from "next/image";
import Link from "next/link";
import { createMarketingMetadata } from "@/lib/marketing/seo-metadata";

export const metadata = createMarketingMetadata({
    title: "Stripe CSV Export Alternative | SyncStaq",
    description:
        "Use SyncStaq as a Stripe CSV export alternative for recurring Google Sheets reporting. Keep Stripe billing data synced instead of rebuilding exports.",
    path: "/stripe-csv-export-alternative",
});

const primaryButton = "inline-flex min-h-12 items-center justify-center rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600";
const secondaryButton = "inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600";
const textLink = "font-semibold text-indigo-600 underline underline-offset-4 hover:text-indigo-800";
const comparisons = [
    {
        workflow: "Getting data into Sheets",
        csv: "Download the relevant CSVs, then import them into your spreadsheet.",
        syncstaq: "Sync Stripe billing records into a dedicated Google Sheet.",
    },
    {
        workflow: "Refreshing the data",
        csv: "Export and import again when you need a newer view.",
        syncstaq: "Connected billing data updates hourly.",
    },
    {
        workflow: "Changed records",
        csv: "A saved CSV does not change when an invoice or subscription changes in Stripe.",
        syncstaq: "Updated billing records are reflected through scheduled syncs.",
    },
    {
        workflow: "Reporting and labels",
        csv: "Build your own formulas, joins, pivots, and labels from the exported files.",
        syncstaq: "Build your own formulas, pivots, and labels in the Working Sheet.",
    },
    {
        workflow: "Historical snapshots",
        csv: "Keep a saved export as a point-in-time file.",
        syncstaq: "A synced Sheet reflects changing records; save a separate snapshot when you need one.",
    },
    {
        workflow: "Initial history",
        csv: "Choose the date range supported by the relevant export.",
        syncstaq: "The first sync brings in six months of billing history.",
    },
];
const reportingGuides = [
    { href: "/blog/stripe-fees-report-google-sheets", label: "Build a Stripe fees report in Sheets" },
    { href: "/blog/stripe-payout-reconciliation-google-sheets", label: "Work through payout reconciliation" },
    { href: "/blog/stripe-refund-reporting-google-sheets", label: "Report on Stripe refunds" },
];

export default function StripeCsvExportAlternativePage() {
    return (
        <main className="bg-white text-slate-950">
            <section className="bg-slate-50 py-8 text-center min-[701px]:pt-12 min-[701px]:pb-10">
                <div className="mx-auto max-w-6xl px-6">
                    <h1 className="mx-auto max-w-[760px] text-[34px] leading-tight font-semibold min-[701px]:text-[44px]">Stripe CSV export alternative</h1>
                    <p className="mx-auto mt-5 mb-6 max-w-[740px] text-lg leading-8 text-slate-600">CSV exports work for one-off analysis. For reports you refresh regularly, SyncStaq keeps Stripe billing data in Google Sheets without repeating the download-and-import cycle.</p>
                    <div className="flex flex-col justify-center gap-3 min-[701px]:flex-row">
                        <Link href="/pricing" className={primaryButton}>Start 14-day free trial</Link>
                        <a href="#comparison" className={secondaryButton}>Compare the workflows</a>
                    </div>
                </div>
            </section>

            <section id="comparison" className="mx-auto max-w-6xl px-6 py-10 min-[701px]:py-14">
                <h2 className="text-3xl leading-snug font-semibold">Manual exports or a connected Sheet?</h2>
                <p className="mt-4 mb-7 max-w-[740px] text-base leading-7 text-slate-600">The difference is how you keep the source data available. Your reporting logic still belongs to you.</p>
                <div tabIndex={0} role="region" aria-label="CSV exports compared with SyncStaq" className="overflow-auto rounded-lg border border-slate-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600">
                    <table className="w-full min-w-[710px] border-collapse text-left text-[15px] leading-7">
                        <thead className="bg-slate-100">
                            <tr>
                                <th scope="col" className="w-[21%] border-b border-slate-200 px-5 py-4 font-bold">Your workflow</th>
                                <th scope="col" className="w-[39.5%] border-b border-l border-slate-200 px-5 py-4 font-bold">Stripe CSV exports</th>
                                <th scope="col" className="w-[39.5%] border-b border-l border-slate-200 px-5 py-4 font-bold">SyncStaq</th>
                            </tr>
                        </thead>
                        <tbody>
                            {comparisons.map((row) => (
                                <tr key={row.workflow} className="[&:last-child>th]:border-b-0 [&:last-child>td]:border-b-0">
                                    <th scope="row" className="border-b border-slate-200 px-5 py-4 align-top font-bold">{row.workflow}</th>
                                    <td className="border-b border-l border-slate-200 px-5 py-4 align-top text-slate-600">{row.csv}</td>
                                    <td className="border-b border-l border-slate-200 px-5 py-4 align-top text-slate-600">{row.syncstaq}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">SyncStaq is a one-way data sync, not an accounting system or an automatic report generator.</p>
            </section>

            <section className="border-y border-slate-200 bg-slate-50 py-10 min-[701px]:py-14">
                <div className="mx-auto max-w-6xl px-6">
                    <h2 className="mb-5 text-3xl leading-snug font-semibold">Choose the approach that fits the job.</h2>
                    <div className="grid gap-6 min-[701px]:grid-cols-2 min-[701px]:gap-0">
                        <div className="min-[701px]:pr-9">
                            <h3 className="text-xl leading-snug font-semibold">Keep using CSVs when&hellip;</h3>
                            <ul className="my-5 list-disc space-y-3 pl-5 text-base leading-7 text-slate-600">
                                <li>You need a one-off answer or a file to send to someone.</li>
                                <li>You want a saved snapshot for a specific reporting period.</li>
                                <li>Occasional downloads and imports are manageable for your team.</li>
                            </ul>
                            <Link href="/blog/stripe-export-data-csv" className={textLink}>How to export Stripe data to CSV</Link>
                        </div>
                        <div className="border-t border-slate-200 pt-6 min-[701px]:border-t-0 min-[701px]:border-l min-[701px]:pt-0 min-[701px]:pl-9">
                            <h3 className="text-xl leading-snug font-semibold">Consider SyncStaq when&hellip;</h3>
                            <ul className="my-5 list-disc space-y-3 pl-5 text-base leading-7 text-slate-600">
                                <li>Your Stripe reports need recurring refreshes in Google Sheets.</li>
                                <li>You repeatedly pull together invoice, payment, customer, or subscription data.</li>
                                <li>You want updated data without maintaining a custom API script.</li>
                            </ul>
                            <Link href="/how-it-works" className={textLink}>Check how the connection works</Link>
                        </div>
                    </div>
                    <p className="mt-8 max-w-[820px] border-t border-slate-200 pt-6 text-base leading-7 text-slate-600"><strong>You still own the analysis.</strong> SyncStaq gets billing data into Sheets. You decide how to group revenue, handle refunds, label products, and interpret the results.</p>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-6 py-10 min-[701px]:py-14">
                <div className="flex flex-col gap-3 min-[701px]:flex-row min-[701px]:items-baseline min-[701px]:justify-between min-[701px]:gap-6">
                    <h2 className="text-3xl leading-snug font-semibold">See what replaces the CSV import.</h2>
                    <Link href="/sample-sheet" className={`${textLink} whitespace-nowrap`}>View Sample Sheet</Link>
                </div>
                <p className="mt-4 mb-7 max-w-[740px] text-base leading-7 text-slate-600">Explore the structured billing records before deciding whether they fit your reporting workflow.</p>
                <figure>
                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <div tabIndex={0} role="region" aria-label="Public example of synced Stripe records" className="max-h-[230px] overflow-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-indigo-600">
                            <Image src="/images/how-it-works/sample-charges.jpg" width={1280} height={720} unoptimized alt="Public SyncStaq Sample Sheet showing example charge records and customer references." className="block h-auto w-[1000px] max-w-none min-[701px]:w-full" />
                        </div>
                    </div>
                    <figcaption className="mt-3 text-sm leading-6 text-slate-600">Public Sample Sheet with example data, not a connected customer account.</figcaption>
                </figure>
                <div className="mt-8 border-t border-slate-200 pt-8">
                    <h3 className="mb-5 text-xl leading-snug font-semibold">Apply it to a reporting task</h3>
                    <div className="grid gap-6 min-[701px]:grid-cols-3">
                        {reportingGuides.map((guide) => <Link key={guide.href} href={guide.href} className={textLink}>{guide.label}</Link>)}
                    </div>
                </div>
            </section>

            <section className="border-t border-slate-200 py-12 text-center">
                <div className="mx-auto max-w-6xl px-6">
                    <h2 className="text-3xl leading-snug font-semibold">Keep your reports. Replace the repeated exports.</h2>
                    <p className="mt-4 mb-6 text-base leading-7 text-slate-600">Try SyncStaq with your own Stripe billing data in Google Sheets.</p>
                    <div className="flex flex-col justify-center gap-3 min-[701px]:flex-row">
                        <Link href="/pricing" className={primaryButton}>Start 14-day free trial</Link>
                        <Link href="/sample-sheet" className={secondaryButton}>View Sample Sheet</Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
