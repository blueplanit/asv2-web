import type { Metadata } from "next";
import Link from "next/link";
import { MailerLiteCommissionForm } from "@/components/marketing/mailerlite-commission-form";
import { CommissionWorkbookPreview } from "@/components/marketing/commission-workbook-preview";

const title = "Free Stripe Commission & Revenue Share Template | SyncStaq";
const description =
    "Calculate Stripe commissions and partner revenue share in Google Sheets. Get a free tracker with owner rates, fee and refund settings, and payout summaries.";
const path = "/use-cases/stripe-commission-revenue-share";

export const metadata: Metadata = {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, type: "website", url: path },
    twitter: { card: "summary_large_image", title, description },
};

const faqs = [
    {
        question: "Is the commission tracker really free?",
        answer: "Yes. You can use the Google Sheets template with manually imported Stripe exports without a SyncStaq subscription. SyncStaq is an optional paid service for keeping Stripe source data updated in Sheets.",
    },
    {
        question: "Does the free template connect to Stripe automatically?",
        answer: "No. The free workflow uses CSV Import and a values-only paste into Charges. The workbook's calculations use the data you provide; a manual report is only as current as your last import.",
    },
    {
        question:
            "Can I calculate both rep commissions and partner revenue share?",
        answer: "Yes. Owners & Rates includes reps and partners, and Customer to Owner assigns customers to them. The calculation applies the assigned owner's percentage to the selected base.",
    },
    {
        question: "Does net always mean the same thing?",
        answer: "No. In this workbook, Net deducts Stripe fees, and you can separately enable refund deductions. Your agreement may define a different base, so review the formulas before using the results.",
    },
    {
        question: "Will it handle retroactive refunds and clawbacks?",
        answer: "Updated refund amounts can change the calculated commission when the source data is refreshed. The workbook does not automatically track what you already paid or implement a separate clawback ledger; decide and record those adjustments in your own workflow.",
    },
    {
        question: "Which Stripe CSV should I use?",
        answer: "Use an export with fee detail, such as an itemized balance or payout reconciliation report. A basic Payments CSV may not include fees. Match your exported columns to the CSV Import headers and verify amounts, refunds, units, and currency before calculating.",
    },
];
const features = [
    {
        title: "Owners and rates",
        body: "Add reps or partners in Owners & Rates, then assign customers in Customer to Owner. Each owner has a percentage rate.",
    },
    {
        title: "A defined commission base",
        body: "Choose Gross or Net in Settings. Net deducts Stripe fees; a separate setting controls whether refunds are deducted.",
    },
    {
        title: "Calculations you can inspect",
        body: "Commission Calc shows the charge, owner, base, rate, and commission. Payout Summary groups the results by owner and month.",
    },
];
const steps = [
    {
        title: "Bring in Stripe data",
        body: "Use an export that includes fee detail. Paste it into CSV Import, match the expected columns, then paste the mapped values into Charges.",
    },
    {
        title: "Set your base and ownership",
        body: "Choose your settings, enter owner rates, and map each customer to an owner. Check unassigned customers before approving a report.",
    },
    {
        title: "Review, then arrange payment",
        body: "Inspect Commission Calc and filter Payout Summary by month. The workbook calculates amounts; it does not send money to reps or partners.",
    },
];
const sampleRows = [
    ["Demo Growth Co", "$99.00", "$0.00", "$3.20", "$95.80", "20%", "$19.16"],
    ["Demo Refund Co", "$49.00", "$20.00", "$1.72", "$27.28", "15%", "$4.09"],
];
const wrap = "mx-auto max-w-6xl px-6";
const heading = "text-3xl font-semibold leading-tight text-slate-950";
const body = "text-base leading-7 text-slate-600";
const eyebrow = "mb-4 text-xs font-semibold uppercase text-indigo-600";
const button =
    "inline-flex min-h-12 items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600";
const inlineLink =
    "font-medium text-indigo-600 underline underline-offset-4 hover:text-indigo-500";

