// components/pricing/pricing-client.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type BillingInterval = "monthly" | "yearly";

type PricingClientProps = {
    isLoggedIn: boolean;
};

export function PricingClient({ isLoggedIn }: PricingClientProps) {
    const [interval, setInterval] = useState<BillingInterval>("monthly");
    const [loading, setLoading] = useState(false);

    const priceDisplay = interval === "monthly" ? "$15" : "$129";
    const intervalLabel = interval === "monthly" ? "/month" : "/year";

    async function handleSelectPlan() {
        if (!isLoggedIn) {
            await signIn("google", { callbackUrl: "/pricing" });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/billing/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId: "pro", interval }),
            });
            if (!res.ok) {
                console.error("Failed to create checkout session");
                setLoading(false);
                return;
            }
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                setLoading(false);
            }
        } catch (err) {
            console.error("Error starting checkout", err);
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
            <main className="mx-auto max-w-5xl px-4 py-16 space-y-12">
                {/* Hero */}
                <section className="text-center space-y-4">
                    <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
                        Simple pricing for automated Stripe → Sheets sync.
                    </h1>
                    <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
                        No long-term contracts. Cancel anytime.
                    </p>
                </section>

                {/* Billing toggle */}
                <section className="flex justify-center">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 text-xs font-medium text-slate-700">
                        <button
                            type="button"
                            onClick={() => setInterval("monthly")}
                            className={`cursor-pointer rounded-full px-3 py-1 ${interval === "monthly"
                                    ? "bg-slate-900 text-white"
                                    : "bg-transparent text-slate-600"
                                }`}
                        >
                            Monthly
                        </button>
                        <button
                            type="button"
                            onClick={() => setInterval("yearly")}
                            className={`cursor-pointer rounded-full px-3 py-1 ${interval === "yearly"
                                    ? "bg-slate-900 text-white"
                                    : "bg-transparent text-slate-600"
                                }`}
                        >
                            Annual
                            <span className="ml-1 text-[10px] text-emerald-300">
                                Save 3.5 months
                            </span>
                        </button>
                    </div>
                </section>

                {/* Plan cards (single plan now, structure supports more later) */}
                <section className="grid gap-6 md:grid-cols-2">
                    <article className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="space-y-3">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                Recommended
                            </p>
                            <h2 className="text-xl font-semibold text-slate-900">Pro</h2>
                            <p className="text-sm text-slate-600">
                                For teams that rely on accurate Stripe data in Sheets every day.
                            </p>
                            <div className="mt-4 flex items-baseline gap-1">
                                <span className="text-3xl font-semibold text-slate-900">
                                    {priceDisplay}
                                </span>
                                <span className="text-sm text-slate-500">{intervalLabel}</span>
                            </div>
                            {/* <p className="text-xs font-medium text-emerald-700">
                                {trialLabel}
                            </p> */}
                            <ul className="mt-4 space-y-2 text-sm text-slate-700">
                                <li>• 1 Stripe account synced to Sheets</li>
                                <li>• Automated backfill + 30-minute sync cadence</li>
                                <li>• Invoices, charges, customers, payouts, subscriptions</li>
                                <li>• Priority email support</li>
                            </ul>
                        </div>

                        <div className="mt-6">
                            <button
                                type="button"
                                onClick={handleSelectPlan}
                                disabled={loading}
                                className="cursor-pointer inline-flex w-full items-center justify-center rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-70"
                            >
                                {loading ? "Redirecting to secure checkout…" : "Continue to Checkout"}
                            </button>
                            <p className="mt-2 text-[11px] text-slate-500 text-center">
                                You’ll be redirected to a secure Stripe-hosted payment page to checkout.
                            </p>
                        </div>
                    </article>

                    {/* Optional: “Compare” card with feature summary, FAQs snippet, etc. */}
                    <article className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-sm text-slate-700">
                        <h3 className="text-sm font-semibold text-slate-900">
                            What’s included
                        </h3>
                        <ul className="mt-3 space-y-2">
                            <li>• Unlimited sync runs during your trial</li>
                            <li>• Drive ownership stays with your Google account</li>
                            <li>• Safe to use with existing analysis / working tabs</li>
                        </ul>
                        <h4 className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            FAQ
                        </h4>
                        <p className="mt-2 text-xs text-slate-600">
                            <span className="font-semibold text-slate-800">
                                Can I cancel during my trial?
                            </span>{" "}
                            Yes. Cancel before your 14 days are up and you won’t be charged.
                        </p>
                        <p className="mt-2 text-xs text-slate-600">
                            <span className="font-semibold text-slate-800">
                                Does this change anything in my Stripe account?
                            </span>{" "}
                            No. We only read data via the Stripe API and write into your Sheets.
                        </p>
                    </article>
                </section>

                {/* Feature comparison + testimonials could go here */}
            </main>
        </div>
    );
}
