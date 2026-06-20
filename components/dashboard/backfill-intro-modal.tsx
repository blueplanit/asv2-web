// components/dashboard/backfill-intro-modal.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/20/solid";
import { ExternalLinkIcon } from "lucide-react";
import { trackAmplitudeEvent } from "@/lib/analytics/amplitude-client";
import { type SurveyStep } from "@/lib/onboarding/survey-options";

type BackfillIntroModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sheetUrl: string;
    workspaceName: string;
    nameLoading: boolean;
    onSurveyStepChange?: (step: SurveyStep) => void;
};

export function BackfillIntroModal({
    open,
    onOpenChange,
    sheetUrl,
    workspaceName,
    nameLoading,
    onSurveyStepChange,
}: BackfillIntroModalProps) {
    const [surveyStep, setSurveyStep] = useState<SurveyStep>("q1");
    const [role, setRole] = useState("");
    const [problem, setProblem] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const goToStep = useCallback(
        (next: SurveyStep) => {
            setSurveyStep(next);
            onSurveyStepChange?.(next);
        },
        [onSurveyStepChange],
    );

    useEffect(() => {
        if (!open) return;
        setSurveyStep("q1");
        setRole("");
        setProblem("");
        setSubmitting(false);
        onSurveyStepChange?.("q1");
    }, [open, onSurveyStepChange]);

    if (!open) return null;

    const isSurveyPhase = surveyStep === "q1" || surveyStep === "q2";

    function handleClose() {
        onOpenChange(false);
    }

    async function handleSkip() {
        if (submitting) return;
        setSubmitting(true);
        try {
            await submitSurveyAnswers({ skipped: true });
        } finally {
            goToStep("done");
            setSubmitting(false);
        }
    }

    function trackSpreadsheetLinkClick(source: string) {
        trackAmplitudeEvent("Spreadsheet Link Clicked", {
            source,
            workspace_name: workspaceName,
            sheet_url: sheetUrl,
        });
    }

    function canSubmitSurvey() {
        return problem.trim().length > 0;
    }

    async function submitSurveyAnswers(skipped?: { skipped: boolean }) {
        const body: Record<string, string> = {
            role: role.trim(),
            problem: problem.trim(),
        };
        if (skipped) {
            body.role = "skipped";
            body.problem = "skipped";
        }
        try {
            const response = await fetch("/api/onboarding/survey", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                console.error("Failed to submit survey answers");
            }
        } catch {
            console.error("Failed to submit survey answers");
        }
    }

    function handleQ1Next() {
        if (!role.trim()) return;
        goToStep("q2");
    }

    async function handleQ2Submit() {
        if (!canSubmitSurvey()) return;
        if (submitting) return;
        setSubmitting(true);
        try {
            await submitSurveyAnswers();
        } finally {
            goToStep("done");
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
            {!isSurveyPhase && (
                <div
                    className="absolute inset-0"
                    aria-hidden="true"
                    onClick={handleClose}
                />
            )}
            <div className="relative z-50 flex w-full max-w-2xl min-h-[300px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-10 shadow-xl">
                {surveyStep === "q1" && (
                    <div className="w-full space-y-6">
                        <div className="space-y-3 text-center">
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
                                Question 1 of 2
                            </p>
                            <hr className="mx-auto w-12 border-indigo-100" />
                            <h2 className="text-xl font-semibold text-slate-900">
                                What best describes your role?
                            </h2>
                        </div>
                        <input
                            type="text"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            placeholder="Founder, CEO, Finance Manager, Operations Manager ..."
                            className="w-full rounded-xl border border-indigo-200 px-4 py-3 text-base text-slate-900 placeholder:text-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            maxLength={120}
                        />
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                            <button
                                type="button"
                                onClick={handleSkip}
                                disabled={submitting}
                                className="inline-flex cursor-pointer items-center justify-center rounded-full pl-0 pr-3 py-2 text-xs font-normal text-slate-300 hover:text-slate-400"
                            >
                                Skip
                            </button>
                            <button
                                type="button"
                                onClick={handleQ1Next}
                                disabled={!role.trim()}
                                className="inline-flex cursor-pointer items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {surveyStep === "q2" && (
                    <div className="w-full space-y-6">
                        <div className="space-y-3 text-center">
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
                                Question 2 of 2
                            </p>
                            <hr className="mx-auto w-12 border-indigo-100" />
                            <h2 className="text-xl font-semibold text-slate-900">
                                What problem are you trying to solve with
                                SyncStaq?
                            </h2>
                        </div>
                        <input
                            type="text"
                            value={problem}
                            onChange={(e) => setProblem(e.target.value)}
                            placeholder="Sync Stripe payments to Google Sheets, track payouts, avoid manual CSV exports..."
                            className="w-full rounded-xl border border-indigo-200 px-4 py-3 text-base text-slate-900 placeholder:text-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            maxLength={280}
                        />
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                            <button
                                type="button"
                                onClick={handleSkip}
                                disabled={submitting}
                                className="inline-flex cursor-pointer items-center justify-center rounded-full pl-0 pr-3 py-2 text-xs font-normal text-slate-300 hover:text-slate-400"
                            >
                                Skip
                            </button>
                            <button
                                type="button"
                                onClick={handleQ2Submit}
                                disabled={!canSubmitSurvey() || submitting}
                                className="inline-flex cursor-pointer items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}

                {surveyStep === "done" && (
                    <>
                        <div className="w-full space-y-4">
                            <p className="text-lg font-bold uppercase tracking-tight text-indigo-600">
                                Onboarding complete!
                            </p>
                            <h2 className="text-lg font-semibold text-slate-900">
                                Nice! We&apos;re loading your Stripe data into{" "}
                                <span className="text-indigo-700">
                                    {nameLoading ? (
                                        <span className="mt-1 inline-block h-6 w-64 animate-pulse rounded bg-slate-200" />
                                    ) : (
                                        <span className="flex items-center gap-1">
                                            <a
                                                href={sheetUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="hover:underline"
                                                onClick={() =>
                                                    trackSpreadsheetLinkClick(
                                                        "backfill_intro_modal_title",
                                                    )
                                                }
                                            >
                                                {workspaceName}
                                            </a>
                                            <button
                                                type="button"
                                                aria-label="Open spreadsheet in new tab"
                                                className="inline-flex items-center justify-center rounded text-slate-600 hover:text-slate-800"
                                                onClick={() => {
                                                    trackSpreadsheetLinkClick(
                                                        "backfill_intro_modal_icon",
                                                    );
                                                    window.open(
                                                        sheetUrl,
                                                        "_blank",
                                                        "noopener,noreferrer",
                                                    );
                                                }}
                                            >
                                                <ExternalLinkIcon
                                                    className="h-4 w-4"
                                                    aria-hidden="true"
                                                />
                                            </button>
                                        </span>
                                    )}
                                </span>
                            </h2>
                            <p className="text-sm text-slate-700">
                                This may take a few minutes depending on volume.
                                You can safely leave this page.
                            </p>
                        </div>

                        <div className="w-full mt-5 flex flex-col gap-2 sm:flex-row sm:justify-between">
                            <a
                                href={sheetUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() =>
                                    trackSpreadsheetLinkClick(
                                        "backfill_intro_modal_button",
                                    )
                                }
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
                    </>
                )}
            </div>
        </div>
    );
}