export default function StripeCommissionRevenueSharePage() {
    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map(({ question, answer }) => ({
            "@type": "Question",
            name: question,
            acceptedAnswer: { "@type": "Answer", text: answer },
        })),
    };
    return (
        <main className="bg-white text-slate-900">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c"),
                }}
            />
            <section className="bg-slate-50 py-12 text-center sm:py-16">
                <div className={wrap}>
                    <p className={eyebrow}>Free Google Sheets template</p>
                    <h1 className="mx-auto max-w-4xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
                        Stripe Commission &amp; Revenue Share Tracker for Google
                        Sheets
                    </h1>
                    <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600">
                        Calculate rep commissions and partner revenue share from
                        Stripe data. Set owner rates, choose a gross or net
                        base, and review payouts by month.
                    </p>
                    <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                        <a href="#get-template" className={button}>
                            Email me the free template
                        </a>
                        <a
                            href="#preview"
                            className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600"
                        >
                            Preview the workbook
                        </a>
                    </div>
                    <ul className="mt-6 flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm text-slate-600">
                        {[
                            "Free to use with CSV exports",
                            "Editable formulas and rates",
                            "No SyncStaq subscription required",
                        ].map((item) => (
                            <li
                                key={item}
                                className="border-l-2 border-emerald-600 pl-3"
                            >
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            <section
                id="preview"
                className={`${wrap} scroll-mt-8 py-12 sm:py-16`}
            >
                <div className="mb-8 max-w-3xl">
                    <p className={eyebrow}>Inside the actual template</p>
                    <h2 className={heading}>
                        From Stripe rows to a payout summary.
                    </h2>
                    <p className={`mt-4 ${body}`}>
                        Map customers to reps or partners, apply their rates,
                        and trace each commission back to its charge. Here are
                        three views from the workbook.
                    </p>
                </div>
                <CommissionWorkbookPreview />
            </section>

            <section className="bg-slate-50 py-12 sm:py-16">
                <div className={wrap}>
                    <h2 className={heading}>
                        The pieces you need to calculate a payout.
                    </h2>
                    <div className="mt-8 grid gap-8 md:grid-cols-3">
                        {features.map((feature) => (
                            <div
                                key={feature.title}
                                className="border-t-2 border-slate-200 pt-6"
                            >
                                <h3 className="text-xl font-semibold">
                                    {feature.title}
                                </h3>
                                <p className={`mt-3 ${body}`}>{feature.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section
                id="get-template"
                className={`${wrap} grid scroll-mt-8 gap-10 py-12 md:grid-cols-2 md:gap-16 sm:py-16`}
            >
                <div>
                    <p className={eyebrow}>Get the free workbook</p>
                    <h2 className={heading}>
                        A starting point for your next commission report.
                    </h2>
                    <p className={`mt-4 ${body}`}>
                        Receive the Google Sheets template by email, make your
                        own copy, and adapt it to your agreements.
                    </p>
                    <ul className="mt-6 space-y-4 text-slate-600">
                        {[
                            "Sample data and a CSV Import mapping workflow",
                            "Editable owner rates and customer assignments",
                            "Gross/net settings and optional refund deductions",
                            "Charge-level calculations and monthly summaries",
                        ].map((item) => (
                            <li
                                key={item}
                                className="border-l-2 border-emerald-600 pl-4"
                            >
                                {item}
                            </li>
                        ))}
                    </ul>
                    <p className="mt-6 text-sm text-slate-600">
                        The template is free. SyncStaq is optional and has
                        separate pricing.
                    </p>
                </div>
                <MailerLiteCommissionForm />
            </section>

            <section className="bg-slate-50 py-12 sm:py-16">
                <div className={wrap}>
                    <div className="mb-8 max-w-3xl">
                        <p className={eyebrow}>A worked example</p>
                        <h2 className={heading}>See what a refund changes.</h2>
                        <p className={`mt-4 ${body}`}>
                            With a net base and refund deductions enabled, the
                            template calculates: amount collected minus Stripe
                            fee minus refunded amount, then multiplies the
                            result by the owner&apos;s rate.
                        </p>
                    </div>
                    <div
                        className="overflow-x-auto rounded-lg border border-slate-200 focus-visible:outline-2 focus-visible:outline-indigo-600"
                        tabIndex={0}
                        role="region"
                        aria-label="Sample commission calculations"
                    >
                        <table className="w-full min-w-[650px] border-collapse text-left text-sm">
                            <thead className="bg-slate-100 text-slate-900">
                                <tr>
                                    {[
                                        "Example customer",
                                        "Collected",
                                        "Refunded",
                                        "Stripe fee",
                                        "Base",
                                        "Rate",
                                        "Commission",
                                    ].map((label) => (
                                        <th
                                            key={label}
                                            scope="col"
                                            className="border-b border-slate-200 p-4 font-semibold"
                                        >
                                            {label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sampleRows.map((row) => (
                                    <tr
                                        key={row[0]}
                                        className="border-b border-slate-200 last:border-0"
                                    >
                                        {row.map((cell, index) => (
                                            <td
                                                key={index}
                                                className={`p-4 ${index === 6 ? "font-semibold text-emerald-700" : "text-slate-600"} ${index > 0 ? "whitespace-nowrap tabular-nums" : ""}`}
                                            >
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-6 border-l-2 border-slate-300 pl-4 text-sm leading-6 text-slate-600">
                        Your agreement defines the commissionable base. Do not
                        deduct discounts again if they are already reflected in
                        the collected amount. Review taxes, disputes, currency,
                        rounding, and post-payout adjustments separately; this
                        template is not a full commission-management or
                        accounting system.
                    </p>
                </div>
            </section>

            <section className={`${wrap} py-12 sm:py-16`}>
                <h2 className={heading}>
                    Start with an export. Keep the rules yours.
                </h2>
                <div className="mt-8 grid gap-8 md:grid-cols-3">
                    {steps.map((step, index) => (
                        <div key={step.title}>
                            <p className="mb-3 text-2xl font-semibold text-indigo-600">
                                {index + 1})
                            </p>
                            <h3 className="text-xl font-semibold">
                                {step.title}
                            </h3>
                            <p className={`mt-3 ${body}`}>{step.body}</p>
                        </div>
                    ))}
                </div>
                <p className="mt-6 text-sm leading-6 text-slate-600">
                    Rates use the owner lookup. Effective-date and refund-policy
                    labels are not automatic rules in the current formulas;
                    adapt the calculation if your agreement requires them.
                </p>
            </section>

            <section className="bg-emerald-50 py-12 sm:py-16">
                <div
                    className={`${wrap} grid items-center gap-10 md:grid-cols-2 md:gap-16`}
                >
                    <div>
                        <p className={eyebrow}>
                            Optional: stop repeating CSV exports
                        </p>
                        <h2 className={heading}>
                            The template does the math.
                            <br />
                            SyncStaq keeps the source data moving.
                        </h2>
                        <p className={`mt-4 ${body}`}>
                            SyncStaq keeps Stripe billing data available in
                            Google Sheets for reporting, reconciliation, and
                            analysis. Updates run hourly, with six months of
                            history included in the first sync.
                        </p>
                        <p className={`mt-4 ${body}`}>
                            Use that data with your commission workflow. You
                            still own the customer mapping, rates, formulas, and
                            payout decisions.
                        </p>
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold">
                            Use the free template first.
                        </h3>
                        <p className={`mt-3 ${body}`}>
                            No subscription is needed for the manual CSV
                            workflow. When recurring exports become the
                            bottleneck, connect Stripe to Google Sheets with
                            read-only access through SyncStaq.
                        </p>
                        <Link href="/login" className={`mt-6 ${button}`}>
                            Start a 14-day free trial
                        </Link>
                        <p className="mt-4 text-sm">
                            <Link href="/how-it-works" className={inlineLink}>
                                See how SyncStaq works
                            </Link>
                            {" · "}
                            <Link href="/pricing" className={inlineLink}>
                                View pricing
                            </Link>
                        </p>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
                <h2 className={heading}>Template questions, answered.</h2>
                <div className="mt-6">
                    {faqs.map((faq, index) => (
                        <details
                            key={faq.question}
                            open={index === 0}
                            className="border-b border-slate-200 py-5"
                        >
                            <summary className="cursor-pointer text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600">
                                {faq.question}
                            </summary>
                            <p className={`mt-4 ${body}`}>{faq.answer}</p>
                        </details>
                    ))}
                </div>
                <p className={`mt-7 ${body}`}>
                    For the reporting workflow, read our{" "}
                    <Link
                        href="/blog/stripe-partner-revenue-share"
                        className={inlineLink}
                    >
                        Stripe partner revenue share guide
                    </Link>{" "}
                    or learn about{" "}
                    <Link
                        href="/blog/stripe-fees-report-google-sheets"
                        className={inlineLink}
                    >
                        reporting Stripe fees in Google Sheets
                    </Link>
                    .
                </p>
            </section>
        </main>
    );
}
