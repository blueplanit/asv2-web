// components/dashboard/dashboard.tsx
"use client";

import Link from "next/link";
import { WorkspaceCard, type Workspace } from "@/components/workspaces/workspace-card";
import { useUserState } from "@/components/user-state-provider";
import type { SyncConfig } from "@/lib/schemas/sync-config";

// display labels for stripe object ids
const STRIPE_OBJECT_LABELS: Record<string, string> = {
    invoices: "Invoices",
    charges: "Charges",
    customers: "Customers",
    payouts: "Payouts",
    subscriptions: "Subscriptions",
};

function mapSyncConfigToWorkspace(args: {
    cfg: SyncConfig;
    stripeAccountName?: string;
}): Workspace {
    const { cfg, stripeAccountName } = args;

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${cfg.spreadsheetId}`;
    const sheetName = cfg.spreadsheetId;

    const objectsEnabled =
        cfg.enabledStripeObjects?.map((o) => STRIPE_OBJECT_LABELS[o] ?? o) ?? [];

    let health: Workspace["health"] = "healthy";
    if (cfg.syncStatus === "backfill_running") health = "backfilling" as any;
    else if (cfg.syncStatus === "paused") health = "paused" as any;
    else if (cfg.syncStatus === "error") health = "error" as any;

    const lastSyncAt = cfg.lastSyncAt ?? null;

    return {
        id: cfg.spreadsheetId,
        name: sheetName,
        stripeAccountName: stripeAccountName ?? cfg.stripeAccountId,
        sheetName,
        sheetUrl,
        lastSyncAt,
        health,
        objectsEnabled,
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
    const { user } = useUserState();
    const { onboardingStage, googleConnections, stripeConnections, syncConfigs } = user;

    // MVP: assume at most one sync config
    const userSyncConfig: SyncConfig | null =
        syncConfigs.length > 0 ? syncConfigs[0] : null;

    // derive workspace(s) from sync config + stripe connection
    const workspaces: Workspace[] =
        syncConfigs.length === 0
            ? []
            : syncConfigs.map((cfg) => {
                const stripeConn = stripeConnections.find(
                    (c) => c.stripeAccountId === cfg.stripeAccountId,
                );
                if (cfg.spreadsheetId === null || 
                    cfg.enabledStripeObjects?.length === 0 ||
                    !stripeConn) return null;
                return mapSyncConfigToWorkspace({
                    cfg,
                    stripeAccountName: stripeConn?.businessName,
                });
            }).filter((ws) => ws !== null);

    const syncIsActive = userSyncConfig && userSyncConfig.syncStatus === "syncing";

    const nextStepId = getNextOnboardingStep(onboardingStage);
    const onboardingHref = `/onboarding?step=${nextStepId}`;

    // Top banner: only if not fully onboarded
    const showOnboardingBanner = !syncIsActive;

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

    console.log("user", user);
    console.log("showOnboardingBanner", showOnboardingBanner);

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-slate-500">
                        Dashboard
                    </p>
                    <h1 className="text-2xl font-semibold text-slate-900">Your workspaces</h1>
                </div>
            </header>

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
                                        className={`h-1.5 w-1.5 rounded-full ${syncIsActive ? "bg-emerald-500" : "bg-slate-300"
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

            <section className="grid gap-4 md:grid-cols-2">
                {workspaces.length === 0 ? (
                    <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-sm text-slate-600">
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
                                // later: POST /api/workspaces/{id}/sync
                                console.log("Sync now for workspace", id);
                            }}
                        // optional: if not active, WorkspaceCard can show a "Setup in progress" badge
                        // and disable the Sync Now button based on ws.health
                        />
                    ))
                )}
            </section>
        </div>
    );
}
