// components/account/account-page-client.tsx
"use client";

import { useState } from "react";
import { useUserState } from "@/components/user-state-provider";
import type { GoogleConnection } from "@blueplanit/asv2-shared";
import { AlertTriangle, X } from "lucide-react";

function googleStatusCopy(conn: GoogleConnection) {
    if (conn.status === "connected") return null;

    if (conn.status === "revoked") {
        return "Google access was revoked or expired. Reconnect to resume syncing.";
    }

    // status === "error"
    switch (conn.errorCode) {
        case "refresh_invalid":
            return "Google access expired or was revoked. Reconnect to resume syncing.";
        case "scope_missing":
            return "Permissions are incomplete. Reconnect to restore access.";
        case "file_forbidden":
            return "We can’t access your spreadsheet anymore. Reconnect to restore access.";
        case "account_mismatch":
            return "Wrong Google account selected. Reconnect using your login Google account.";
        default:
            return "Google access needs attention. Reconnect to resume syncing.";
    }
}

type AccountPageClientProps = {
    scopeError?: boolean;
    onDismissScopeError?: () => void;
};

export function AccountPageClient({ scopeError, onDismissScopeError }: AccountPageClientProps) {
    const { user } = useUserState();
    const [portalLoading, setPortalLoading] = useState(false);

    const profile = user.profile;
    const stripeConnections = user.stripeConnections ?? [];
    const googleConnections = user.googleConnections ?? [];

    const primaryStripe = stripeConnections[0] ?? null;
    const primaryGoogle = googleConnections[0] ?? null;

    const status = profile?.subscriptionStatus ?? "inactive";
    const rawStatus = profile?.subscriptionRawStatus ?? null;
    const planId = profile?.subscriptionPlanId ?? null;
    const interval = profile?.subscriptionInterval ?? null;
    const nextRenewalIso = profile?.subscriptionCurrentPeriodEnd ?? null;
    const email = profile?.email ?? "";

    const nextRenewalDate = nextRenewalIso ? new Date(nextRenewalIso) : null;

    const planLabel = planId === "pro" ? "Pro" : planId ? planId : "Free";

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
                window.open(data.url, "_blank");
            } else {
                setPortalLoading(false);
            }
        } catch {
            console.error("Error opening billing portal");
        }
        finally {
            setPortalLoading(false);
        }
    }

    const isActiveSubscription = status === "active";
    const isTrialing = rawStatus === "trialing";
    const helpText = isActiveSubscription && !isTrialing ?
        `Use “Manage in Stripe” above to download invoices, update your payment method, or change your plan. ` :
        "";

    const googleNeedsReconnect =
        !!primaryGoogle && (primaryGoogle.status === "error" || primaryGoogle.status === "revoked");

    const googleCopy = primaryGoogle ? googleStatusCopy(primaryGoogle) : null;

    return (
        <div className="space-y-6">
            <header className="space-y-2">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Account
                </p>
                <h1 className="text-2xl font-semibold text-slate-900">
                    Account &amp; billing
                </h1>
                <p className="text-sm text-slate-600">
                    View your plan, connected Stripe account, and manage
                    billing details securely in Stripe.
                </p>
            </header>

            {/* Subscription card */}
            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            Subscription
                        </p>
                        {rawStatus === "trialing" ? null :
                            (
                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                    {planLabel}
                                    {intervalLabel && (
                                        <span className="font-normal text-slate-500">
                                            {" "}
                                            · {intervalLabel}
                                        </span>
                                    )}
                                </p>
                            )}
                        <p className="mt-1 text-xs text-slate-600 mb-1">
                            Status:{" "}
                            <span className="font-medium text-slate-900">
                                {rawStatus === "trialing" ? "Free 14-day Trial" : status === "active" ? "Active" : "Inactive"}
                            </span>
                        </p>
                        {nextRenewalDate && status === "active" && (
                            <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                                <span className="mr-1 text-[0.65rem] uppercase tracking-[0.14em] text-slate-800 font-semibold">
                                    {rawStatus === "trialing"
                                        ? "Trial ends"
                                        : rawStatus === "canceling"
                                            ? "Cancels"
                                            : "Renews"}
                                </span>
                                <span className="text-slate-900">
                                    {nextRenewalDate.toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
                                </span>
                            </span>
                        )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {(status === "inactive" || rawStatus === "trialing") && (
                            <a
                                href="/pricing"
                                className="cursor-pointer inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
                            >
                                Upgrade to Pro
                            </a>
                        )}
                        {status === "active" && rawStatus !== "trialing" && (
                            <button
                                type="button"
                                onClick={handleManageBilling}
                                disabled={portalLoading}
                                className="cursor-pointer inline-flex items-center justify-center rounded-full border border-slate-900 bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
                            >
                                {portalLoading ? "Opening Stripe…" : "Manage in Stripe"}
                            </button>
                        )}
                    </div>
                </div>
            </section>

            {/* Profile card */}
            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Profile
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{email}</p>
                    <p className="mt-1 text-xs text-slate-600">
                        Your Google login controls access to this account.
                    </p>
                </div>
            </section>

            {/* Connections card: Stripe + Google */}
            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Connections
                    </p>

                    {/* Stripe connection */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Stripe
                        </p>
                        {primaryStripe ? (
                            <div className="mt-1 space-y-1">
                                <p className="text-sm font-semibold text-slate-900">
                                    {primaryStripe.businessName || "Connected Stripe account"}
                                </p>
                                <p className="text-xs text-slate-600">
                                    Status:{" "}
                                    <span className="font-medium text-slate-900">
                                        {primaryStripe.status === "connected"
                                            ? "Connected"
                                            : primaryStripe.status === "revoked"
                                                ? "Revoked"
                                                : "Error"}
                                    </span>
                                </p>
                            </div>
                        ) : (
                            <p className="mt-1 text-xs text-slate-600">
                                No Stripe account connected yet.
                            </p>
                        )}
                    </div>

                    {/* Google connection */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Google Sheets
                        </p>
                        {primaryGoogle ? (
                            <div className="mt-1 space-y-2">
                                {scopeError && (
                                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-600" />
                                        <div className="flex-1">
                                            <p className="text-xs font-semibold text-amber-900">Permission required</p>
                                            <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700">
                                                Insufficient permissions. Please reconnect and ensure <span className="font-medium">"See, edit, create, and delete only the specific Google Drive files you use with this app." is enabled.</span>
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={onDismissScopeError}
                                            className="cursor-pointer mt-0.5 flex-shrink-0 rounded-full p-0.5 text-amber-500 hover:bg-amber-100 hover:text-amber-700"
                                            aria-label="Dismiss"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-slate-900">{primaryGoogle.email}</p>

                                    <p className="text-xs text-slate-600">
                                        Status:{" "}
                                        <span className="font-medium text-slate-900">
                                            {primaryGoogle.status === "connected" ? "Connected" : "Action required"}
                                        </span>
                                    </p>

                                    {googleCopy ? (
                                        <p className="text-xs text-slate-600">{googleCopy}</p>
                                    ) : null}

                                    {primaryGoogle.lastSuccessAt ? (
                                        <p className="text-[11px] text-slate-500">
                                            Last verified: {new Date(primaryGoogle.lastSuccessAt).toLocaleString()}
                                        </p>
                                    ) : null}
                                </div>

                                {(googleNeedsReconnect || scopeError) ? (
                                    <div className="flex flex-wrap gap-2">
                                        <a
                                            href="/api/google/reconnect?returnTo=/dashboard"
                                            className="cursor-pointer inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
                                        >
                                            Reconnect Google Sheets
                                        </a>
                                    </div>
                                ) : null}
                            </div>
                        ) : (
                            <p className="mt-1 text-xs text-slate-600">No Google Sheets account connected yet.</p>
                        )}
                    </div>
                </div>
            </section>

            {/* Help card */}
            <section className="space-y-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">
                    Questions about billing?
                </h2>
                <p className="text-xs text-slate-600">
                    Billing is handled securely by Stripe. {helpText}
                    For questions about how billing interacts with sync limits or
                    workspaces, <a href="/pages/contact" className="underline hover:text-slate-900">contact support</a>.
                </p>
            </section>
        </div>
    );
}
