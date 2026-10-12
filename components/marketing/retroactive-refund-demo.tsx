"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, RotateCcw, ChevronRight, ChevronLeft } from "lucide-react";
import { ReportingOutcomeLink } from "@/components/analytics/reporting-outcome-link";
import { refundExample, getRefundExampleState, refundExampleSteps } from "@/lib/marketing/retroactive-refund-example";

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const control = "inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";
const cell = "border-b border-slate-200 px-3 py-3 text-right tabular-nums";

export function RetroactiveRefundDemo() {
    const [step, setStep] = useState(0);
    const state = getRefundExampleState(step);
    const current = refundExampleSteps[step];
    const updated = step === 2;

    return (
        <section aria-labelledby="refund-demo-heading" className="border-y border-slate-200 bg-white py-10 min-[701px]:py-14">
            <div className="mx-auto max-w-6xl px-6">
                <div className="flex flex-wrap items-start justify-between gap-5">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold text-emerald-700">Illustrative example</p>
                        <h2 id="refund-demo-heading" className="mt-2 text-2xl font-semibold leading-snug text-slate-950">
                            A late refund changes an earlier month&apos;s report.
                        </h2>
                        <p className="mt-3 text-base leading-7 text-slate-600">
                            Synthetic data, not a recording of a live sync. SyncStaq syncs hourly;
                            your formulas recalculate when the synced source values change.
                        </p>
                    </div>
                    <div className="flex items-center gap-2" aria-label="Example steps">
                        <button type="button" className={control} onClick={() => setStep(0)} title="Reset example" aria-label="Reset example" disabled={step === 0}><RotateCcw size={18} /></button>
                        <button type="button" className={control} onClick={() => setStep(step - 1)} title="Previous step" aria-label="Previous step" disabled={step === 0}><ChevronLeft size={18} /></button>
                        <span className="w-12 text-center text-sm tabular-nums text-slate-600">{step + 1} / 3</span>
                        <button type="button" className={control} onClick={() => setStep(step + 1)} title="Next step" aria-label="Next step" disabled={step === 2}><ChevronRight size={18} /></button>
                    </div>
                </div>

                <div className="mt-6 min-h-44 border-l-2 border-emerald-600 bg-emerald-50 px-4 py-3 sm:min-h-24" role="status" aria-live="polite" aria-atomic="true">
                    <p className="font-semibold text-slate-950">{current.label}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{current.detail}</p>
                </div>

                <div className="mt-7 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24px_minmax(0,1.5fr)]">
                    <div className="min-w-0">
                        <h3 className="text-base font-semibold">Illustrative Stripe record</h3>
                        <p className="mt-1 text-sm text-slate-500">A succeeded charge created in May 2026</p>
                        <dl className="mt-4 divide-y divide-slate-200 border-y border-slate-200 text-sm">
                            <div className="flex justify-between gap-4 py-3"><dt>Charge amount</dt><dd className="tabular-nums">{money(refundExample.amountCents)}</dd></div>
                            <div className="flex justify-between gap-4 py-3"><dt>Charge fee</dt><dd className="tabular-nums">{money(refundExample.feeCents)}</dd></div>
                            <div className={`flex justify-between gap-4 py-3 ${step > 0 ? "font-semibold text-emerald-800" : ""}`}><dt>Refunded to date</dt><dd className="tabular-nums">{money(state.stripeRefundCents)}</dd></div>
                        </dl>
                        <p className="mt-3 min-h-6 text-sm font-medium text-slate-600">{step > 0 ? "Updated in this illustration" : "Before the later refund"}</p>
                    </div>
                    <ArrowRight className="mt-16 hidden text-slate-400 lg:block" size={24} aria-hidden="true" />
                    <div className="min-w-0">
                        <h3 className="text-base font-semibold">Synced source row in Sheets</h3>
                        <p className="mt-1 text-sm text-slate-500">Charges_raw &middot; existing row, not a new charge</p>
                        <div className="mt-4 overflow-x-auto border-y border-slate-200" tabIndex={0} role="region" aria-label="Illustrative synced charge row">
                            <table className="w-full min-w-[420px] text-sm">
                                <thead className="bg-slate-50"><tr>
                                    <th scope="col" className={`${cell} text-left font-semibold`}>Created (UTC)</th>
                                    <th scope="col" className={`${cell} font-semibold`}>Amount</th>
                                    <th scope="col" className={`${cell} font-semibold`}>Fee</th>
                                    <th scope="col" className={`${cell} font-semibold`}>Amount Refunded</th>
                                </tr></thead>
                                <tbody><tr>
                                    <td className={`${cell} text-left`}>May 2026</td>
                                    <td className={cell}>{money(refundExample.amountCents)}</td>
                                    <td className={cell}>{money(refundExample.feeCents)}</td>
                                    <td className={`${cell} ${updated ? "bg-emerald-50 font-semibold text-emerald-800" : ""}`}>{money(state.sheetRefundCents)}</td>
                                </tr></tbody>
                            </table>
                        </div>
                        <p className={`mt-3 min-h-6 text-sm font-medium ${step === 1 ? "text-amber-800" : "text-slate-600"}`}>
                            {step === 1 ? "Awaiting the next hourly sync in this illustration" : updated ? "Existing row updated in this illustration" : "Source row before the later refund"}
                        </p>
                    </div>
                </div>

                <div className="mt-8 border-t border-slate-200 pt-6">
                    <h3 className="text-lg font-semibold">Working Sheet &middot; Fees and Refunds</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Your report formula: charge amount - cumulative refunds - charge fee.</p>
                    <div className="mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label="Illustrative Working Sheet report">
                        <table className="w-full min-w-[550px] text-sm">
                            <thead className="bg-slate-50"><tr>
                                {['Charge month', 'Charges', 'Refunded to date', 'Charge fees', 'After fees & refunds'].map((label, i) => <th key={label} scope="col" className={`${cell} font-semibold ${i === 0 ? "text-left" : ""}`}>{label}</th>)}
                            </tr></thead>
                            <tbody><tr>
                                <th scope="row" className={`${cell} text-left font-medium`}>{refundExample.chargeMonth}</th>
                                <td className={cell}>{money(refundExample.amountCents)}</td>
                                <td className={`${cell} ${updated ? "bg-emerald-50 text-emerald-800" : ""}`}>{money(state.sheetRefundCents)}</td>
                                <td className={cell}>{money(refundExample.feeCents)}</td>
                                <td className={`${cell} font-semibold ${updated ? "bg-emerald-50 text-emerald-800" : ""}`}>{money(state.reportAfterFeesCents)}</td>
                            </tr><tr className="bg-slate-50">
                                <th scope="row" className={`${cell} text-left font-semibold`}>Year total in sample</th>
                                <td className={cell}>$1,037.00</td>
                                <td className={cell}>{money(state.annualRefundCents)}</td>
                                <td className={cell}>$33.82</td>
                                <td className={`${cell} font-semibold`}>{money(state.annualAfterFeesCents)}</td>
                            </tr></tbody>
                        </table>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                        The refund restates the original charge month, not the month it was issued.
                        This is not a payout or an accounting report; dispute costs and other balance adjustments are excluded.
                    </p>
                </div>

                <details className="mt-6 border-t border-slate-200 pt-4">
                    <summary className="cursor-pointer text-base font-semibold text-slate-900">See the existing finished Working Sheet</summary>
                    <figure className="mt-4">
                        <div className="relative aspect-[1440/530] overflow-hidden border border-slate-200">
                            <Image src="/templates/fees-and-refunds/monthly-overview.jpg" width={1440} height={720} unoptimized alt="Existing Fees and Refunds template: May charges 49, refunds 20, fees 1.72, after fees and refunds 27.28; year total 889.18 before the illustrative update." className="block h-auto w-full -translate-y-[19.44%]" />
                        </div>
                        <figcaption className="mt-3 text-sm leading-6 text-slate-600">Existing public template screenshot, before the illustrative update. SyncStaq supplies the synced data; the copied template supplies formulas and charts you maintain.</figcaption>
                    </figure>
                </details>
                <p className="mt-5 text-base">
                    <ReportingOutcomeLink originPath="/sample-sheet" destinationPath="/templates/stripe-fees-and-refunds" placement="retroactive-refund-example" outcome="fees-and-refunds" className="font-semibold text-indigo-700 underline underline-offset-4 hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">Explore the Fees and Refunds template</ReportingOutcomeLink>
                </p>
            </div>
        </section>
    );
}
