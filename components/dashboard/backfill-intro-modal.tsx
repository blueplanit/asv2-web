// components/dashboard/backfill-intro-modal.tsx
"use client";

import { ArrowTopRightOnSquareIcon } from "@heroicons/react/20/solid";
import { ExternalLinkIcon } from "lucide-react";
import { trackAmplitudeEvent } from "@/lib/analytics/amplitude-client";

type BackfillIntroModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sheetUrl: string;
    workspaceName: string;
    nameLoading: boolean;
};

export function BackfillIntroModal({
    open,
    onOpenChange,
    sheetUrl,
    workspaceName,
    nameLoading,
}: BackfillIntroModalProps) {
    if (!open) return null;

    function handleClose() {
        onOpenChange(false);
    }

    function trackSpreadsheetLinkClick(source: string) {
        trackAmplitudeEvent("Spreadsheet Link Clicked", {
            source,
            workspace_name: workspaceName,
            sheet_url: sheetUrl,
        });
    }

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
            <div
                className="absolute inset-0"
                aria-hidden="true"
                onClick={handleClose}
            />
            <div className="relative z-50 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
                <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                        Onboarding complete!
                    </p>
                    <h2 className="text-lg font-semibold text-slate-900">
                        Nice! We’re loading your Stripe data into{" "}
                        <span className="text-indigo-700">{nameLoading ? <div className="mt-1 h-6 w-64 animate-pulse rounded bg-slate-200" /> : 
                        <span className="flex items-center gap-1"><a href={sheetUrl} target="_blank" rel="noreferrer" className="hover:underline" onClick={() => trackSpreadsheetLinkClick("backfill_intro_modal_title")}>{workspaceName}</a>
                        <ExternalLinkIcon className="h-4 w-4 cursor-pointer" aria-hidden="true" onClick={() => {
                            trackSpreadsheetLinkClick("backfill_intro_modal_icon");
                            window.open(sheetUrl, "_blank");
                        }}/></span>}</span>
                    </h2>
                    <p className="text-sm text-slate-700">
                        This may take a few minutes depending on volume. You can safely leave this page.
                    </p>
                </div>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <a
                        href={sheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => trackSpreadsheetLinkClick("backfill_intro_modal_button")}
                        className="inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        <span className="flex items-center gap-2">
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                        Open Google Sheet
                        </span>
                    </a>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="inline-flex cursor-pointer items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
}
