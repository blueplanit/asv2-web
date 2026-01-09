"use client";
import {
    EllipsisHorizontalIcon,
    PauseCircleIcon,
    PlayCircleIcon,
} from "@heroicons/react/20/solid";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState, useRef, useEffect, useMemo } from "react";
import { ExternalLinkIcon } from "lucide-react";
import { WorkspaceStats } from "./workspace-stats";
import { aggregateSheetMetrics, SheetTabState, SYNCED_CELL_BUDGET, WARN_THRESHOLD } from "@blueplanit/asv2-shared";
import type { StripeDataSyncEntry } from "@/lib/schemas/sync-config";
import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import { FOLDER_NAME, WORKING_SHEET_TITLE, WORKING_SHEET_MESSAGE, initSheetTabState } from "../onboarding/onboarding-wizard";
import { useUserState } from "../user-state-provider";
import { RotateSheetModal } from "../dashboard/rotate-sheet-modal";
import { SyncStatus, WorkspaceHealth } from "@/lib/types/sync-status";

export type RecoveryStatus = "requested" | "pulling" | "writing" | "success" | "failed";

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
    syncStatus: SyncStatus;
    nameLoading?: boolean;
    nextSyncAt: string | null;
    nextSyncReason: "manual_trigger" | "scheduled_sync" | "error" | "syncing" | "retired" | null;
    recoveryStatus: RecoveryStatus | null;
    recoveryRunId: string | null;
    recoveryLastErrorMessage: string | null;
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
        tooltip: "The workspace is backfilling data from your Stripe account. This may take some time depending on the amount of data you have.",
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
    onTogglePause: (spreadsheetId: string, nextStatus: "paused" | "syncing") => void;
    sheetTabState: SheetTabState[];
    stripeDataSyncMap: StripeDataSyncEntry[];
    setTitlesRequested?: (requested: boolean) => void;
};


