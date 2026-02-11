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
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
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
                                onClick={() => setOpenIndex(isOpen ? null : index)}
                                aria-expanded={isOpen}
                                aria-controls={panelId}
                                className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                            >
                                <span className="flex-1">{faq.question}</span>
                                <ChevronDownIcon
                                    className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                                    aria-hidden="true"
                                />
                            </button>
                            {isOpen && (
                                <div
                                    id={panelId}
                                    role="region"
                                    aria-labelledby={buttonId}
                                    className="px-5 pb-5 text-sm leading-relaxed text-slate-600"
                                >
                                    {faq.answer}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export function PricingClient({ isLoggedIn, copy }: PricingClientProps) {
    const [interval, setInterval] = useState<BillingInterval>("monthly");
    const [loading, setLoading] = useState(false);
    const [showSignedInHint, setShowSignedInHint] = useState(false);
    const [billingDisplay, setBillingDisplay] = useState<BillingDisplay>(DEFAULT_BILLING_DISPLAY);
    const [pricingLoading, setPricingLoading] = useState(true);

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
    const faqHeading = copy.included.faqTitle.trim().toLowerCase() === "faq" ? "FAQs" : copy.included.faqTitle;

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

            <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
                <div className="space-y-7 sm:space-y-8">
                    {/* Hero */}
                    <section className="space-y-4 text-center">
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                            {copy.hero.title}
                        </h1>
                        <p className="mx-auto max-w-2xl text-base text-slate-600">
                            {freeTrialMsg && <>{freeTrialMsg} </>}
                            {copy.hero.secondaryText}
                        </p>
                    </section>

                    {/* Billing toggle */}
                    <section className="flex justify-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 text-sm font-medium text-slate-700 shadow-sm">
                            <button
                                type="button"
                                onClick={() => setInterval("monthly")}
                                className={`cursor-pointer rounded-full px-4 py-1.5 transition-colors ${interval === "monthly" ? "bg-slate-900 text-white" : "bg-transparent text-slate-600 hover:text-slate-900"}`}
                            >
                                {copy.toggle.monthlyLabel}
                            </button>
                            <button
                                type="button"
                                onClick={() => setInterval("yearly")}
                                className={`cursor-pointer rounded-full px-4 py-1.5 transition-colors ${interval === "yearly" ? "bg-slate-900 text-white" : "bg-transparent text-slate-600 hover:text-slate-900"}`}
                            >
                                {copy.toggle.yearlyLabel}
                                <span
                                    className={`ml-2 inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${interval === "yearly" ? "bg-emerald-400 text-slate-900" : "bg-emerald-100 text-emerald-700"}`}
                                >
                                    {copy.toggle.yearlySavingsTag}
                                </span>
                            </button>
                        </div>
                    </section>

                    {/* Main plan */}
                    <section className="mx-auto max-w-xl">
                        <article className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50 sm:p-9">
                            <div
                                className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-indigo-50 to-transparent"
                                aria-hidden="true"
                            />
                            <div className="relative flex flex-col gap-7">
                                <div className="space-y-3">
                                    <h2 className="text-2xl font-semibold text-slate-900">
                                        {copy.plan.name}
                                    </h2>
                                    <p className="text-sm leading-relaxed text-slate-600">
                                        {copy.plan.description}
                                    </p>
                                </div>

                                <div className="flex items-end gap-2">
                                    {pricingLoading ? (
                                        <>
                                            <span className="inline-block h-10 w-28 animate-pulse rounded-md bg-slate-200/80 align-bottom" />
                                            <span className="inline-block h-5 w-16 animate-pulse rounded-md bg-slate-200/60 align-bottom" />
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-4xl font-semibold tracking-tight text-slate-900">{price}</span>
                                            <span className="pb-1 text-sm text-slate-500">{intervalLabel}</span>
                                        </>
                                    )}
                                </div>

                                <ul className="space-y-2">
                                    {copy.plan.bullets.map((line) => (
                                        <li
                                            key={line}
                                            className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                                        >
                                            <span
                                                className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-indigo-500"
                                                aria-hidden="true"
                                            />
                                            <span>{line}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div>
                                    <button
                                        type="button"
                                        onClick={handleSelectPlan}
                                        disabled={loading}
                                        className="inline-flex w-full cursor-pointer items-center justify-center rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-70"
                                    >
                                        {primaryCtaLabel}
                                    </button>
                                    <p className="mt-2 text-center text-[11px] text-slate-500">
                                        {copy.plan.checkoutNote}
                                    </p>
                                </div>
                            </div>
                        </article>
                    </section>
                </div>

                <div className="mt-12 space-y-14">
                    {/* What's included */}
                    <section className="mx-auto max-w-4xl space-y-5">
                    <div className="text-center">
                        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                            {copy.included.title}
                        </h3>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {copy.included.bullets.map((line) => (
                            <article
                                key={line}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
                            >
                                <p className="flex items-start gap-3 text-sm leading-relaxed text-slate-700">
                                    <span
                                        className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-indigo-500"
                                        aria-hidden="true"
                                    />
                                    <span>{line}</span>
                                </p>
                            </article>
                        ))}
                    </div>
                    </section>

                    {/* FAQs */}
                    <section className="mx-auto max-w-4xl space-y-5">
                        <div className="text-center">
                            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                                {faqHeading}
                            </h3>
                        </div>
                        <PricingFaqAccordion faqs={copy.included.faqs} />
                    </section>
                </div>
            </main>
        </div>
    );
}
