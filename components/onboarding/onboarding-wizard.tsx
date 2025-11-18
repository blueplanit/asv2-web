// components/onboarding/onboarding-wizard.tsx
"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

type StepStatus = "complete" | "current" | "upcoming";

export type Step = {
    id: number;
    title: string;
    description: string;
    ctaLabel: string;
    status?: StepStatus;
    helper?: string;
};

const steps: Step[] = [
    {
        id: 1,
        title: "Connect Stripe",
        description: "Connect the Stripe account you want mirrored into Sheets via Stripe Connect OAuth.",
        ctaLabel: "Connect Stripe",
        helper: "We never see full card numbers—Stripe handles billing data.",
    },
    {
        id: 2,
        title: "Grant Sheets access",
        description:
            "Allow AutoSync to create and update one Google Sheet in your Drive using drive.file + spreadsheets scopes.",
        ctaLabel: "Connect Google Sheets",
    },
    {
        id: 3,
        title: "Create your workspace sheet",
        description:
            "We’ll create a spreadsheet named “Stripe Sync – {Business}” with protected *_raw tabs and a Working tab for analysis.",
        ctaLabel: "Create sheet",
    },
    {
        id: 4,
        title: "Choose objects & start sync",
        description:
            "Pick which Stripe objects to mirror and how far back to pull, then start your initial backfill and ongoing sync.",
        ctaLabel: "Start backfill & sync",
    },
];

const selectedObjects = [
    { name: "Invoices", enabled: true, note: "includes status + payments" },
    { name: "Charges", enabled: true, note: "card + ACH charges" },
    { name: "Customers", enabled: true, note: "all identifiers + emails" },
    { name: "Payouts", enabled: true, note: "with fees and net" },
    { name: "Refunds", enabled: false, note: "toggle on to include" },
    { name: "Balance txns", enabled: false, note: "advanced reconciliation" },
];

async function createSheet() {
    const res = await fetch("/api/google/create-sheet", {
        method: "POST",
    });
    return res.json();
}

export function OnboardingWizard() {
    const searchParams = useSearchParams();

    // Derive initial step from ?step= query, default to 1
    const initialIndex = React.useMemo(() => {
        const stepParam = searchParams.get("step");
        const stepNumber = stepParam ? parseInt(stepParam, 10) : 1;
        if (!Number.isFinite(stepNumber)) return 0;
        return Math.min(Math.max(stepNumber - 1, 0), steps.length - 1);
    }, [searchParams]);

    const [currentStepIndex, setCurrentStepIndex] = React.useState(initialIndex);

    // If the query param changes (e.g. another redirect), sync the step
    React.useEffect(() => {
        setCurrentStepIndex(initialIndex);
    }, [initialIndex]);

    const totalSteps = steps.length;
    const currentStep = steps[currentStepIndex];

    const progressPercent = ((currentStepIndex + 1) / totalSteps) * 100;
    const isFirstStep = currentStepIndex === 0;
    const isLastStep = currentStepIndex === totalSteps - 1;

    async function handlePrimaryAction() {
        
        if (currentStep.id === 1) {
            // Stripe connect → Stripe OAuth
            window.location.href = "/api/stripe/connect";
            return;
        }
        else if (currentStep.id === 2) {
            // Sheets access → Google OAuth
            window.location.href = "/api/google/connect";
            return;
        }
        else if (currentStep.id === 3) {
            // Create sheet
            const createSheetResponse = await createSheet();
            console.log(createSheetResponse);
        }

        // TODO: later:
        // if (currentStep.id === 1) { /* Stripe connect */ }
        // if (currentStep.id === 3) { /* create sheet */ }
        // if (currentStep.id === 4) { /* start backfill */ }

        if (!isLastStep) {
            setCurrentStepIndex((prev) => Math.min(prev + 1, totalSteps - 1));
        }
    }

    function handleBack() {
        if (!isFirstStep) {
            setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
        }
    }

    return (
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
            {/* Left rail */}
            <header className="flex flex-col gap-4 lg:sticky lg:top-8 lg:max-w-sm">
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100">
                    <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
                    Get Started
                </div>
                <div className="space-y-3">
                    <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                        Set up your workspace in minutes—then let continuous sync do the rest.
                    </h1>
                </div>
            </header>

            {/* Main: single active step */}
            <main className="flex-1 space-y-8">
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-semibold text-slate-900">
                                    {currentStepIndex + 1} of {totalSteps}
                                </h2>
                                <div className="h-1.5 w-32 rounded-full bg-slate-100">
                                    <div
                                        className="h-1.5 rounded-full bg-emerald-500 transition-all"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Active step card */}
                    <div className="mt-6">
                        <article className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    <div className="space-y-1">
                                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                            Step {currentStep.id}
                                        </p>
                                        <h3 className="text-lg font-semibold text-slate-900">{currentStep.title}</h3>
                                        <p className="text-sm text-slate-600">{currentStep.description}</p>
                                        {currentStep.helper && (
                                            <p className="text-sm font-medium text-slate-700">{currentStep.helper}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                                    <div className="flex gap-2">
                                        {!isFirstStep && (
                                            <button
                                                type="button"
                                                onClick={handleBack}
                                                className="inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                                            >
                                                Back
                                            </button>
                                        )}
                                        <button
                                            className="inline-flex cursor-pointer items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                                            type="button"
                                            onClick={handlePrimaryAction}
                                            aria-label={currentStep.ctaLabel}
                                        >
                                            {currentStep.ctaLabel}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Step-specific panels */}
                            {currentStep.id === 2 && (
                                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900">
                                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 ring-1 ring-inset ring-indigo-100">
                                        Permissions
                                    </span>
                                    drive.file scope only. We never access existing files you own; new sheets are
                                    created in your Drive with you as the owner.
                                </div>
                            )}

                            {currentStep.id === 4 && (
                                <div className="grid gap-3 rounded-xl border border-slate-100 bg-white/80 p-3 sm:grid-cols-2">
                                    {selectedObjects.map((object) => (
                                        <div
                                            key={object.name}
                                            className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${object.enabled ? "border-emerald-100 bg-emerald-50/70" : "border-slate-200 bg-slate-50"
                                                }`}
                                        >
                                            <div
                                                className={`mt-1 size-2 rounded-full ${object.enabled ? "bg-emerald-500" : "bg-slate-300"
                                                    }`}
                                                aria-hidden
                                            />
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-semibold text-slate-900">{object.name}</p>
                                                <p className="text-sm text-slate-600">{object.note}</p>
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                    {object.enabled ? "Enabled" : "Optional"}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </article>
                    </div>
                </section>
            </main>
        </div>
    );
}
