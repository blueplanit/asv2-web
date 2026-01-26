// components/pricing/pricing-client.tsx
"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Snackbar } from "@/components/ui/snackbar";
import type { PricingCopy } from "@/lib/pricing-config";

type BillingInterval = "monthly" | "yearly";

type PricingClientProps = {
    isLoggedIn: boolean;
    copy: PricingCopy;
};

const BILLING_DISPLAY: Record<
    BillingInterval,
    { price: string; intervalLabel: string }
> = {
    monthly: { price: "$15", intervalLabel: "/month" },
    yearly: { price: "$129", intervalLabel: "/year" },
};

export function PricingClient({ isLoggedIn, copy }: PricingClientProps) {
    const [interval, setInterval] = useState<BillingInterval>("monthly");
    const [loading, setLoading] = useState(false);
    const [showSignedInHint, setShowSignedInHint] = useState(false);

    const searchParams = useSearchParams();
    const authFlag = searchParams.get("auth");
    const justLoggedIn = isLoggedIn && authFlag === "1";

    useEffect(() => {
        if (!justLoggedIn) return;
        setShowSignedInHint(true);

        const id = window.setTimeout(() => {
            setShowSignedInHint(false);
        }, 7000);

        return () => window.clearTimeout(id);
    }, [justLoggedIn]);

    async function handleSelectPlan() {
        if (!isLoggedIn) {
            setLoading(true);
            try {
                await signIn("google", { callbackUrl: "/pricing?auth=1" });
            } finally {
                setLoading(false);
            }
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

    const { price, intervalLabel } = BILLING_DISPLAY[interval];

    const freeTrialMsg = !isLoggedIn ? (
        <a
            href={copy.hero.freeTrialLinkHref}
            className="font-bold text-indigo-600 hover:text-indigo-500 hover:underline"
        >
            {copy.hero.freeTrialText}
        </a>
    ) : null;

    const primaryCtaLabel = isLoggedIn
        ? loading
            ? copy.ctaLabels.signedInLoading
            : copy.ctaLabels.signedInIdle
        : loading
            ? copy.ctaLabels.signedOutLoading
            : copy.ctaLabels.signedOutIdle;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
            <Snackbar
                open={showSignedInHint}
                onClose={() => setShowSignedInHint(false)}
                variant="success"
                title={copy.snackbar.title}
                description={copy.snackbar.description}
                animated
                autoHideMs={7000}
            />

            <main className="mx-auto max-w-5xl space-y-12 px-4 py-16">
                {/* Hero */}
                <section className="space-y-4 text-center">
                    <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
                        {copy.hero.title}
                    </h1>
                    <p className="mx-auto max-w-2xl text-sm text-slate-600 sm:text-base">
                        {freeTrialMsg && <>{freeTrialMsg} </>}
                        {copy.hero.secondaryText}
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
                            {copy.toggle.monthlyLabel}
                        </button>
                        <button
                            type="button"
                            onClick={() => setInterval("yearly")}
                            className={`cursor-pointer rounded-full px-3 py-1 ${interval === "yearly"
                                    ? "bg-slate-900 text-white"
                                    : "bg-transparent text-slate-600"
                                }`}
                        >
                            {copy.toggle.yearlyLabel}
                            <span className="ml-1 text-[10px] text-emerald-300">
                                {copy.toggle.yearlySavingsTag}
                            </span>
                        </button>
                    </div>
                </section>

                {/* Plan cards */}
                <section className="grid gap-6 md:grid-cols-2">
                    <article className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="space-y-3">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                {copy.plan.badgeLabel}
                            </p>
                            <h2 className="text-xl font-semibold text-slate-900">
                                {copy.plan.name}
                            </h2>
                            <p className="text-sm text-slate-600">{copy.plan.description}</p>
                            <div className="mt-4 flex items-baseline gap-1">
                                <span className="text-3xl font-semibold text-slate-900">
                                    {price}
                                </span>
                                <span className="text-sm text-slate-500">{intervalLabel}</span>
                            </div>
                            <ul className="mt-4 space-y-2 text-sm text-slate-700">
                                {copy.plan.bullets.map((line) => (
                                    <li key={line}>• {line}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="mt-6">
                            <button
                                type="button"
                                onClick={handleSelectPlan}
                                disabled={loading}
                                className="inline-flex w-full cursor-pointer items-center justify-center rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-70"
                            >
                                {primaryCtaLabel}
                            </button>
                            <p className="mt-2 text-center text-[11px] text-slate-500">
                                {copy.plan.checkoutNote}
                            </p>
                        </div>
                    </article>

                    <article className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-sm text-slate-700">
                        <h3 className="text-sm font-semibold text-slate-900">
                            {copy.included.title}
                        </h3>
                        <ul className="mt-3 space-y-2">
                            {copy.included.bullets.map((line) => (
                                <li key={line}>• {line}</li>
                            ))}
                        </ul>
                        <h4 className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {copy.included.faqTitle}
                        </h4>
                        {copy.included.faqs.map((faq) => (
                            <p key={faq.question} className="mt-2 text-xs text-slate-600">
                                <span className="font-semibold text-slate-800">
                                    {faq.question}
                                </span>{" "}
                                {faq.answer}
                            </p>
                        ))}
                    </article>
                </section>
            </main>
        </div>
    );
}
