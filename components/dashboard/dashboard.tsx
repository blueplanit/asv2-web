// components/dashboard/dashboard.tsx
"use client";

import Link from "next/link";
import { WorkspaceCard, type Workspace } from "@/components/workspaces/workspace-card";
import { useUserState } from "@/components/user-state-provider";
import type { SyncConfig } from "@/lib/schemas/sync-config";
import { Squares2X2Icon, UserCircleIcon } from "@heroicons/react/20/solid";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccountPageClient } from "@/components/account/account-page-client";
import { BillingBar } from "@/components/account/billing-bar";
import { isDevEnvironment } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { BackfillIntroModal } from "./backfill-intro-modal";
import { trackAmplitudeEvent } from "@/lib/analytics/amplitude-client";

export type SurveyStep = "q1" | "q2" | "done";

// display labels for stripe object ids
const STRIPE_OBJECT_LABELS: Record<string, string> = {
    invoices: "Invoices",
    charges: "Charges",
    customers: "Customers",
    payouts: "Payouts",
    subscriptions: "Subscriptions",
    payment_intents: "Payment Intents",
    disputes: "Disputes",
    refunds: "Refunds",
    invoice_line_items: "Invoice Line Items",
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


export const POLL_INTERVAL_MS = 5000;
export const POLL_MAX_MS = 60_000; // 1 minute

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
    const objectsEnabled = cfg.stripeDataSyncMap?.filter((o) => o.enabled).map((o) => (STRIPE_OBJECT_LABELS[o.id] ?? o.id)) ?? [];

    let health: Workspace["health"] = "healthy";
    if (cfg.syncStatus === "backfill_running" || cfg.syncStatus === "gap_backfill_running") health = "backfilling" as any;
    else if (cfg.syncStatus === "paused") health = "paused" as any;
    else if (cfg.syncStatus === "error") health = "error" as any;
    else if (cfg.syncStatus === "retired") health = "retired" as any;

    const lastSyncAt = cfg.lastSyncAt ?? null;
    const nameLoading = resolvedTitle === undefined;

    const recoveryStatus = (cfg as any).recoveryStatus ?? null;
    const recoveryRunId = (cfg as any).recoveryRunId ?? null;
    const recoveryLastErrorMessage =
        (cfg as any).recoveryLastErrorMessage ??
        (cfg as any).lastError ??
        null;


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
        nextSyncAt: cfg.nextSyncAt ?? null,
        nextSyncReason: cfg.nextSyncReason ?? null,
        recoveryStatus,
        recoveryRunId,
        recoveryLastErrorMessage,
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
        case "sheet_created":
            return 3; // choose objects (sheet auto-created after Google connect)
        case "ready":
        default:
            return 3;
    }
}

