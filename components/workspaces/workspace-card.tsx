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
import { useState, useRef, useEffect } from "react";
import { ExternalLinkIcon } from "lucide-react";
import { WorkspaceStats } from "./workspace-stats";
import { aggregateSheetMetrics, SheetTabMetrics, TAB_ROW_LIMITS, WARN_THRESHOLD } from "@blueplanit/asv2-shared";
import type { StripeDataSyncEntry } from "@/lib/schemas/sync-config";
import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import { FOLDER_NAME, WORKING_SHEET_TITLE, WORKING_SHEET_MESSAGE } from "../onboarding/onboarding-wizard";
import { useUserState } from "../user-state-provider";
import { RotateSheetModal } from "../dashboard/rotate-sheet-modal";

export type WorkspaceHealth = "healthy" | "backfilling" | "paused" | "error" | "retired";

export type Workspace = {
    id: string;
    name: string;
    stripeAccountName: string;
    googleAccountEmail: string;
    sheetName: string;
    sheetUrl: string;
    lastSyncAt: string | null;
    health: WorkspaceHealth;
    objectsEnabled: string[];
    syncStatus: "syncing" | "paused" | "backfill_running" | "error" | "onboarding" | "retired";
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
    retired: {
        label: "Retired",
        color: "bg-slate-50 text-slate-700 ring-slate-100",
        tooltip: "The workspace is retired and not syncing data.",
    },
};

type Props = {
    workspace: Workspace;
    onSyncNow?: (id: string) => void;
    onTogglePause: (id: string, nextStatus: "paused" | "syncing") => void;
    sheetTabMetrics: SheetTabMetrics[];
    stripeDataSyncMap: StripeDataSyncEntry[];
    setTitlesRequested?: (requested: boolean) => void;
};

export const DEFAULT_ROW_CAPACITY = 30_000;

