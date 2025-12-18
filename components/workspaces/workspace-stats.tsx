// components/workspaces/workspace-stats.tsx
import { SheetTabState, TAB_ROW_LIMITS } from "@blueplanit/asv2-shared";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { useState, useMemo } from "react";
import type { StripeDataSyncEntry } from "@/lib/schemas/sync-config";
import { DEFAULT_ROW_CAPACITY } from "./workspace-card";

// display labels for stripe object ids
const STRIPE_OBJECT_LABELS: Record<string, string> = {
    invoices: "Invoices",
    charges: "Charges",
    customers: "Customers",
    payouts: "Payouts",
    subscriptions: "Subscriptions",
    payment_intents: "Payment Intents",
    disputes: "Disputes",
};

type WorkspaceStatsProps = {
    sheetTabState: SheetTabState[];
    stripeDataSyncMap: StripeDataSyncEntry[];
};

type TabStat = {
    sheetId: number;
    objectId: string;
    label: string;
    rowCount: number;
    maxRowCount: number;
    lastSyncedAt: string;
};

export function WorkspaceStats({ 
    sheetTabState,
    stripeDataSyncMap,
}: WorkspaceStatsProps) {
    const [open, setOpen] = useState(false);

    // Create a map from sheetId to StripeDataSyncEntry for quick lookup
    const sheetIdToEntry = useMemo(() => {
        const map = new Map<number, StripeDataSyncEntry>();
        for (const entry of stripeDataSyncMap) {
            if (entry.sheetId != null) {
                map.set(entry.sheetId, entry);
            }
        }
        return map;
    }, [stripeDataSyncMap]);

    // Build tab stats from metrics
    const tabStats: TabStat[] = useMemo(() => {
        return sheetTabState
            .map((metric) => {
                const entry = sheetIdToEntry.get(metric.sheetId);
                if (!entry) return null;

                const objectId = entry.id;
                const label = STRIPE_OBJECT_LABELS[objectId] ?? entry.displayName ?? objectId;
                const maxRowCount = metric.rowCapacity ?? TAB_ROW_LIMITS[objectId] ?? DEFAULT_ROW_CAPACITY;

                return {
                    sheetId: metric.sheetId,
                    objectId,
                    label,
                    rowCount: metric.rowCount ?? 0,
                    maxRowCount,
                    lastSyncedAt: metric.lastSyncedAt,
                };
            })
            .filter((stat): stat is TabStat => stat !== null)
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [sheetTabState, sheetIdToEntry]);

    const totalRowCount = tabStats.reduce((sum, stat) => sum + stat.rowCount, 0);
    const totalTabs = tabStats.length;

    return (
        <section className="border-t border-slate-100 pt-4">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="cursor-pointer flex w-full items-center justify-between gap-2 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
            >
                <span>Sync details</span>
                <span className="inline-flex items-center gap-2 text-[11px] font-normal normal-case text-slate-500">
                    {open ? "Hide" : "Show"} details
                    <ChevronDownIcon
                        className={`h-4 w-4 transition-transform ${open ? "rotate-180" : "rotate-0"}`}
                        aria-hidden="true"
                    />
                </span>
            </button>

            {open && (
                <div className="mt-4 space-y-4">
                    {/* Summary row */}
                    <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-700">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Total rows with data
                            </p>
                            <p className="text-sm font-medium text-slate-900">
                                {totalRowCount.toLocaleString()} rows across {totalTabs} sheet tab
                                {totalTabs === 1 ? "" : "s"}
                            </p>
                        </div>
                    </div>

                    {/* Per-tab "bar chart" */}
                    <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Breakdown by sheet tab
                        </p>
                        <div className="space-y-2">
                            {tabStats.length === 0 ? (
                                <p className="text-xs text-slate-500 py-2">
                                    No sheet tab metrics available yet.
                                </p>
                            ) : (
                                tabStats.map((stat) => {
                                    const ratio = stat.maxRowCount > 0 ? stat.rowCount / stat.maxRowCount : 0;
                                    const width = Math.max(.5, Math.round(ratio * 100)); // min width so zeros still render
                                    const percentage = stat.maxRowCount > 0 
                                        ? Math.round((stat.rowCount / stat.maxRowCount) * 100)
                                        : 0;
                                    
                                    return (
                                        <div
                                            key={stat.sheetId}
                                            className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2"
                                        >
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-medium text-slate-800">
                                                    {stat.label}
                                                </span>
                                                <span className="text-slate-500">
                                                    {stat.rowCount.toLocaleString()} rows, {percentage}% full
                                                </span>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-slate-100">
                                                <div
                                                    className="h-1.5 rounded-full bg-indigo-500 transition-all"
                                                    style={{ width: `${width}%` }}
                                                />
                                            </div>
                                            <p className="text-[11px] text-slate-500">
                                                Last synced: {new Date(stat.lastSyncedAt).toLocaleString()}
                                            </p>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