export function WorkspaceCard({
    workspace,
    onSyncNow,
    onTogglePause,
    sheetTabState,
    stripeDataSyncMap,
    setTitlesRequested = () => { },
}: Props) {
    const { user, refresh } = useUserState();
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

    const [recovering, setRecovering] = useState(false);
    const [recoveryUiError, setRecoveryUiError] = useState<string | null>(null);
    const [localRecoveryStatus, setLocalRecoveryStatus] = useState<RecoveryStatus | null>(workspace.recoveryStatus ?? null);
    const [localRecoveryRunId, setLocalRecoveryRunId] = useState<string | null>(workspace.recoveryRunId ?? null);

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

    useEffect(() => {
        setLocalRecoveryStatus(workspace.recoveryStatus ?? null);
        setLocalRecoveryRunId(workspace.recoveryRunId ?? null);

        if (
            workspace.recoveryStatus &&
            ["requested", "pulling", "writing"].includes(workspace.recoveryStatus)
        ) {
            setRecovering(true);
        } else if (!workspace.recoveryStatus || workspace.recoveryStatus === "success") {
            setRecovering(false);
        }
    }, [workspace.recoveryStatus, workspace.recoveryRunId]);

    function handlePauseClick() {
        const next = isPaused ? "syncing" : "paused";
        onTogglePause(workspace.id, next);
        setMenuOpen(false);
    }

    function formatNextSyncLabel(nextSyncAtIso: string): string {
        const ts = Date.parse(nextSyncAtIso);
        if (!Number.isFinite(ts)) return "Next sync: Scheduled";

        const now = Date.now();
        const diffMs = ts - now;

        if (diffMs <= 0) return "Next sync: Soon";

        const diffMin = Math.round(diffMs / 60_000);
        // Prefer relative for near-term, absolute for later
        if (diffMin <= 90) return `Next sync in ${diffMin} minutes`;

        return `Next sync at ${new Date(ts).toLocaleString()}`;
    }

    // Derive next-sync UI text based on syncStatus + nextSyncAt/Reason
    const nextSyncText = useMemo(() => {
        if (isRetired) return null;

        if (isPaused) return "Next sync: Paused";
        if (isBackfilling) return "Next sync: After backfill completes";

        if (isError) {
            // If backend schedules retries via nextSyncAt, show it; otherwise say not scheduled
            if (workspace.nextSyncAt) {
                return formatNextSyncLabel(workspace.nextSyncAt).replace("Next sync", "Next retry");
            }
            return "Next retry: Not scheduled";
        }

        if (workspace.nextSyncAt) {
            const base = formatNextSyncLabel(workspace.nextSyncAt);

            // Optional: keep reason out of UI; or tweak copy for manual triggers
            if (workspace.nextSyncReason === "manual_trigger") {
                return base.replace("Next sync", "Next sync (manual)");
            }
            return base;
        }

        // If we don't have nextSyncAt, be explicit
        if (workspace.syncStatus === "syncing") return "Next sync: Scheduled";
        if (workspace.syncStatus === "onboarding") return "Next sync: Not scheduled yet";

        return null;
    }, [
        workspace.nextSyncAt,
        workspace.nextSyncReason,
        workspace.syncStatus,
        isPaused,
        isBackfilling,
        isError,
        isRetired,
    ]);

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
                    userState: user,
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
                    "We couldn’t create a new sheet. Please try again or contact support.",
                );
                return;
            }

            const data = await res.json();
            if (data?.newSyncConfig?.spreadsheetId) {
                await initSheetTabState(data.newSyncConfig.spreadsheetId, data.newSyncConfig.stripeDataSyncMap);
            }

            await refresh();
            if (setTitlesRequested) {
                setTitlesRequested(true);
            }
            setRotateModalOpen(false);
        } catch (e) {
            console.error("Failed to rotate sheet:", e);
            setRotateError(
                "Unexpected error while rotating the sheet. Please try again or contact support.",
            );
        } finally {
            setRotateSubmitting(false);
        }
    }

    async function handleRecoverClick() {
        if (!workspace.id || recovering || isBackfilling || isRetired) return;

        try {
            setRecovering(true);
            setRecoveryUiError(null);

            const res = await fetch("/api/sync/recover", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    spreadsheetId: workspace.id,
                    userState: user,
                }),
            });

            if (!res.ok) {
                const text = await res.text().catch(() => "");
                if (res.status === 409) {
                    setRecoveryUiError(
                        "A recovery/backfill run is already in progress for this workspace.",
                    );
                } else if (res.status === 400) {
                    setRecoveryUiError(
                        text || "Recovery cannot be started for this workspace. If this issue persists, please contact support.",
                    );
                } else {
                    setRecoveryUiError(
                        "An error occurred while starting recovery. Please try again in a moment. If the issue persists, please contact support.",
                    );
                }
                setRecovering(false);
                return;
            }

            const data = (await res.json()) as { runId: string };

            setLocalRecoveryRunId(data.runId);
            setLocalRecoveryStatus("requested");
        } catch (err) {
            console.error("Failed to start recovery", err);
            setRecoveryUiError(
                "Unexpected error starting recovery. Please try again in a moment. If the issue persists, please contact support.",
            );
            setRecovering(false);
        }
    }

    const isRecoveringActive =
        recovering || (localRecoveryStatus !== null && ["requested", "pulling", "writing"].includes(localRecoveryStatus));

    const syncStatusLabel = (() => {
        if (isBackfilling) {
            if (isRecoveringActive) {
                if (localRecoveryStatus === "requested") {
                    return "Recovery requested. Preparing to backfill missed Stripe events.";
                }
                if (localRecoveryStatus === "pulling") {
                    return "Recovering: pulling missed Stripe events into the buffer.";
                }
                if (localRecoveryStatus === "writing") {
                    return "Recovering: writing recovered data into your sheet.";
                }
                return "Backfilling Stripe data into your sheet.";
            }
            return "Backfilling Stripe data into your sheet.";
        }
        if (isPaused) return "Sync is paused. No new Stripe data is being written.";
        if (isError) return "Sync is currently failing. Fix connections and run recovery.";
        if (workspace.syncStatus === "syncing") return "Sync is active on the regular polling schedule.";
        if (isRetired) return "Sync is retired and not syncing data.";
        return "Sync will start once setup is complete.";
    })();


    const showSyncNowButton =  false; // TODO: wire to sync now API

    // Check if any sheet tab exceeds the warning threshold
    const spreadsheetCapacity = useMemo(() => {
        const m = aggregateSheetMetrics(sheetTabState);
        const usedCells = m?.totalCellsUsed ?? 0;
        const ratio = SYNCED_CELL_BUDGET > 0 ? usedCells / SYNCED_CELL_BUDGET : 0;
        return {
            usedCells,
            ratio,
            exceedsWarn: ratio >= WARN_THRESHOLD,
        };
    }, [sheetTabState]);

    const showLimitWarning = spreadsheetCapacity.exceedsWarn && !isRetired;
    const warningMessage = useMemo(() => {
        const pct = Math.round(WARN_THRESHOLD * 100);
        const usedPct = Math.round((spreadsheetCapacity.ratio || 0) * 100);
        if (usedPct >= pct) {
            return `Your spreadsheet is at ${usedPct}% of the synced cell budget. Create a new spreadsheet to avoid sync interruptions.`;
        } else {
            return `Your spreadsheet is at ${usedPct}% of the synced cell budget. Create a new spreadsheet before it reaches ${pct}% to avoid sync interruptions.`;
        }
    }, [spreadsheetCapacity.ratio]);

    const canRecover =
        isError || localRecoveryStatus === "failed" || workspace.recoveryStatus === "failed" || 
        workspace.syncStatus === "error" || workspace.syncStatus === "paused";

    return (
        <article className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">

            {/* Warning CTA if approaching capacity limit */}
            {showLimitWarning && (
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

                            {
                                canRecover && (
                                    <button
                                        type="button"
                                        onClick={handleRecoverClick}
                                        disabled={recovering || isBackfilling}
                                        className={`cursor-pointer inline-flex items-center justify-center rounded-full bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-60
                                            ${recovering || isBackfilling ? "opacity-60 !cursor-not-allowed" : ""}`}
                                    >
                                        {recovering || isBackfilling ? "Recovering…" : "Recover sync"}
                                    </button>
                                )
                            }

                            {workspace.syncStatus !== "backfill_running" && <button
                                type="button"
                                aria-haspopup="menu"
                                aria-expanded={menuOpen}
                                onClick={() => setMenuOpen((v) => !v)}
                                className="cursor-pointer inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                            >
                                <EllipsisHorizontalIcon className="h-4 w-4" aria-hidden="true" />
                            </button>
                            }

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
                                {workspace.lastSyncAt ? new Date(workspace.lastSyncAt).toLocaleString() : "Not yet synced"}
                            </span>
                        </p>

                        {nextSyncText && (
                            <p className="text-xs text-slate-500">
                                <span className="font-medium text-slate-800">{nextSyncText}</span>
                            </p>
                        )}

                        {isRecoveringActive && (
                            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex h-4 w-4 flex-shrink-0 animate-spin rounded-full border-[1.5px] border-amber-500 border-t-transparent" />
                                    <p className="text-xs font-medium text-amber-900">
                                        {localRecoveryStatus === "requested" && "Recovery starting…"}
                                        {localRecoveryStatus === "pulling" &&
                                            "Recovering missed Stripe events…"}
                                        {localRecoveryStatus === "writing" &&
                                            "Writing recovered data into your sheet…"}
                                        {!localRecoveryStatus && "Recovery in progress…"}
                                    </p>
                                </div>
                                <p className="mt-1 text-[11px] text-amber-800">
                                    You can keep using the dashboard; recovery continues in the background.
                                </p>
                            </div>
                        )}

                        {/* @ts-ignore */}
                        {(recoveryUiError || localRecoveryStatus === "failed") &&
                            !isRecoveringActive && (
                                <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
                                        Recovery
                                    </p>

                                    {workspace.recoveryLastErrorMessage && (
                                        <p className="text-xs text-red-800">
                                            {workspace.recoveryLastErrorMessage}
                                        </p>
                                    )}

                                    {recoveryUiError && (
                                        <p className="text-xs text-red-800">{recoveryUiError}</p>
                                    )}

                                    {localRecoveryStatus === "failed" && !recoveryUiError && (
                                        <p className="text-[11px] text-red-700">
                                            Last recovery attempt failed. Please try again. If the issue persists, please contact support.
                                        </p>
                                    )}
                                </div>
                            )}
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
                sheetTabState={sheetTabState}
                stripeDataSyncMap={stripeDataSyncMap}
            />
        </article>
    );
}
