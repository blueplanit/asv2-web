// components/dashboard/backfill-intro-modal.tsx
"use client";

import * as React from "react";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/20/solid";
import { ExternalLinkIcon } from "lucide-react";
import { trackAmplitudeEvent } from "@/lib/analytics/amplitude-client";
import {
    SURVEY_PROBLEM_OPTIONS,
    SURVEY_ROLE_OPTIONS,
    type SurveyProblemId,
    type SurveyRoleId,
    type SurveyStep,
} from "@/lib/onboarding/survey-options";

type BackfillIntroModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sheetUrl: string;
    workspaceName: string;
    nameLoading: boolean;
    onSurveyStepChange?: (step: SurveyStep) => void;
};

function SurveyProgressDots({ step }: { step: SurveyStep }) {
    const activeIndex = step === "q1" ? 0 : step === "q2" ? 1 : 2;
    return (
        <div className="flex items-center justify-center gap-2" aria-hidden>
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                        i === activeIndex
                            ? "w-6 bg-indigo-500"
                            : i < activeIndex
                              ? "w-1.5 bg-indigo-300"
                              : "w-1.5 bg-slate-200"
                    }`}
                />
            ))}
        </div>
    );
}

function ChipGrid<T extends string>(props: {
    options: ReadonlyArray<{ id: T; label: string }>;
    selected: T | null;
    onSelect: (id: T) => void;
    disabled?: boolean;
}) {
    const { options, selected, onSelect, disabled } = props;
    return (
        <div className="flex flex-wrap gap-2">
            {options.map((opt) => {
                const isSelected = selected === opt.id;
                return (
                    <button
                        key={opt.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => onSelect(opt.id)}
                        className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                            isSelected
                                ? "border-indigo-300 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

export function BackfillIntroModal({
    open,
    onOpenChange,
    sheetUrl,
    workspaceName,
    nameLoading,
    onSurveyStepChange,
}: BackfillIntroModalProps) {
    const [surveyStep, setSurveyStep] = React.useState<SurveyStep>("q1");
    const [role, setRole] = React.useState<SurveyRoleId | null>(null);
    const [roleOther, setRoleOther] = React.useState("");
    const [problem, setProblem] = React.useState<SurveyProblemId | null>(null);
    const [problemOther, setProblemOther] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);

    const goToStep = React.useCallback(
        (next: SurveyStep) => {
            setSurveyStep(next);
            onSurveyStepChange?.(next);
        },
        [onSurveyStepChange],
    );

    React.useEffect(() => {
        if (!open) return;
        setSurveyStep("q1");
        setRole(null);
        setRoleOther("");
        setProblem(null);
        setProblemOther("");
        setSubmitting(false);
        onSurveyStepChange?.("q1");
    }, [open, onSurveyStepChange]);

    if (!open) return null;

    const isSurveyPhase = surveyStep === "q1" || surveyStep === "q2";

    function handleClose() {
        onOpenChange(false);
    }

    function handleSkip() {
        goToStep("done");
    }

    function trackSpreadsheetLinkClick(source: string) {
        trackAmplitudeEvent("Spreadsheet Link Clicked", {
            source,
            workspace_name: workspaceName,
            sheet_url: sheetUrl,
        });
    }

    function roleLabel(): string {
        if (!role) return "";
        if (role === "other") return roleOther.trim();
        return SURVEY_ROLE_OPTIONS.find((o) => o.id === role)?.label ?? role;
    }

    function problemLabel(): string {
        if (!problem) return "";
        if (problem === "other") return problemOther.trim();
        return SURVEY_PROBLEM_OPTIONS.find((o) => o.id === problem)?.label ?? problem;
    }

    function canAdvanceFromQ1() {
        if (!role) return false;
        if (role === "other") return roleOther.trim().length > 0;
        return true;
    }

    function canSubmitSurvey() {
        if (!problem) return false;
        if (problem === "other") return problemOther.trim().length > 0;
        return true;
    }

    function submitSurveyAnswers() {
        const payload = {
            role: roleLabel(),
            problem: problemLabel(),
            roleOther: role === "other" ? roleOther.trim() : undefined,
            problemOther: problem === "other" ? problemOther.trim() : undefined,
        };
        void fetch("/api/onboarding/survey", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        }).catch(() => {
            // fire-and-forget
        });
    }

    function handleQ1Next() {
        if (!canAdvanceFromQ1()) return;
        goToStep("q2");
    }

    function handleQ2Submit() {
        if (!canSubmitSurvey()) return;
        setSubmitting(true);
        submitSurveyAnswers();
        goToStep("done");
        setSubmitting(false);
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
            <div className="relative z-50 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
                {surveyStep === "q1" && (
                    <div className="space-y-4">
                        <div className="space-y-2 text-center">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                                Quick question
                            </p>
                            <h2 className="text-lg font-semibold text-slate-900">
                                While we load your data — help us tailor your workspace
                            </h2>
                            <p className="text-sm text-slate-600">
                                15 seconds, optional. What best describes your role?
                            </p>
                        </div>
                        <SurveyProgressDots step={surveyStep} />
                        <ChipGrid
                            options={SURVEY_ROLE_OPTIONS}
                            selected={role}
                            onSelect={setRole}
                        />
                        {role === "other" && (
                            <input
                                type="text"
                                value={roleOther}
                                onChange={(e) => setRoleOther(e.target.value)}
                                placeholder="Type your role…"
                                className="w-full rounded-xl border border-indigo-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                maxLength={120}
                            />
                        )}
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                            <button
                                type="button"
                                onClick={handleSkip}
                                className="inline-flex cursor-pointer items-center justify-center rounded-full px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700"
                            >
                                Skip
                            </button>
                            <button
                                type="button"
                                onClick={handleQ1Next}
                                disabled={!canAdvanceFromQ1()}
                                className="inline-flex cursor-pointer items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {surveyStep === "q2" && (
                    <div className="space-y-4">
                        <div className="space-y-2 text-center">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                                One more
                            </p>
                            <h2 className="text-lg font-semibold text-slate-900">
                                What problem are you trying to solve with SyncStaq?
                            </h2>
                        </div>
                        <SurveyProgressDots step={surveyStep} />
                        <ChipGrid
                            options={SURVEY_PROBLEM_OPTIONS}
                            selected={problem}
                            onSelect={setProblem}
                        />
                        {problem === "other" && (
                            <input
                                type="text"
                                value={problemOther}
                                onChange={(e) => setProblemOther(e.target.value)}
                                placeholder="Type your answer…"
                                className="w-full rounded-xl border border-indigo-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                maxLength={280}
                            />
                        )}
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                            <button
                                type="button"
                                onClick={handleSkip}
                                className="inline-flex cursor-pointer items-center justify-center rounded-full px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700"
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
                        <div className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                                Onboarding complete!
                            </p>
                            <h2 className="text-lg font-semibold text-slate-900">
                                Nice! We&apos;re loading your Stripe data into{" "}
                                <span className="text-indigo-700">
                                    {nameLoading ? (
                                        <div className="mt-1 h-6 w-64 animate-pulse rounded bg-slate-200" />
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
                                            <ExternalLinkIcon
                                                className="h-4 w-4 cursor-pointer"
                                                aria-hidden="true"
                                                onClick={() => {
                                                    trackSpreadsheetLinkClick(
                                                        "backfill_intro_modal_icon",
                                                    );
                                                    window.open(sheetUrl, "_blank");
                                                }}
                                            />
                                        </span>
                                    )}
                                </span>
                            </h2>
                            <p className="text-sm text-slate-700">
                                This may take a few minutes depending on volume. You can safely leave
                                this page.
                            </p>
                        </div>

                        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <a
                                href={sheetUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() =>
                                    trackSpreadsheetLinkClick("backfill_intro_modal_button")
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
