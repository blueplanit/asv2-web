// components/dashboard/dashboard.tsx
"use client";

import Link from "next/link";
import { WorkspaceCard, type Workspace } from "@/components/workspaces/workspace-card";
import { useUserState } from "@/components/user-state-provider";
import type { SyncConfig } from "@/lib/schemas/sync-config";
import { Squares2X2Icon, UserCircleIcon } from "@heroicons/react/20/solid";
import { useEffect, useMemo, useState } from "react";
import { AccountPageClient } from "@/components/account/account-page-client";
import { BillingBar } from "@/components/account/billing-bar";
import { isDevEnvironment } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { BackfillIntroModal } from "./backfill-intro-modal";

// display labels for stripe object ids
const STRIPE_OBJECT_LABELS: Record<string, string> = {
    invoices: "Invoices",
    charges: "Charges",
    customers: "Customers",
    payouts: "Payouts",
    subscriptions: "Subscriptions",
};

const navItems = [
    {
        key: "workspaces" as const,
        name: "Workspace",
        icon: Squares2X2Icon,
    },
    {
        key: "account" as const,
        name: "Account",
        icon: UserCircleIcon,
    },
];

function mapSyncConfigToWorkspace(args: {
    cfg: SyncConfig;
    stripeAccountName?: string;
    googleAccountEmail?: string;
    sheetTitles: Record<string, string>;
}): Workspace {
    const { cfg, stripeAccountName, googleAccountEmail, sheetTitles } = args;

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${cfg.spreadsheetId}`;
    const resolvedTitle = sheetTitles[cfg.spreadsheetId];
    const name = resolvedTitle ?? cfg.spreadsheetId;

    const objectsEnabled =
        cfg.stripeDataSyncMap?.map((o) => STRIPE_OBJECT_LABELS[o.id] ?? o.id) ?? [];

    let health: Workspace["health"] = "healthy";
    if (cfg.syncStatus === "backfill_running") health = "backfilling" as any;
    else if (cfg.syncStatus === "paused") health = "paused" as any;
    else if (cfg.syncStatus === "error") health = "error" as any;

    const lastSyncAt = cfg.lastSyncAt ?? null;

    const nameLoading = resolvedTitle === undefined;

    return {
        id: cfg.spreadsheetId,
        name,
        stripeAccountName: stripeAccountName ?? cfg.stripeAccountId,
        googleAccountEmail: googleAccountEmail ?? "",
        sheetName: name,
        sheetUrl,
        lastSyncAt,
        health,
        objectsEnabled,
        syncStatus: cfg.syncStatus,
        nameLoading,
    };
}
// Map your onboarding stage → the next step id in /onboarding
function getNextOnboardingStep(onboardingStage: string): number {
    switch (onboardingStage) {
        case "account_only":
            return 1; // connect Stripe
        case "google_connected":
            return 1; // still need Stripe
        case "stripe_connected":
            return 2; // connect Google
        case "connections_linked":
            return 3; // create sheet
        case "sheet_created":
            return 4; // choose objects
        case "ready":
        default:
            return 4;
    }
}

export function DashboardClient() {
    const { user, refresh } = useUserState();
    const { onboardingStage, googleConnections, stripeConnections, syncConfigs } = user;
    const [activeView, setActiveView] = useState<"workspaces" | "account">("workspaces");
    const [sheetTitles, setSheetTitles] = useState<Record<string, string>>({});
    const [titlesRequested, setTitlesRequested] = useState(false);

    const searchParams = useSearchParams();
    const router = useRouter();

    const [backfillModalOpen, setBackfillModalOpen] = useState(false);

    // MVP: assume at most one sync config
    const userSyncConfig: SyncConfig | null =
        syncConfigs.length > 0 ? syncConfigs[0] : null;

    const filteredConfigs = useMemo(
        () =>
            syncConfigs.filter((cfg) => {
                const stripeConn = stripeConnections.find(
                    (c) => c.stripeAccountId === cfg.stripeAccountId,
                );
                if (!stripeConn) return false;
                if (!cfg.spreadsheetId) return false;
                if (!cfg.stripeDataSyncMap || cfg.stripeDataSyncMap.length === 0) return false;
                return true;
            }),
        [syncConfigs, stripeConnections],
    );

    // Lazy-load titles after initial render
    useEffect(() => {
        if (titlesRequested) return;
        if (filteredConfigs.length === 0) return;

        const ids = Array.from(
            new Set(filteredConfigs.map((cfg) => cfg.spreadsheetId)),
        ).filter((id) => !sheetTitles[id]);

        if (ids.length === 0) return;

        setTitlesRequested(true);

        (async () => {
            try {
                const res = await fetch("/api/google/sheet-titles", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ spreadsheetIds: ids }),
                });
                if (!res.ok) {
                    console.error("Failed to fetch sheet titles");
                    return;
                }
                const data = (await res.json()) as { titles: Record<string, string> };
                setSheetTitles((prev) => ({ ...prev, ...data.titles }));
            } catch (err) {
                console.error("Error fetching sheet titles:", err);
            }
        })();
    }, [filteredConfigs, googleConnections.length, sheetTitles, titlesRequested]);

    // derive workspace(s) from sync config + stripe connection
    const workspaces: Workspace[] =
        syncConfigs.length === 0
            ? []
            : syncConfigs.map((cfg) => {
                const stripeConn = stripeConnections.find(
                    (c) => c.stripeAccountId === cfg.stripeAccountId,
                );
                if (cfg.spreadsheetId === null ||
                    cfg.stripeDataSyncMap?.length === 0 ||
                    !stripeConn) return null;
                return mapSyncConfigToWorkspace({
                    cfg,
                    stripeAccountName: stripeConn?.businessName,
                    sheetTitles,
                    googleAccountEmail: user.googleConnections[0]?.email ?? "",
                });
            }).filter((ws) => ws !== null);


    const primaryWorkspace = workspaces[0] ?? null;
    const isOnboardingDone = userSyncConfig && (userSyncConfig.syncStatus === "syncing" || userSyncConfig.syncStatus === "backfill_running" || userSyncConfig.syncStatus === "paused");
    const nextStepId = getNextOnboardingStep(onboardingStage);
    const onboardingHref = `/onboarding?step=${nextStepId}`;

    // Top banner: only if not fully onboarded
    const showOnboardingBanner = !isOnboardingDone;
    const showPurchaseBanner = (user.profile?.subscriptionRawStatus === "trialing" || user.profile?.subscriptionStatus === "inactive") && isOnboardingDone;

    const stepLabel = (() => {
        switch (nextStepId) {
            case 1:
                return "Step 1 of 4 · Connect Stripe";
            case 2:
                return "Step 2 of 4 · Connect Google Sheets";
            case 3:
                return "Step 3 of 4 · Create your workspace sheet";
            case 4:
            default:
                return "Step 4 of 4 · Choose Stripe data & start sync";
        }
    })();

    const bannerSubtitle = (() => {
        if (nextStepId === 4) {
            return "You’re one step away from your first automatic Stripe → Sheets sync.";
        }
        return "Finish these last steps to get Stripe data synced into your Google Sheet.";
    })();

    async function handleTogglePause(
        workspaceId: string,
        nextStatus: "paused" | "syncing",
    ) {
        // for MVP: single sync config per user → just set syncStatus
        try {
            const res = await fetch("/api/update/sync-config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ syncStatus: nextStatus }),
            });
            if (!res.ok) {
                console.error("Failed to update sync status");
                return;
            }
            await refresh();
        } catch (err) {
            console.error("Error updating sync status", err);
        }
    }

    // Triggered once when redirected from onboarding with ?backfill_started=1, only if the current syncStatus is "backfill_running"
    useEffect(() => {
        const flag = searchParams.get("backfill_started");
        if (!flag) return;
        if (!primaryWorkspace || !userSyncConfig) return;
        if (userSyncConfig.syncStatus !== "backfill_running") {
            // Clean URL and mark processed; nothing to show.
            router.replace("/dashboard", { scroll: false });
            return;
        }

        if (flag === "1") {
            // Clean the URL so refreshes don't re-trigger the param
            router.replace("/dashboard", { scroll: false });
            setBackfillModalOpen(true);
            return;
        }
    }, [searchParams]);

    function handleBackfillModalOpenChange(open: boolean) {
        if (!open && primaryWorkspace && user.profile?.userId) {
            const storageKey = `backfillIntroDismissed:${user.profile.userId}:${primaryWorkspace.id}`;
            try {
                if (typeof window !== "undefined") {
                    window.localStorage.setItem(storageKey, "1");
                }
            } catch {
                // ignore localStorage errors
            }
        }
        setBackfillModalOpen(open);
    }

    if (isDevEnvironment()) {
        console.log("user", user);
    }

    return (
        <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">

            {/* Sidebar: always rendered, collapsible on md+ */}
            <aside
                className="flex w-full flex-row items-center border-b border-slate-200 bg-white/90 px-6 py-3
                           md:h-screen md:w-64 !flex-col md:items-start md:border-b-0 md:border-r md:bg-white/80 md:px-3 md:py-6 md:sticky md:top-0 flex-shrink-0"
            >
                {/* Nav */}
                <nav className="hidden w-full space-y-1 md:block md:mt-3">
                    {navItems.map((item) => {
                        const active = activeView === item.key;
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => setActiveView(item.key)}
                                className={`cursor-pointer w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${active
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "text-slate-700 hover:bg-slate-100"
                                    }`}
                            >
                                <Icon className="h-4 w-4 flex-shrink-0" />
                                <span
                                    className={`whitespace-nowrap transition-opacity duration-150 md:inline md:opacity-100 md:visible`}
                                >
                                    {item.name}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                {/* Mobile nav (top row) */}
                <nav className="ml-auto flex flex-1 justify-end gap-2 md:hidden">
                    {navItems.map((item) => {
                        const active = activeView === item.key;
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => setActiveView(item.key)}
                                className={`cursor-pointer w-full inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-medium ${active
                                    ? "border-slate-900 bg-slate-900 text-white"
                                    : "border-slate-200 bg-white text-slate-700"
                                    }`}
                            >
                                <Icon className="mr-1 h-4 w-4" />
                                {item.name}
                            </button>
                        );
                    })}
                </nav>
            </aside>

            <main className="flex-1 px-4 pb-8 pt-4 md:px-8 md:pb-10 md:pt-8">
                <div className="mx-auto max-w-5xl space-y-6">
                    {activeView === "workspaces" ? (
                        <>
                            <header className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm uppercase tracking-[0.18em] text-slate-500">
                                        Dashboard
                                    </p>
                                    <h1 className="text-2xl font-semibold text-slate-900">Your workspace</h1>
                                </div>
                            </header>

                            {showPurchaseBanner && <BillingBar />}

                            {showOnboardingBanner && (
                                <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 sm:p-5">
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                                                Finish setup
                                            </p>
                                            <h2 className="text-sm sm:text-base font-semibold text-slate-900">
                                                {stepLabel}
                                            </h2>
                                            <p className="text-sm text-slate-700">{bannerSubtitle}</p>
                                            <ul className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                                                <li className="flex items-center gap-1">
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${nextStepId > 1 ? "bg-emerald-500" : "bg-slate-300"
                                                            }`}
                                                    />
                                                    Connect Stripe
                                                </li>
                                                <li className="flex items-center gap-1">
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${nextStepId > 2 ? "bg-emerald-500" : "bg-slate-300"
                                                            }`}
                                                    />
                                                    Connect Google Sheets
                                                </li>
                                                <li className="flex items-center gap-1">
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${nextStepId > 3 ? "bg-emerald-500" : "bg-slate-300"
                                                            }`}
                                                    />
                                                    Create workspace sheet
                                                </li>
                                                <li className="flex items-center gap-1">
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${isOnboardingDone ? "bg-emerald-500" : "bg-slate-300"
                                                            }`}
                                                    />
                                                    Start sync
                                                </li>
                                            </ul>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <Link
                                                href={onboardingHref}
                                                className="inline-flex cursor-pointer items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
                                            >
                                                Resume setup
                                            </Link>
                                            <p className="text-[11px] text-slate-500">

                                            </p>
                                        </div>
                                    </div>
                                </section>
                            )}

                            <section className="space-y-4">
                                {workspaces.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-sm text-slate-600">
                                        <p className="font-medium text-slate-900">
                                            No workspace sheet created yet.
                                        </p>
                                        <p className="mt-1">
                                            Once setup is complete, this area will show your Stripe → Sheets workspace with
                                            sync health and last sync time.
                                        </p>
                                        <div className="mt-3">
                                            <Link
                                                href={onboardingHref}
                                                className="inline-flex cursor-pointer items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
                                            >
                                                Finish setup
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    workspaces.map((ws) => (
                                        <WorkspaceCard
                                            key={ws.id}
                                            workspace={ws}
                                            onSyncNow={(id) => {
                                                console.log("Sync now for workspace", id);
                                            }}
                                            onTogglePause={handleTogglePause}
                                        />
                                    ))
                                )}
                            </section>

                        </>
                    ) : (
                        <AccountPageClient />
                    )}
                </div>
            </main>

            {primaryWorkspace && userSyncConfig?.syncStatus === "backfill_running" && (
                <BackfillIntroModal
                    open={backfillModalOpen}
                    onOpenChange={handleBackfillModalOpenChange}
                    sheetUrl={primaryWorkspace.sheetUrl}
                    workspaceName={primaryWorkspace.name}
                    nameLoading={primaryWorkspace.nameLoading ?? false}
                />
            )}
        </div>
    );
}
