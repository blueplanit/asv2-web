// components/pricing/pricing-client.tsx
"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Snackbar } from "@/components/ui/snackbar";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import type { PricingCopy } from "@/lib/pricing-config";

type BillingInterval = "monthly" | "yearly";

type PricingClientProps = {
    isLoggedIn: boolean;
    copy: PricingCopy;
};

type BillingDisplay = Record<BillingInterval, { price: string; intervalLabel: string }>;

const DEFAULT_BILLING_DISPLAY: BillingDisplay = {
    monthly: { price: "$19", intervalLabel: "/month" },
    yearly: { price: "$190", intervalLabel: "/year" },
  };

type FaqItem = {
    question: string;
    answer: string;
};

function PricingFaqAccordion({ faqs }: { faqs: FaqItem[] }) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    if (!faqs || faqs.length === 0) return null;

    return (
        <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                FAQ
            </h4>
            <div className="mt-2 rounded-2xl border border-slate-200 bg-white/70">
                <ul className="divide-y divide-slate-200">
                    {faqs.map((faq, index) => {
                        const isOpen = openIndex === index;
                        const panelId = `pricing-faq-panel-${index}`;
                        const buttonId = `pricing-faq-button-${index}`;

                        return (
                            <li key={faq.question}>
                                <button
                                    id={buttonId}
                                    type="button"
                                    onClick={() =>
                                        setOpenIndex(isOpen ? null : index)
                                    }
                                    aria-expanded={isOpen}
                                    aria-controls={panelId}
                                    className="cursor-pointer flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-xs font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-100"
                                >
                                    <span className="flex-1">{faq.question}</span>
                                    <ChevronDownIcon
                                        className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
                                            }`}
                                        aria-hidden="true"
                                    />
                                </button>
                                {isOpen && (
                                    <div
                                        id={panelId}
                                        role="region"
                                        aria-labelledby={buttonId}
                                        className="px-3 pb-4 text-xs leading-relaxed text-slate-600"
                                    >
                                        {faq.answer}
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}

export function PricingClient({ isLoggedIn, copy }: PricingClientProps) {
    const [interval, setInterval] = useState<BillingInterval>("monthly");
    const [loading, setLoading] = useState(false);
    const [showSignedInHint, setShowSignedInHint] = useState(false);
    const [billingDisplay, setBillingDisplay] = useState<BillingDisplay>(DEFAULT_BILLING_DISPLAY);
    const [pricingLoading, setPricingLoading] = useState(true); //

    useEffect(() => {
        let cancelled = false;

        setPricingLoading(true);
        fetch("/api/billing/pricing")
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (cancelled) return;
                if (data?.billingDisplay) setBillingDisplay(data.billingDisplay);
            })
            .catch(() => { })
            .finally(() => {
                if (cancelled) return;
                setPricingLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

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

    const { price, intervalLabel } = billingDisplay[interval];

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
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 text-sm font-medium text-slate-700">
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
                            <span
                                className={`ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700 uppercase tracking-wide" ${interval === "yearly"
                                        ? "bg-emerald-400 text-slate-900"
                                        : "bg-emerald-100 text-emerald-700"
                                    }`}
                            >
                                {copy.toggle.yearlySavingsTag}
                            </span>
                        </button>
                    </div>
                </section>

                {/* Plan cards */}
                <section className="grid gap-6 md:grid-cols-2">
                    {/* Main plan */}
                    <article className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
                        <div className="space-y-3">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                {copy.plan.badgeLabel}
                            </p>
                            <h2 className="text-xl font-semibold text-slate-900">
                                {copy.plan.name}
                            </h2>
                            <p className="text-sm text-slate-600">
                                {copy.plan.description}
                            </p>
                            <div className="mt-4 flex items-baseline gap-2">
                                {pricingLoading ? (
                                    <>
                                        <span className="inline-block h-9 w-24 rounded-md bg-slate-200/80 align-bottom animate-pulse" />
                                        <span className="inline-block h-5 w-14 rounded-md bg-slate-200/60 align-bottom animate-pulse" />
                                    </>
                                ) : (
                                    <>
                                        <span className="text-3xl font-semibold text-slate-900">{price}</span>
                                        <span className="text-sm text-slate-500">{intervalLabel}</span>
                                    </>
                                )}
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

                    {/* Included + FAQ */}
                    <article className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-sm text-slate-700">
                        <h3 className="text-sm font-semibold text-slate-900">
                            {copy.included.title}
                        </h3>
                        <ul className="mt-3 space-y-2">
                            {copy.included.bullets.map((line) => (
                                <li key={line}>• {line}</li>
                            ))}
                        </ul>

                        <PricingFaqAccordion faqs={copy.included.faqs} />
                    </article>
                </section>
            </main>
        </div>
    );
}