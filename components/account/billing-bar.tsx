// components/account/billing-bar.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useUserState } from "@/components/user-state-provider";
import { trackAmplitudeEvent } from "@/lib/analytics/amplitude-client";

export function BillingBar() {
    const { user } = useUserState();
    const [portalLoading, setPortalLoading] = useState(false);

    const status = user.profile?.subscriptionStatus ?? "inactive"; // "active" | "inactive"
    const rawStatus = user.profile?.subscriptionRawStatus ?? null; // "trialing" | "active" | "inactive" | "past_due" | "canceled" | "unpaid" | "paused" | "incomplete" | "incomplete_expired"
    const planId = user.profile?.subscriptionPlanId ?? null;         // e.g. "pro"
    const interval = user.profile?.subscriptionInterval ?? null;     // "monthly" | "yearly"
    const nextRenewalIso = user.profile?.subscriptionCurrentPeriodEnd ?? null;

    const nextRenewalDate =
        nextRenewalIso ? new Date(nextRenewalIso) : null;

    const planLabel =
        planId === "pro" ? "Pro" : planId ? planId : "Free";

    const intervalLabel =
        interval === "monthly"
            ? "Monthly"
            : interval === "yearly"
                ? "Annual"
                : null;

    async function handleManageBilling() {
        setPortalLoading(true);
        try {
            const res = await fetch("/api/billing/portal", {
                method: "POST",
            });
            if (!res.ok) {
                trackAmplitudeEvent("SyncStaq: Billing Portal Open Failed", {
                    error_message: "Failed to create billing portal session",
                });
                setPortalLoading(false);
                return;
            }
            const data = await res.json();
            if (data.url) {
                trackAmplitudeEvent("SyncStaq: Billing Portal Opened");
                window.open(data.url, "_blank");
            } else {
                trackAmplitudeEvent("SyncStaq: Billing Portal Open Failed", {
                    error_message: "Billing portal URL missing",
                });
                setPortalLoading(false);
            }
        } catch {
            console.error("Error opening billing portal");
            trackAmplitudeEvent("SyncStaq: Billing Portal Open Failed", {
                error_message: "Error opening billing portal",
            });
        }
        finally {
            setPortalLoading(false);
        }
    }

    if (status === "inactive" || rawStatus === "trialing") {
        // Free / no subscription
        const purchaseTitle = rawStatus === "trialing" ? "You're  on a free 14-day trial." : 
            rawStatus === "canceled" ? "Your subscription has been canceled." :
            rawStatus === "past_due" ? "Your subscription is past due." :
            rawStatus === "inactive" ? "You're subscription is inactive." : "Upgrade to Pro";
        
        const ctaLabel = rawStatus === "trialing" ? "Upgrade to Pro" :
         rawStatus === "canceled" ? "Reactivate subscription" :
         rawStatus === "past_due" ? "Pay now" :
         rawStatus === "inactive" ? "Upgrade to Pro" : "View plans";
        
        return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                    <p className="font-medium text-amber-900">
                        {purchaseTitle}
                    </p>
                    <p className="text-xs text-amber-800">
                        Upgrade to Pro to keep Stripe → Sheets sync running smoothly.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/pricing"
                        onClick={() =>
                            trackAmplitudeEvent("SyncStaq: Upgrade To Pro Clicked", {
                                source: "dashboard_billing_bar",
                                subscription_raw_status: rawStatus,
                                cta_label: ctaLabel,
                            })
                        }
                        className="cursor-pointer inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
                    >
                        {ctaLabel}
                    </Link>
                </div>
            </div>
        );
    }

    // Active subscription
    return (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
                <p className="font-medium text-emerald-900">
                    {planLabel} plan{" "}
                    {intervalLabel && (
                        <span className="text-emerald-800 font-normal">
                            · {intervalLabel} billing
                        </span>
                    )}
                </p>
                {nextRenewalDate ? (
                    <p className="text-xs text-emerald-800">
                        Renews on{" "}
                        {nextRenewalDate.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                        })}
                        .
                    </p>
                ) : (
                    <p className="text-xs text-emerald-800">
                        Your subscription is active. You can manage billing and invoices in Stripe.
                    </p>
                )}
            </div>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={handleManageBilling}
                    disabled={portalLoading}
                    className="cursor-pointer inline-flex items-center justify-center rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-70"
                >
                    {portalLoading ? "Opening…" : "Manage billing"}
                </button>
            </div>
        </div>
    );
}
