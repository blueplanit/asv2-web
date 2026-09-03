// components/pricing/pricing-client.tsx
"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Snackbar } from "@/components/ui/snackbar";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import type { PricingCopy } from "@/lib/pricing/pricing-config";
import type { BillingDisplay, BillingInterval } from "@/lib/pricing/get-billing-display";
import {
    trackAmplitudeError,
    trackAmplitudeEvent,
} from "@/lib/analytics/amplitude-client";
import { EVENT_NAMES } from "@/lib/analytics/event-names";

type PricingClientProps = {
    copy: PricingCopy;
};

type PricingApiResponse = {
    billingDisplay?: BillingDisplay;
    promotionId?: string | null;
    promotionVersion?: string | null;
};

const DEFAULT_BILLING_DISPLAY: BillingDisplay = {
    monthly: { price: "$19", intervalLabel: "/month", discountedPrice: null, percentOff: null },
    yearly: { price: "$190", intervalLabel: "/year", discountedPrice: null, percentOff: null },
  };

async function fetchCurrentPricing(signal: AbortSignal): Promise<PricingApiResponse | null> {
    const response = await fetch("/api/billing/pricing", { signal });
    return response.ok ? response.json() : null;
}

type FaqItem = {
    question: string;
    answer: string;
};

function PricingFaqAccordion({ faqs }: { faqs: FaqItem[] }) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

    if (!faqs || faqs.length === 0) return null;

    function handleQuestionKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
        if (faqs.length <= 1) return;

        let nextIndex: number | null = null;
        if (event.key === "ArrowDown") {
            nextIndex = (index + 1) % faqs.length;
        } else if (event.key === "ArrowUp") {
            nextIndex = (index - 1 + faqs.length) % faqs.length;
        } else if (event.key === "Home") {
            nextIndex = 0;
        } else if (event.key === "End") {
            nextIndex = faqs.length - 1;
        }

        if (nextIndex === null) return;
        event.preventDefault();
        buttonRefs.current[nextIndex]?.focus();
    }

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
                                ref={(el) => {
                                    buttonRefs.current[index] = el;
                                }}
                                onClick={() => setOpenIndex(isOpen ? null : index)}
                                onKeyDown={(event) => handleQuestionKeyDown(event, index)}
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

type PriceDisplayProps = {
    variant: "card" | "sticky";
    loading: boolean;
    price: string;
    intervalLabel: string;
    discountedPrice: string | null;
    percentOff: number | null;
};

// The "Save X%" pill, shared by the card and sticky variants below — same shape,
// different sizing.
function DiscountBadge({ percentOff, size }: { percentOff: number; size: "md" | "sm" }) {
    const sizeClasses =
        size === "md"
            ? "px-2.5 py-1 text-xs shadow-sm shadow-emerald-500/30"
            : "px-1.5 py-0.5 text-[9px]";
    return (
        <span
            className={`animate-in fade-in-0 zoom-in-95 duration-300 inline-flex items-center rounded-full bg-emerald-500 font-bold text-white ${sizeClasses}`}
        >
            Save {percentOff}%
        </span>
    );
}

// Shared by the main plan card and the mobile sticky bar, so the loading /
// discounted / plain-price decision can't drift between the two surfaces.
function PriceDisplay({ variant, loading, price, intervalLabel, discountedPrice, percentOff }: PriceDisplayProps) {
    if (variant === "card") {
        if (loading) {
            return (
                <div className="flex items-end gap-2">
                    <span className="inline-block h-10 w-28 animate-pulse rounded-md bg-slate-200/80 align-bottom" />
                    <span className="inline-block h-5 w-16 animate-pulse rounded-md bg-slate-200/60 align-bottom" />
                </div>
            );
        }
        if (discountedPrice) {
            return (
                <div className="flex flex-col gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600">
                        Promotional price
                    </p>
                    <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-base font-medium text-slate-400 line-through">{price}</span>
                        {percentOff !== null && <DiscountBadge percentOff={percentOff} size="md" />}
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-semibold tracking-tight text-slate-900">{discountedPrice}</span>
                        <span className="pb-1 text-sm text-slate-500">{intervalLabel}</span>
                    </div>
                </div>
            );
        }
        return (
            <div className="flex items-end gap-2">
                <span className="text-4xl font-semibold tracking-tight text-slate-900">{price}</span>
                <span className="pb-1 text-sm text-slate-500">{intervalLabel}</span>
            </div>
        );
    }

    if (loading) return <p className="text-sm font-semibold text-slate-900">Loading...</p>;
    if (discountedPrice) {
        return (
            <div className="flex flex-col items-end gap-0.5">
                <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 line-through">{price}</span>
                    {percentOff !== null && <DiscountBadge percentOff={percentOff} size="sm" />}
                </div>
                <span className="text-sm font-semibold text-slate-900">{discountedPrice}{intervalLabel}</span>
            </div>
        );
    }
    return <p className="text-sm font-semibold text-slate-900">{price}{intervalLabel}</p>;
}

