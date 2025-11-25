"use client";
import {
    EllipsisHorizontalIcon,
    PauseCircleIcon,
    PlayCircleIcon,
    ArrowPathIcon,
} from "@heroicons/react/20/solid";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

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
    syncStatus: "syncing" | "paused" | "backfill_running" | "error" | "onboarding";
    nameLoading?: boolean;
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
    onTogglePause: (id: string, nextStatus: "paused" | "syncing") => void;
};

export function WorkspaceCard({ workspace, onSyncNow, onTogglePause }: Props) {
    const health = HEALTH_LABELS[workspace.health];
    const healthLabel = health.label;
    const healthColorClasses = health.color;
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${workspace.id}`;
    const name = workspace.name;
    const nameLoading = workspace.nameLoading ?? false;
    const isPaused = workspace.syncStatus === "paused";

    // basic click-outside to close the menu
    useEffect(() => {
        if (!menuOpen) return;
        function handleClick(event: MouseEvent) {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [menuOpen]);

    function handlePauseClick() {
        const next = isPaused ? "syncing" : "paused";
        onTogglePause(workspace.id, next);
        setMenuOpen(false);
    }

    function handleBackfillClick() {
        // TODO: wire to backfill API
        console.log("Backfill requested for workspace", workspace.id);
        setMenuOpen(false);
    }

    console.log("workspace", workspace);

    return (
        <article className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
                {/* LEFT COLUMN */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">  
                    {nameLoading ? (
                        <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                    ) : (
                        <a
                            href={sheetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block max-w-full truncate text-sm font-semibold text-indigo-600 hover:underline"
                            title={name}
                        >
                            <h1 className="text-lg font-semibold text-indigo-600 truncate">{name}</h1>
                        </a>
                    )}
                    </div>
                    <p className="text-sm text-slate-500 truncate">
                        {workspace.stripeAccountName}
                    </p>

                </div>

                {/* RIGHT COLUMN */}
                <div className="relative flex shrink-0 items-center gap-2">
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
                    <button
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen((v) => !v)}
                        className="cursor-pointer inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    >
                        <EllipsisHorizontalIcon className="h-4 w-4" aria-hidden="true" />
                    </button>


                    {/* 3-dot dropdown menu */}
                    {menuOpen && (
                        <div
                            ref={menuRef}
                            className="absolute right-0 top-5 z-20 w-44 rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg"
                        >
                            <button
                                type="button"
                                onClick={handlePauseClick}
                                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                            >
                                {isPaused ? (
                                    <PlayCircleIcon className="h-4 w-4" aria-hidden="true" />
                                ) : (
                                    <PauseCircleIcon className="h-4 w-4" aria-hidden="true" />
                                )}
                                <span>{isPaused ? "Resume syncing" : "Pause syncing"}</span>
                            </button>
                            {
                                workspace.syncStatus !== 'backfill_running' && workspace.health === 'paused' && (
                                    <button
                                        type="button"
                                        onClick={handleBackfillClick}
                                        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                                    >
                                        <ArrowPathIcon
                                            className="h-4 w-4 text-slate-500"
                                            aria-hidden="true"
                                        />
                                        <span>Start backfill</span>
                                    </button>
                                )
                            }
                        </div>
                    )}

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
                    <b>Syncing:</b>{" "}
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