export function DashboardClient() {
    const { user, refresh } = useUserState();
    const { onboardingStage, stripeConnections, syncConfigs } = user;

    const hasBackfillRunning = useMemo(
        () => syncConfigs.some((cfg) => cfg.syncStatus === "backfill_running"),
        [syncConfigs],
    );

    // Newest → oldest
    const sortedSyncConfigs = useMemo(
        () =>
            [...syncConfigs].sort(
                (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
            ),
        [syncConfigs],
    );

    // Prefer the most recent non-retired config as the "active" workspace.
    // If everything is retired, fall back to the newest one for display.
    const activeSyncConfig: SyncConfig | null = useMemo(() => {
        if (sortedSyncConfigs.length === 0) return null;
        const nonRetired = sortedSyncConfigs.filter(
            (cfg) => cfg.syncStatus !== "retired",
        );
        return nonRetired[0] ?? sortedSyncConfigs[0];
    }, [sortedSyncConfigs]);

    const [activeView, setActiveView] = useState<"workspaces" | "account">("workspaces");
    const [googleScopeError, setGoogleScopeError] = useState(false);
    const [sheetTitles, setSheetTitles] = useState<Record<string, string>>({});
    const [titlesRequested, setTitlesRequested] = useState(false);

    const searchParams = useSearchParams();
    const router = useRouter();

    const [backfillModalOpen, setBackfillModalOpen] = useState(false);
    const [surveyStep, setSurveyStep] = useState<SurveyStep>("q1");
    const prevHasBackfillRunningRef = useRef(hasBackfillRunning);
    // Dedicated edge tracker for modal auto-close, kept separate from the
    // analytics ref above (which is reset every render and would consume the
    // running→done signal before the auto-close effect could read it).
    const prevRunningForAutoCloseRef = useRef(hasBackfillRunning);
    const hasSyncError = useMemo(
        () => syncConfigs.some((cfg) => cfg.syncStatus === "error"),
        [syncConfigs],
    );
    const prevHasSyncErrorRef = useRef(hasSyncError);

    useEffect(() => {
        trackAmplitudeEvent("Dashboard Viewed");
    }, []);

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
        if (filteredConfigs.length === 0) return;
        if (!user?.profile?.googleUserId) return;

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
                    body: JSON.stringify({ 
                        spreadsheetIds: ids, 
                        userState: user,
                    }),
                });
                if (!res.ok) {
                    if (res.status === 403) {
                        const body = await res.json().catch(() => null);
                        if (body?.code === "google_auth_revoked") {
                            await refresh(); // picks up updated connection status from DynamoDB
                        }
                    }
                    console.error("Failed to fetch sheet titles");
                    return;
                }
                const data = (await res.json()) as { titles: Record<string, string> };
                setSheetTitles((prev) => ({ ...prev, ...data.titles }));
            } catch (err) {
                console.error("Error fetching sheet titles:", err);
            }
            finally {
                setTitlesRequested(false);
            }
        })();
    }, [filteredConfigs, user]);

    // While any syncConfig is in "backfill_running", poll the backend for updated syncStatus
    useEffect(() => {
        if (!hasBackfillRunning) return;
        if (typeof window === "undefined") return;

        let cancelled = false;
        const startedAt = Date.now();

        const intervalId = window.setInterval(async () => {
            if (cancelled) return;

            // stop polling after some time; user can still manually refresh the page
            if (Date.now() - startedAt > POLL_MAX_MS) {
                cancelled = true;
                window.clearInterval(intervalId);
                return;
            }

            try {
                await refresh(); // this should re-load user + syncConfigs from your API / Dynamo
            } catch (err) {
                if (isDevEnvironment()) {
                    console.error("Initial backfill polling refresh failed", err);
                }
            }
        }, POLL_INTERVAL_MS);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [hasBackfillRunning, refresh]);

    // derive workspace(s) from sync config + stripe connection
    const workspaces: Workspace[] =
        sortedSyncConfigs.length === 0
            ? []
            : sortedSyncConfigs.map((cfg) => {
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

    // console.log("workspaces", workspaces);

    const activeWorkspace = workspaces.find((ws) => ws.id === activeSyncConfig?.spreadsheetId) ?? workspaces[0] ?? null;
    const archivedWorkspaces = workspaces.filter((ws) => ws.id !== activeWorkspace?.id);

    const isOnboardingDone =
        activeSyncConfig &&
        (activeSyncConfig.syncStatus === "syncing" ||
            activeSyncConfig.syncStatus === "backfill_running" ||
            activeSyncConfig.syncStatus === "gap_backfill_running" ||
            activeSyncConfig.syncStatus === "paused" ||
            activeSyncConfig.syncStatus === "error");

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
        spreadsheetId: string,
        nextStatus: "paused" | "syncing",
    ) {
        // for MVP: single sync config per user → just set syncStatus
        try {
            const res = await fetch("/api/update/sync-config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ syncStatus: nextStatus, spreadsheetId, userState: user }),
            });
            if (!res.ok) {
                console.error("Failed to update sync status");
                return;
            }
            trackAmplitudeEvent("Sync Pause Toggled", {
                spreadsheet_id: spreadsheetId,
                next_status: nextStatus,
                action: nextStatus === "paused" ? "pause" : "unpause",
            });
            await refresh();
        } catch (err) {
            console.error("Error updating sync status", err);
        }
    }

    // Triggered once when redirected from onboarding with ?backfill_started=1, only if the current syncStatus is "backfill_running"
    useEffect(() => {
        const flag = searchParams.get("backfill_started");
        if (flag !== "1") return;
        // Show the modal as soon as we detect the flag
        setBackfillModalOpen(true);

        // Clean the URL so refreshes don't re-trigger the param
        router.replace("/dashboard", { scroll: false });
    }, [searchParams, router]);

    // Redirect to account view and surface an inline error when Google OAuth scope was denied
    useEffect(() => {
        if (searchParams.get("googleError") !== "scope_denied") return;
        setActiveView("account");
        setGoogleScopeError(true);
        router.replace("/dashboard", { scroll: false });
    }, [searchParams, router]);

    // When initial backfill completes (no configs are "backfill_running"), close the intro modal
    useEffect(() => {
        if (prevHasBackfillRunningRef.current && !hasBackfillRunning) {
            trackAmplitudeEvent("Backfill Completed", {
                spreadsheet_id: activeWorkspace?.id ?? null,
                workspace_name: activeWorkspace?.name ?? null,
            });
        }
        prevHasBackfillRunningRef.current = hasBackfillRunning;
    }, [hasBackfillRunning, activeWorkspace?.id, activeWorkspace?.name]);

    useEffect(() => {
        if (!prevHasSyncErrorRef.current && hasSyncError) {
            const erroredSyncConfig = syncConfigs.find((cfg) => cfg.syncStatus === "error");
            trackAmplitudeEvent("Sync Error Detected", {
                spreadsheet_id: erroredSyncConfig?.spreadsheetId ?? null,
                stripe_account_id: erroredSyncConfig?.stripeAccountId ?? null,
            });
        }
        prevHasSyncErrorRef.current = hasSyncError;
    }, [hasSyncError, syncConfigs]);

    // Keep intro modal in sync with backfill status. Never auto-close while the
    // user is still answering the survey (q1/q2). On the confirmation card,
    // auto-close ONLY on a running→done transition that happens while they're on
    // that card. If the backfill already finished before they reached the
    // confirmation card, leave the modal open — they dismiss it manually via
    // "Got it" or the backdrop.
    useEffect(() => {
        if (!backfillModalOpen) return;
        if (surveyStep !== "done") {
            // Track running state off the confirmation card so we can detect a
            // genuine transition (not a steady "already done") once they arrive.
            prevRunningForAutoCloseRef.current = hasBackfillRunning;
            return;
        }
        if (prevRunningForAutoCloseRef.current && !hasBackfillRunning) {
            handleBackfillModalOpenChange(false);
        }
        prevRunningForAutoCloseRef.current = hasBackfillRunning;
    }, [backfillModalOpen, hasBackfillRunning, surveyStep]);

    function handleBackfillModalOpenChange(open: boolean) {
        if (!open && activeWorkspace && user.profile?.userId) {
            const storageKey = `backfillIntroDismissed:${user.profile.userId}:${activeWorkspace.id}`;
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
                                    <>
                                        {activeWorkspace && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                    Current workspace
                                                </p>
                                                {(() => {
                                                    const syncConfig = syncConfigs.find(
                                                        (cfg) =>
                                                            cfg.spreadsheetId ===
                                                            activeWorkspace.id,
                                                    );
                                                    return (
                                                        <WorkspaceCard
                                                            key={activeWorkspace.id}
                                                            workspace={activeWorkspace}
                                                            onTogglePause={handleTogglePause}
                                                            sheetTabState={user.sheetTabState.filter((metric) => metric.spreadsheetId === activeWorkspace.id) ?? []}
                                                            stripeDataSyncMap={syncConfig?.stripeDataSyncMap ?? []}
                                                            setTitlesRequested={setTitlesRequested}
                                                        />
                                                    );
                                                })()}
                                            </div>
                                        )}

                                        {archivedWorkspaces.length > 0 && (
                                            <div className="space-y-2 pt-4 border-t border-slate-100">
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                    Previous workspaces
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    Older sheets remain available for
                                                    historical analysis. New syncs run
                                                    only against your current workspace
                                                    above.
                                                </p>
                                                <div className="mt-2 space-y-3">
                                                    {archivedWorkspaces.map((ws) => {
                                                        const syncConfig = syncConfigs.find(
                                                            (cfg) =>
                                                                cfg.spreadsheetId ===
                                                                ws.id,
                                                        );
                                                        return (
                                                            <WorkspaceCard
                                                                key={ws.id}
                                                                workspace={ws}
                                                                onTogglePause={handleTogglePause}
                                                                sheetTabState={user.sheetTabState.filter((metric) => metric.spreadsheetId === ws.id) ?? []}
                                                                stripeDataSyncMap={syncConfig?.stripeDataSyncMap ?? []}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </section>

                        </>
                    ) : (
                        <AccountPageClient
                            scopeError={googleScopeError}
                            onDismissScopeError={() => setGoogleScopeError(false)}
                        />
                    )}
                </div>
            </main>

            {activeWorkspace && (
                    <BackfillIntroModal
                        open={backfillModalOpen}
                        onOpenChange={handleBackfillModalOpenChange}
                        sheetUrl={activeWorkspace.sheetUrl}
                        workspaceName={activeWorkspace.name}
                        nameLoading={activeWorkspace.nameLoading ?? false}
                        onSurveyStepChange={setSurveyStep}
                    />
                )}

        </div>
    );
}
