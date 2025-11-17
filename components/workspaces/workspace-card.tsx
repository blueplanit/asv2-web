"use client";

import Link from "next/link";

export type WorkspaceHealth = "healthy" | "delayed" | "error";

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

type Props = {
    workspace: Workspace;
    onSyncNow?: (id: string) => void;
};

export function WorkspaceCard({ workspace, onSyncNow }: Props) {
    const healthLabel =
        workspace.health === "healthy"
            ? "Healthy"
            : workspace.health === "delayed"
                ? "Delayed"
                : "Error";

    const healthColorClasses =
        workspace.health === "healthy"
            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
            : workspace.health === "delayed"
                ? "bg-amber-50 text-amber-700 ring-amber-100"
                : "bg-rose-50 text-rose-700 ring-rose-100";

    return (
        <article className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <h3 className="text-base font-semibold text-slate-900">{workspace.name}</h3>
                    <p className="text-sm text-slate-600">
                        Stripe: <span className="font-medium">{workspace.stripeAccountName}</span>
                    </p>
                    <p className="text-sm text-slate-600">
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
                <div className="flex flex-col items-end gap-2">
                    <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ring-1 ring-inset ${healthColorClasses}`}
                    >
                        {healthLabel}
                    </span>
                    <button
                        type="button"
                        onClick={() => onSyncNow?.(workspace.id)}
                        className="inline-flex items-center justify-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
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
                    Objects:{" "}
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
