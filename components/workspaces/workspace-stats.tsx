// components/workspaces/workspace-stats.tsx
import { SheetTabState, SYNCED_CELL_BUDGET } from "@blueplanit/asv2-shared";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { useState, useMemo } from "react";
import type { StripeDataSyncEntry } from "@/lib/schemas/sync-config";

// display labels for stripe object ids
const STRIPE_OBJECT_LABELS: Record<string, string> = {
    invoices: "Invoices",
    charges: "Charges",
    customers: "Customers",
    payouts: "Payouts",
    subscriptions: "Subscriptions",
    // payment_intents: "Payment Intents",
    disputes: "Disputes",
    invoice_line_items: "Invoice Line Items",
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
    columnCount: number;
    cellCount: number;
    lastSyncedAt: string;
};

export function WorkspaceStats({ sheetTabState, stripeDataSyncMap }: WorkspaceStatsProps) {
    const [open, setOpen] = useState(false);

    // Create a map from sheetId to StripeDataSyncEntry for quick lookup
    const sheetIdToEntry = useMemo(() => {
        const map = new Map<number, StripeDataSyncEntry>();
        for (const entry of stripeDataSyncMap) {
            if (entry.sheetId != null) map.set(entry.sheetId, entry);
        }
        return map;
    }, [stripeDataSyncMap]);

    // Build tab stats from metrics
    const tabStats: TabStat[] = useMemo(() => {
        const stats: TabStat[] = [];
        for (const state of sheetTabState) {
            const entry = sheetIdToEntry.get(state.sheetId);
            if (!entry || !entry.enabled) continue;

            const objectId = entry.id;
            const label = STRIPE_OBJECT_LABELS[objectId] ?? entry.displayName ?? objectId;

            const rowCount = state.rowCount ?? 0;
            const columnCount = state.columnCount ?? 0;

            // Capacity-policy is now spreadsheet-wide, but we still compute per-tab cells
            // so the user can understand where usage is coming from.
            const cellCount = rowCount * columnCount;

            stats.push({
                sheetId: state.sheetId,
                objectId: String(objectId),
                label,
                rowCount,
                columnCount,
                cellCount,
                lastSyncedAt: state.lastSyncedAt ?? "",
            });
        }
        return stats.sort((a, b) => a.label.localeCompare(b.label));
    }, [sheetTabState, sheetIdToEntry]);

    const totalTabs = tabStats.length;
    const totalRows = tabStats.reduce((sum, s) => sum + s.rowCount, 0);
    const totalCells = tabStats.reduce((sum, s) => sum + s.cellCount, 0);

    const budget = SYNCED_CELL_BUDGET;
    const ratio = budget > 0 ? totalCells / budget : 0;
    const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
    const width = Math.max(0.5, Math.min(100, ratio * 100)); // min width so zeros still render

    const prettyBudget = budget.toLocaleString();
    const prettyCells = totalCells.toLocaleString();

    return (
        <section className="border-t border-slate-100 pt-4">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="cursor-pointer flex w-full items-center justify-between gap-2 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
            >
                <span>Details</span>
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
                    <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-700">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Spreadsheet budget
                                </p>
                                <p className="text-sm font-medium text-slate-900">
                                    {prettyCells} / {prettyBudget} cells used ({pct}%)
                                </p>
                                <p className="text-[11px] text-slate-500">
                                    {totalRows.toLocaleString()} rows across {totalTabs} sheet tab{totalTabs === 1 ? "" : "s"}
                                </p>
                            </div>

                            <div className="text-right text-[11px] text-slate-500">
                                Spreadsheet-wide limit
                            </div>
                        </div>

                        {/* Single overall meter */}
                        <div className="h-2 rounded-full bg-slate-100">
                            <div
                                className="h-2 rounded-full bg-indigo-500 transition-all"
                                style={{ width: `${width}%` }}
                            />
                        </div>
                    </div>

                    {/* Optional: per-tab details (no per-tab meter) */}
                    <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Sheet Tabs Breakdown
                        </p>

                        {tabStats.length === 0 ? (
                            <p className="text-xs text-slate-500 py-2">
                                No sheet tab metrics available yet.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {tabStats.map((stat) => (
                                    <div
                                        key={stat.sheetId}
                                        className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                            <span className="font-medium text-slate-800">{stat.label}</span>
                                            <span className="text-slate-500">
                                                {stat.cellCount.toLocaleString()} cells
                                                {" · "}
                                                {stat.rowCount.toLocaleString()} rows × {stat.columnCount.toLocaleString()} cols
                                            </span>
                                        </div>
                                        <p className="mt-1 text-[11px] text-slate-500">
                                            Last synced:{" "}
                                            {stat.lastSyncedAt ? new Date(stat.lastSyncedAt).toLocaleString() : "—"}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