export function PricingClient({ copy }: PricingClientProps) {
    // The page is static, so the session is read here rather than on the server.
    // status is "loading" until next-auth answers.
    const { status } = useSession();
    const isLoggedIn = status === "authenticated";

    const [interval, setInterval] = useState<BillingInterval>("monthly");
    const [loading, setLoading] = useState(false);
    const [showSignedInHint, setShowSignedInHint] = useState(false);
    const [checkoutNotice, setCheckoutNotice] = useState<{ title: string; description: string } | null>(null);
    // Set once checkout reports the Promotion cannot apply to this account, so the next
    // attempt asks for the full price rather than repeating the same rejection.
    const [skipPromotion, setSkipPromotion] = useState(false);
    const [billingDisplay, setBillingDisplay] = useState<BillingDisplay>(DEFAULT_BILLING_DISPLAY);
    const [pricingLoading, setPricingLoading] = useState(true);
    const [promotionId, setPromotionId] = useState<string | null>(null);
    const [promotionVersion, setPromotionVersion] = useState<string | null>(null);
    const viewTracked = useRef(false);

    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();
        // PRICING_PAGE_VIEWED now waits on this fetch too (see below), so a stalled
        // request — not just an error response — must still resolve pricingLoading.
        const timeoutId = window.setTimeout(() => controller.abort(), 8000);

        setPricingLoading(true);
        fetchCurrentPricing(controller.signal)
            .then((data) => {
                if (cancelled) return;
                if (data?.billingDisplay) setBillingDisplay(data.billingDisplay);
                setPromotionId(data?.promotionId ?? null);
                setPromotionVersion(data?.promotionVersion ?? null);
            })
            .catch(() => { })
            .finally(() => {
                window.clearTimeout(timeoutId);
                if (cancelled) return;
                setPricingLoading(false);
            });

        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
            controller.abort();
        };
    }, []);

    // Waits for the session and the pricing fetch, so is_logged_in and
    // promotion_active are both accurate rather than defaulting wrong. See ADR-0003.
    useEffect(() => {
        if (status === "loading" || pricingLoading || viewTracked.current) return;

        viewTracked.current = true;
        trackAmplitudeEvent(EVENT_NAMES.PRICING_PAGE_VIEWED, {
            is_logged_in: isLoggedIn,
            promotion_active: promotionId !== null,
            ...(promotionId ? { promotion_id: promotionId } : {}),
        });
    }, [status, isLoggedIn, pricingLoading, promotionId]);

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
        setCheckoutNotice(null);
        // Both snackbars occupy the same slot, and the hint has served its purpose
        // once the visitor acts on the page.
        setShowSignedInHint(false);
        trackAmplitudeEvent("Upgrade To Pro Clicked", {
            source: "pricing_page",
            is_logged_in: isLoggedIn,
            interval,
        });

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
            // Reports that a Deliverable Discount existed at click time, matching
            // PRICING_PAGE_VIEWED. Whether it applied lands on SUBSCRIPTION_PAID.
            trackAmplitudeEvent(EVENT_NAMES.CHECKOUT_STARTED, {
                plan_id: "pro",
                interval,
                promotion_active: promotionId !== null,
                ...(promotionId ? { promotion_id: promotionId } : {}),
            });
            const res = await fetch("/api/billing/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    planId: "pro",
                    interval,
                    // Always sent. Only a signed-in click reaches here, and that button
                    // waits for the pricing read, so null honestly means no Promotion shown.
                    expectedPromotionId: promotionId,
                    expectedPromotionVersion: promotionVersion,
                    skipPromotion,
                }),
            });
            if (!res.ok) {
                const errorBody = (await res.json().catch(() => null)) as { code?: string } | null;
                console.error("Failed to create checkout session");
                trackAmplitudeError("Checkout Session Failed", "Failed to create checkout session", {
                    interval,
                    status: res.status,
                    code: errorBody?.code,
                });

                const isPriceChanged = res.status === 409 && errorBody?.code === "price_changed";
                const isPromotionNotApplicable =
                    res.status === 409 && errorBody?.code === "promotion_not_applicable";

                if (isPriceChanged || isPromotionNotApplicable) {
                    // A changed Promotion resets the acknowledgement, since the offer the
                    // visitor was refused is no longer the one on the page.
                    setSkipPromotion(isPromotionNotApplicable);

                    const controller = new AbortController();
                    const timeoutId = window.setTimeout(() => controller.abort(), 8000);
                    setPricingLoading(true);
                    try {
                        const currentPricing = await fetchCurrentPricing(controller.signal);
                        if (currentPricing?.billingDisplay) {
                            setBillingDisplay(currentPricing.billingDisplay);
                            setPromotionId(currentPricing.promotionId ?? null);
                            setPromotionVersion(currentPricing.promotionVersion ?? null);
                        }
                        const fullPrice = currentPricing?.billingDisplay?.[interval] ?? billingDisplay[interval];
                        setCheckoutNotice(
                            isPromotionNotApplicable
                                ? {
                                    title: "Promotion not applied",
                                    description: `This promotion isn't available on your account, usually because a discount was already used. No charge was made. Start checkout again to continue at ${fullPrice.price}${fullPrice.intervalLabel}.`,
                                }
                                : currentPricing?.billingDisplay
                                    ? {
                                        title: "The price changed",
                                        description:
                                            "The promotional offer changed before checkout. No charge was made. We've refreshed the price, so please review it and try again.",
                                    }
                                    : {
                                        title: "The price changed",
                                        description:
                                            "The promotional offer changed before checkout. No charge was made. Please refresh the page to review the current price.",
                                    },
                        );
                    } catch {
                        setCheckoutNotice({
                            title: isPromotionNotApplicable ? "Promotion not applied" : "The price changed",
                            description:
                                "The offer changed before checkout. No charge was made. Please refresh the page to review the current price.",
                        });
                    } finally {
                        window.clearTimeout(timeoutId);
                        setPricingLoading(false);
                    }
                } else {
                    setCheckoutNotice({
                        title: "Checkout didn't start",
                        description: "We couldn't start checkout. No charge was made. Please try again.",
                    });
                }
                setLoading(false);
                return;
            }
            const data = await res.json();
            if (data.url) {
                trackAmplitudeEvent("Checkout Session Created", {
                    plan_id: "pro",
                    interval,
                });
                window.location.href = data.url;
            } else {
                trackAmplitudeError("Checkout Session Failed", "Checkout URL missing", {
                    interval,
                });
                setCheckoutNotice({
                    title: "Checkout didn't start",
                    description: "We couldn't start checkout. No charge was made. Please try again.",
                });
                setLoading(false);
            }
        } catch (err) {
            console.error("Error starting checkout", err);
            trackAmplitudeError("Checkout Session Failed", err, {
                interval,
            });
            setCheckoutNotice({
                title: "Checkout didn't start",
                description: "We couldn't start checkout. No charge was made. Please try again.",
            });
            setLoading(false);
        }
    }

    const { price, intervalLabel, discountedPrice, percentOff } = billingDisplay[interval];
    const faqHeading = copy.included.faqTitle.trim().toLowerCase() === "faq" ? "FAQs" : copy.included.faqTitle;

    const freeTrialMsg = !isLoggedIn ? (
        <a
            href={copy.hero.freeTrialLinkHref}
            className="font-bold text-indigo-600 hover:text-indigo-500 hover:underline"
        >
            {copy.hero.freeTrialText}
        </a>
    ) : null;

    // Derived once, like primaryCtaLabel: both CTAs must gate identically, and three
    // prior commits set this wrong by editing one site's condition in isolation.
    const ctaDisabled = loading || status === "loading" || (isLoggedIn && pricingLoading);

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

            {/* Stays until dismissed: a checkout the visitor must retry should not
                disappear on its own while they are reading it. */}
            <Snackbar
                open={checkoutNotice !== null}
                onClose={() => setCheckoutNotice(null)}
                variant="error"
                title={checkoutNotice?.title ?? ""}
                description={checkoutNotice?.description}
                animated
                autoHideMs={0}
            />

            <main className="mx-auto max-w-6xl px-4 pb-28 pt-12 sm:pb-16 sm:pt-16">
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
                        <div
                            role="group"
                            aria-label="Billing interval"
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 text-sm font-medium text-slate-700 shadow-sm"
                        >
                            <button
                                type="button"
                                onClick={() => setInterval("monthly")}
                                aria-pressed={interval === "monthly"}
                                className={`cursor-pointer rounded-full px-4 py-1.5 transition-colors ${interval === "monthly" ? "bg-slate-900 text-white" : "bg-transparent text-slate-600 hover:text-slate-900"}`}
                            >
                                {copy.toggle.monthlyLabel}
                            </button>
                            <button
                                type="button"
                                onClick={() => setInterval("yearly")}
                                aria-pressed={interval === "yearly"}
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
                    <section id="pricing-card" className="mx-auto max-w-xl scroll-mt-20">
                        <article className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-white p-7 shadow-xl shadow-indigo-100/40 sm:p-9">
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

                                <div aria-live="polite" aria-busy={pricingLoading}>
                                    <PriceDisplay
                                        variant="card"
                                        loading={pricingLoading}
                                        price={price}
                                        intervalLabel={intervalLabel}
                                        discountedPrice={discountedPrice}
                                        percentOff={percentOff}
                                    />
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
                                        disabled={ctaDisabled}
                                        className="inline-flex w-full cursor-pointer items-center justify-center rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-70"
                                    >
                                        {primaryCtaLabel}
                                    </button>
                                    <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
                                        {copy.plan.trustSignals.map((signal) => (
                                            <li key={signal} className="flex items-center gap-1.5">
                                                <span
                                                    className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                                                    aria-hidden="true"
                                                />
                                                <span>{signal}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </article>
                    </section>
                </div>

                <div
                    className="mx-auto mt-10 h-px w-full max-w-5xl bg-gradient-to-r from-transparent via-slate-200 to-transparent"
                    aria-hidden="true"
                />

                <div className="mt-10 space-y-14">
                    {/* What's included */}
                    <section id="whats-included" className="mx-auto max-w-4xl scroll-mt-20 space-y-5">
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

                    <div
                        className="mx-auto h-px w-full max-w-4xl bg-gradient-to-r from-transparent via-slate-200 to-transparent"
                        aria-hidden="true"
                    />

                    {/* FAQs */}
                    <section id="pricing-faqs" className="mx-auto max-w-4xl scroll-mt-20 space-y-5">
                        <div className="text-center">
                            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                                {faqHeading}
                            </h3>
                        </div>
                        <PricingFaqAccordion faqs={copy.included.faqs} />
                    </section>
                </div>
            </main>

            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
                <div className="mx-auto max-w-xl">
                    <div className={`mb-2 flex justify-between ${discountedPrice ? "items-center" : "items-baseline"}`}>
                        <p className="text-xs font-medium text-slate-600">{copy.plan.name}</p>
                        <PriceDisplay
                            variant="sticky"
                            loading={pricingLoading}
                            price={price}
                            intervalLabel={intervalLabel}
                            discountedPrice={discountedPrice}
                            percentOff={percentOff}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleSelectPlan}
                        disabled={ctaDisabled}
                        className="inline-flex w-full cursor-pointer items-center justify-center rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-70"
                    >
                        {primaryCtaLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
