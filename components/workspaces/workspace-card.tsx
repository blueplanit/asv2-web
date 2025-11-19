"use client";

import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";

export type WorkspaceHealth = "healthy" | "backfilling" | "paused" | "error";

export type Workspace = {
    id: string;
    name: string;
    stripeAccountName: string;
    sheetName: string;
    sheetUrl: string;
    lastSyncAt: string | null;
    health: WorkspaceHealth;
    objectsEnabled: string[];
};

const HEALTH_LABELS: Record<WorkspaceHealth, { label: string; color: string; tooltip: string }> = {
    healthy: {
        label: "Healthy",
        color: "bg-emerald-50 text-emerald-700 ring-emerald-100",
        tooltip: "The workspace is healthy and syncing data correctly.",
    },
    backfilling: {
        label: "Backfilling",
        color: "bg-amber-50 text-amber-700 ring-amber-100",
        tooltip: "The workspace is backfilling data from your Stripe account. This may take a while depending on the amount of data you have.",
    },
    paused: {
        label: "Paused",
        color: "bg-rose-50 text-rose-700 ring-rose-100",
        tooltip: "The workspace is paused and not syncing data.",
    },
    error: {
        label: "Error",
        color: "bg-red-50 text-red-700 ring-red-100",
        tooltip: "The workspace is in error and not syncing data.",
    },
};

type Props = {
    workspace: Workspace;
    onSyncNow?: (id: string) => void;
};

export function WorkspaceCard({ workspace, onSyncNow }: Props) {
    const health = HEALTH_LABELS[workspace.health];
    const healthLabel = health.label;
    const healthColorClasses = health.color;

    return (
        <article className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
                {/* LEFT COLUMN */}
                <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-slate-900 truncate">{workspace.name}</h3>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500 truncate">
                        {workspace.stripeAccountName}
                    </p>

                    <p className="text-sm text-slate-600 truncate">
                        Sheet:{" "}
                        <Link
                            href={workspace.sheetUrl}
                            target="_blank"
                            className="font-medium text-indigo-600 underline-offset-2 hover:underline"
                        >
                            {workspace.sheetName}
                        </Link>
                    </p>
                </div>

                {/* RIGHT COLUMN */}
                <div className="flex shrink-0 items-center gap-2">
                    <Tooltip key={health.label}>
                        <TooltipTrigger asChild>
                            <span
                                className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] ring-1 ring-inset ${healthColorClasses}`}
                            >
                                {healthLabel}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p className="text-xs">{health.tooltip}</p>
                        </TooltipContent>
                    </Tooltip>
                    <button
                        type="button"
                        onClick={() => onSyncNow?.(workspace.id)}
                        className="cursor-pointer inline-flex items-center justify-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                    >
                        Sync now
                    </button>
                </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                <p>
                    Last sync:{" "}
                    <span className="font-medium">
                        {workspace.lastSyncAt ? workspace.lastSyncAt : "Not yet synced"}
                    </span>
                </p>
                <p className="flex flex-wrap gap-1">
                    Stripe data synced:{" "}
                    {workspace.objectsEnabled.map((obj) => (
                        <span
                            key={obj}
                            className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                        >
                            {obj}
                        </span>
                    ))}
                </p>
            </div>
        </article>
    );
}