export function WorkspaceCard({
    workspace,
    onSyncNow,
    onTogglePause,
    sheetTabMetrics,
    stripeDataSyncMap,
    setTitlesRequested = () => {},
}: Props) {
    const { refresh } = useUserState();
    const health = HEALTH_LABELS[workspace.health];
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [rotateModalOpen, setRotateModalOpen] = useState(false);
    const [rotateSubmitting, setRotateSubmitting] = useState(false);
    const [rotateError, setRotateError] = useState<string | null>(null);


    const nameLoading = workspace.nameLoading ?? false;
    const isPaused = workspace.syncStatus === "paused";
    const isBackfilling = workspace.syncStatus === "backfill_running";
    const isError = workspace.syncStatus === "error";
    const isRetired = workspace.syncStatus === "retired";

    // click-outside to close menu
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

    async function handleConfirmRotate() {
        try {
            setRotateSubmitting(true);
            setRotateError(null);

            if (!workspace.id) {
                setRotateError("Workspace ID is required.");
                return;
            }
            if (!workspace.name) {
                setRotateError("Workspace name is required.");
                return;
            }

            const res = await fetch("/api/user/rotate-sheet", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    folderName: FOLDER_NAME,
                    workspaceSheetTitle: workspace.name,
                    workingSheetTitle: WORKING_SHEET_TITLE,
                    workingSheetMessage: WORKING_SHEET_MESSAGE,
                    existingSpreadsheetId: workspace.id,
                }),
            });

            if (!res.ok) {
                const text = await res.text().catch(() => "");
                console.error("Failed to rotate sheet:", text);
                setRotateError(
                    "We couldn’t create a new sheet. Please try again or check logs.",
                );
                return;
            }

            await refresh();
            if (setTitlesRequested) {
                setTitlesRequested(false);
            }
            setRotateModalOpen(false);
        } catch (e) {
            console.error("Failed to rotate sheet:", e);
            setRotateError(
                "Unexpected error while rotating the sheet. Please try again.",
            );
        } finally {
            setRotateSubmitting(false);
        }
    }


    async function handleRotateClick() {
        try {
            if (!workspace.id) {
                console.error("Workspace ID is required");
                return;
            }
            if (!workspace.name) {
                console.error("Workspace name is required");
                return;
            }

            const res = await fetch("/api/user/rotate-sheet", {
                method: "POST",
                body: JSON.stringify({
                    folderName: FOLDER_NAME,
                    workspaceSheetTitle: workspace.name,
                    workingSheetTitle: WORKING_SHEET_TITLE,
                    workingSheetMessage: WORKING_SHEET_MESSAGE,
                    existingSpreadsheetId: workspace.id,
                }),
            });
            if (!res.ok) {
                const text = await res.text().catch(() => "");
                console.error("Failed to rotate sheet:", text);
                return;
            }

            await refresh(); // now userState has SyncConfig + sheet info
            return res.json();
        } catch (e) {
            console.error("Failed to rotate sheet:", e);
            return false;
        }
    }

    const syncStatusLabel = (() => {
        if (isBackfilling) return "Backfilling historical Stripe data into your sheet.";
        if (isPaused) return "Sync is paused. No new Stripe data is being written.";
        if (isError) return "Sync is currently failing. Check logs or reconnect.";
        if (workspace.syncStatus === "syncing") return "Sync is active on the regular polling schedule.";
        if (isRetired) return "Sync is retired and not syncing data.";
        return "Sync will start once setup is complete.";
    })();

    const showSyncNowButton = workspace.syncStatus !== "backfill_running" && workspace.syncStatus !== "paused" && workspace.syncStatus !== "error";

    // Check if any sheet tab exceeds the warning threshold
    const exceedsTabRowWarningThreshold = (() => {
        // Create a map from sheetId to StripeDataSyncEntry for quick lookup
        const sheetIdToEntry = new Map<number, StripeDataSyncEntry>();
        for (const entry of stripeDataSyncMap) {
            if (entry.sheetId != null) {
                sheetIdToEntry.set(entry.sheetId, entry);
            }
        }

        // Check if any metric exceeds the threshold
        for (const metric of sheetTabMetrics) {
            const entry = sheetIdToEntry.get(metric.sheetId);
            if (!entry) continue;

            const objectId = entry.id;
            const maxRowCount = metric.rowCapacity ?? TAB_ROW_LIMITS[objectId] ?? DEFAULT_ROW_CAPACITY;
            const warningThreshold = WARN_THRESHOLD * maxRowCount;

            if (metric.rowCount > warningThreshold) {
                return true;
            }
        }
        return false;
    })();

    const exceedsSpreadsheetLevelCellBudgetWarningThreshold = (() => {
        const spreadsheetMetrics = aggregateSheetMetrics(sheetTabMetrics);
        if (spreadsheetMetrics?.cellUsageRatio && spreadsheetMetrics.cellUsageRatio >= WARN_THRESHOLD) {
            return true;
        }
        return false;
    })();

    const showLimitWarning = exceedsTabRowWarningThreshold || exceedsSpreadsheetLevelCellBudgetWarningThreshold;
    const warningMessage = (() => {
        if (exceedsTabRowWarningThreshold) {
            return `One or more sheet tabs are over ${Math.round(WARN_THRESHOLD * 100)}% full. Create a new spreadsheet to continue syncing without interruption.`;
        }
        if (exceedsSpreadsheetLevelCellBudgetWarningThreshold) {
            return `The spreadsheet is over ${Math.round(WARN_THRESHOLD * 100)}% full and nearing the budgeted limit. Create a new spreadsheet to continue syncing without interruption.`;
        }
        return "";
    })();

    return (
        <article className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">

            {/* Warning CTA if approaching capacity limit */}
            {showLimitWarning && !isRetired && (
                <div className="rounded-2xl border-2 border-red-600 bg-red-50 p-4 shadow-md">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <ExclamationTriangleIcon
                                className="h-5 w-5 flex-shrink-0 text-red-700"
                                aria-hidden="true"
                            />
                            <div className="flex-1 space-y-1">
                                <h3 className="text-sm font-semibold text-red-900">
                                    Spreadsheet approaching capacity limit
                                </h3>
                                <p className="text-xs text-red-800">
                                    {warningMessage}
                                </p>
                            </div>
                        </div>
                        <div
                            onClick={() => setRotateModalOpen(true)}
                            className="cursor-pointer inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-700 transition-colors whitespace-nowrap"
                        >
                            Create new spreadsheet
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER ROW */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                {/* Left: sheet + account */}
                <div className="min-w-0 flex-1 space-y-1">

                    {/* Sheet name */}
                    {nameLoading ? (
                        <div className="mt-1 h-6 w-64 animate-pulse rounded bg-slate-200" />
                    ) : (
                        <span className="flex items-center w-full gap-2">
                            <a
                                href={workspace.sheetUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="block max-w-full truncate text-lg font-semibold text-indigo-600 hover:underline"
                                title={workspace.name}
                            ><span className={`flex items-center gap-2 ${isRetired ? "!text-lg" : "!text-2xl"}`}>{workspace.name}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <ExternalLinkIcon className="h-4 w-4" aria-hidden="true" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Open in Google Sheets</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </span></a></span>
                    )}

                    {/* Stripe account */}
                    <p className="text-xs text-slate-500">
                        Stripe account:{" "}
                        <span className="font-medium text-slate-800">
                            {workspace.stripeAccountName}
                        </span>
                    </p>

                    {/* Google Sheets account */}
                    <p className="text-xs text-slate-500">
                        Google Sheets account:{" "}
                        <span className="font-medium text-slate-800">
                            {workspace.googleAccountEmail}
                        </span>
                    </p>
                </div>

                {/* Right: health + primary actions */}
                <div className="flex flex-row items-end gap-3">
                    <Tooltip key={health.label}>
                        <TooltipTrigger asChild>
                            <span
                                className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] ring-1 ring-inset ${health.color}`}
                            >
                                {health.label === "Backfilling" && (
                                    <span className="relative mr-2 inline-flex h-4 w-4 items-center justify-center">
                                        {/* outer ping */}
                                        <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-70 animate-ping" />
                                        {/* inner solid dot */}
                                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                                    </span>
                                )}

                                {health.label}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p className="text-xs">{health.tooltip}</p>
                        </TooltipContent>
                    </Tooltip>

                    {!isRetired && (
                        <div className="flex items-center gap-2">
                            {
                                showSyncNowButton && (
                                    <button
                                        type="button"
                                        onClick={() => onSyncNow?.(workspace.id)}
                                        className="cursor-pointer inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
                                    >
                                        Sync now
                                    </button>
                                )
                            }

                            <button
                                type="button"
                                aria-haspopup="menu"
                                aria-expanded={menuOpen}
                                onClick={() => setMenuOpen((v) => !v)}
                                className="cursor-pointer inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                            >
                                <EllipsisHorizontalIcon className="h-4 w-4" aria-hidden="true" />
                            </button>

                            {menuOpen && (
                                <div
                                    ref={menuRef}
                                    className="absolute z-20 mt-10 w-48 rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg"
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

                                    {workspace.syncStatus !== "backfill_running" &&
                                        workspace.health === "paused" && (
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
                                        )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* BODY GRID */}
            {!isRetired && (
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Sync status column */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Sync status
                        </h3>
                        <p className="text-sm text-slate-700">{syncStatusLabel}</p>
                        <p className="text-xs text-slate-500">
                            Last sync:{" "}
                            <span className="font-medium text-slate-800">
                                {workspace.lastSyncAt ? workspace.lastSyncAt : "Not yet synced"}
                            </span>
                        </p>
                    </div>

                    {/* Configuration / objects */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Stripe data synced
                        </h3>
                        {workspace.objectsEnabled.length === 0 ? (
                            <p className="text-sm text-slate-600">
                                No Stripe objects selected yet. Finish onboarding to choose data.
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {workspace.objectsEnabled.map((obj) => (
                                    <span
                                        key={obj}
                                        className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700"
                                    >
                                        {obj}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

<RotateSheetModal
    open={rotateModalOpen}
    onOpenChange={setRotateModalOpen}
    onConfirm={handleConfirmRotate}
    workspaceName={workspace.name}
    submitting={rotateSubmitting}
    error={rotateError}
/>


            {/* Collapsible sync stats */}
            <WorkspaceStats
                sheetTabMetrics={sheetTabMetrics}
                stripeDataSyncMap={stripeDataSyncMap}
            />
        </article>
    );
}
