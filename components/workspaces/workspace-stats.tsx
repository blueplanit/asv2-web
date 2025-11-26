// components/workspaces/workspace-stats.tsx
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { useState } from "react";

type WorkspaceStatsProps = {
    objectsEnabled: string[];
};

type MockStat = {
    label: string;
    lastSync: number;
    last24h: number;
    total: number;
};

// Hardcoded mock stats keyed by display label (matches objectsEnabled entries)
const MOCK_STATS: Record<string, MockStat> = {
    Invoices: { label: "Invoices", lastSync: 18, last24h: 94, total: 1420 },
    Charges: { label: "Charges", lastSync: 32, last24h: 187, total: 3812 },
    Customers: { label: "Customers", lastSync: 9, last24h: 47, total: 962 },
    Payouts: { label: "Payouts", lastSync: 3, last24h: 11, total: 184 },
    Subscriptions: { label: "Subscriptions", lastSync: 7, last24h: 29, total: 536 },
};

export function WorkspaceStats({ objectsEnabled }: WorkspaceStatsProps) {
    const [open, setOpen] = useState(false);

    const rows: MockStat[] = (objectsEnabled.length ? objectsEnabled : Object.keys(MOCK_STATS))
        .map((label) => MOCK_STATS[label] ?? {
            label,
            lastSync: 0,
            last24h: 0,
            total: 0,
        });

    const maxLast24h = rows.length ? Math.max(...rows.map((r) => r.last24h || 1)) : 1;
    const totalLastSync = rows.reduce((sum, r) => sum + r.lastSync, 0);
    const totalLast24h = rows.reduce((sum, r) => sum + r.last24h, 0);
    const totalObjects = rows.length;

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
                                Since last sync
                            </p>
                            <p className="text-sm font-medium text-slate-900">
                                {totalLastSync} records across {totalObjects} object
                                {totalObjects === 1 ? "" : "s"}
                            </p>
                        </div>
                        <div className="h-8 w-px bg-slate-200 hidden sm:block" />
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Last 24 hours
                            </p>
                            <p className="text-sm font-medium text-slate-900">
                                {totalLast24h} records synced
                            </p>
                        </div>
                    </div>

                    {/* Per-object “bar chart” */}
                    <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Breakdown by object (last 24h)
                        </p>
                        <div className="space-y-2">
                            {rows.map((row) => {
                                const ratio = maxLast24h ? row.last24h / maxLast24h : 0;
                                const width = Math.max(6, Math.round(ratio * 100)); // min width so zeros still render
                                return (
                                    <div
                                        key={row.label}
                                        className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2"
                                    >
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-medium text-slate-800">
                                                {row.label}
                                            </span>
                                            <span className="text-slate-500">
                                                {row.last24h} in last 24h · {row.total} total
                                            </span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-slate-100">
                                            <div
                                                className="h-1.5 rounded-full bg-indigo-500 transition-all"
                                                style={{ width: `${width}%` }}
                                            />
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            {row.lastSync} new record{row.lastSync === 1 ? "" : "s"} in the last sync run.
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
