// components/account/account-page-client.tsx
"use client";

import { useState } from "react";
import { useUserState } from "@/components/user-state-provider";

export function AccountPageClient() {
    const { user } = useUserState();
    const [portalLoading, setPortalLoading] = useState(false);

    const profile = user.profile;
    const status = profile?.subscriptionStatus ?? "inactive";
    const planId = profile?.subscriptionPlanId ?? null;
    const interval = profile?.subscriptionInterval ?? null;
    const nextRenewalIso = profile?.subscriptionCurrentPeriodEnd ?? null;
    const email = profile?.email ?? "";

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
                setPortalLoading(false);
                return;
            }
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                setPortalLoading(false);
            }
        } catch {
            setPortalLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-10">
            <div className="mx-auto max-w-3xl space-y-6">
                <header className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Account
                    </p>
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Account &amp; billing
                    </h1>
                    <p className="text-sm text-slate-600">
                        View your plan, renewal date, and manage billing details securely in Stripe.
                    </p>
                </header>

                <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                Subscription
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                                {planLabel}
                                {intervalLabel && (
                                    <span className="font-normal text-slate-500">
                                        {" "}
                                        · {intervalLabel}
                                    </span>
                                )}
                            </p>
                            <p className="mt-1 text-xs text-slate-600">
                                Status:{" "}
                                <span className="font-medium text-slate-900">
                                    {status === "active" ? "Active" : "Inactive"}
                                </span>
                            </p>
                            {nextRenewalDate && status === "active" && (
                                <p className="mt-1 text-xs text-slate-600">
                                    Next renewal:{" "}
                                    {nextRenewalDate.toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            {status === "inactive" && (
                                <a
                                    href="/pricing"
                                    className="cursor-pointer inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
                                >
                                    Upgrade to Pro
                                </a>
                            )}
                            {status === "active" && (
                                <button
                                    type="button"
                                    onClick={handleManageBilling}
                                    disabled={portalLoading}
                                    className="cursor-pointer inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-70"
                                >
                                    {portalLoading ? "Opening Stripe…" : "Manage in Stripe"}
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            Profile
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                            {email}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                            Your Google login controls access to this account. To change your email,
                            update your Google account.
                        </p>
                    </div>
                </section>

                <section className="space-y-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-900">
                        Questions about billing?
                    </h2>
                    <p className="text-xs text-slate-600">
                        Billing is handled securely by Stripe. Use “Manage in Stripe” above to
                        download invoices, update your payment method, or change your plan. For
                        questions about how billing interacts with sync limits or workspaces, contact
                        support from within the app.
                    </p>
                </section>
            </div>
        </main>
    );
}
