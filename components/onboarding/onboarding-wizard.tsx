// components/onboarding/onboarding-wizard.tsx
"use client";

import * as React from "react";
import { useState } from "react";
import { useSearchParams, redirect, useRouter } from "next/navigation";
import { useUserState } from "../user-state-provider";
import { useEffect } from "react";
import { StripeObject, DEFAULT_ENABLED_STRIPE_OBJECTS } from "@/lib/schemas/sync-config";
import { StripeObjectsStep } from "./stripe-objects-config";

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
        description: "Connect the Stripe account you want synced to Google Sheets via a secure connection using Stripe Connect OAuth.",
        ctaLabel: "Connect Stripe",
        helper: "We never see full card numbers—Stripe handles billing data.",
    },
    {
        id: 2,
        title: "Grant Sheets access",
        description:
            "Allow AutoSync to create and update Google Sheets files in your Drive. We will not access any existing files you own.",
        ctaLabel: "Connect Google Sheets",
    },
    {
        id: 3,
        title: "Create your workspace sheet",
        description:
            "We’ll create a Google Sheets spreadsheet named “Stripe Sync” in your Drive with protected *_raw tabs and a Working tab for analysis.",
        ctaLabel: "Create sheet",
    },
    {
        id: 4,
        title: "Choose Stripe data & start sync",
        description:
            "Pick which Stripe data objects to sync into your newly created Google Sheet. Then start your initial backfill and ongoing sync.",
        ctaLabel: "Start backfill & sync",
    },
];

function Spinner() {
    return (
        <svg
            className="mr-2 h-4 w-4 animate-spin text-indigo-50"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
        </svg>
    );
}

export function OnboardingWizard() {
    const searchParams = useSearchParams();
    const { user, refresh } = useUserState();
    const router = useRouter();
    // Derive initial step from ?step= query, default to 1
    const initialIndex = React.useMemo(() => {
        const stepParam = searchParams.get("step");
        const stepNumber = stepParam ? parseInt(stepParam, 10) : 1;
        if (!Number.isFinite(stepNumber)) return 0;
        return Math.min(Math.max(stepNumber - 1, 0), steps.length - 1);
    }, [searchParams]);

    const [currentStepIndex, setCurrentStepIndex] = React.useState(initialIndex);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // init selection from server if present, else defaults
    const serverConfig = user.syncConfigs?.[0];
    const [enabledStripeObjects, setEnabledStripeObjects] = useState<StripeObject[]>(
        (serverConfig?.enabledStripeObjects.length > 0 ? serverConfig.enabledStripeObjects as StripeObject[] : [...DEFAULT_ENABLED_STRIPE_OBJECTS]),
    );

    // If the query param changes (e.g. another redirect), sync the step
    useEffect(() => {
        setCurrentStepIndex(initialIndex);
    }, [initialIndex]);

    // If onboarding is complete, push to dashboard (client-side)
    useEffect(() => {
        if (user.onboardingStage === "ready") {
            router.replace("/dashboard");
        }
    }, [user.onboardingStage, router]);

    const totalSteps = steps.length;
    const currentStep = steps[currentStepIndex];
    const progressPercent = ((currentStepIndex + 1) / totalSteps) * 100;
    const isFirstStep = currentStepIndex === 0;
    const isLastStep = currentStepIndex === totalSteps - 1;

    const primaryLoadingLabel =
        currentStep.id === 1
            ? "Redirecting to Stripe…"
            : currentStep.id === 2
                ? "Redirecting to Google…"
                : currentStep.id === 3
                    ? "Creating sheet…"
                    : "Saving config & starting sync…";


    async function createSheet() {
        const res = await fetch("/api/google/create-sheet", {
            method: "POST",
        });
        if (!res.ok) {
            return;
        }

        await refresh(); // now userState has SyncConfig + sheet info
        return res.json();
    }

    async function saveSyncConfigSelection() {
        setError(null);
        try {
            const res = await fetch("/api/update/sync-config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabledStripeObjects, syncStatus: "backfill_running" }),
            });
            if (!res.ok) {
                setError("Failed to save sync settings");
                return false;
            }
            await refresh();
            return true;
        } catch {
            setError("Failed to save sync settings");
            return false;
        }
    }

    async function handleStartTrial() {
        setError(null);
        try {
            const res = await fetch("/api/billing/start-trial", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    planId: "pro",
                    interval: "monthly",
                }),
            });

            if (!res.ok) {
                const message = await res.text();
                setError(message || "Failed to start trial");
                return;
            }

            const data = await res.json();
            if (!data.ok) {
                setError(data.error || "Failed to start trial");
                return;
            }
            // Optional: show trial end date from data.trialEndsAt
            console.log("start trial resp data", data);
        } catch (e) {
            setError("Failed to start trial");
            return false;
        }
        return true;
    }

    // Navigation helpers: compute next index, update state, then update URL
    function goToStepByIndex(nextIndex: number) {
        const clamped = Math.min(Math.max(nextIndex, 0), totalSteps - 1);
        const nextStep = steps[clamped];
        setCurrentStepIndex(clamped);
        router.replace(`?step=${nextStep.id}`, { scroll: false });
    }

    async function handlePrimaryAction() {
        setError(null);
        if (currentStep.id === 1) {
            setSubmitting(true);
            // Stripe connect → Stripe OAuth
            window.location.href = "/api/stripe/connect";
            return;
        }
        else if (currentStep.id === 2) {
            setSubmitting(true);
            // Sheets access → Google OAuth
            window.location.href = "/api/google/connect";
            return;
        }
        else if (currentStep.id === 3) {
            setSubmitting(true);
            // Create sheet
            const createSheetResponse = await createSheet();
            setSubmitting(false);
            if (!createSheetResponse) return;
        }
        else if (currentStep.id === 4) {
            try {
                setSubmitting(true);
                const trialOk = await handleStartTrial();
                // Save sync config selection
                const saveConfigOk = await saveSyncConfigSelection();
                if (!trialOk) {
                    throw new Error("Failed to start trial");
                }
                if (!saveConfigOk) {
                    throw new Error("Failed to save sync config");
                }
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to start trial or save sync config");
                setSubmitting(false);
                return;
            }
            finally {
                setSubmitting(false);
            }
        }

        if (!isLastStep) {
            goToStepByIndex(currentStepIndex + 1);
          } else {
            router.replace("/dashboard");
          }
    }

    function handleBack() {
        if (isFirstStep) return;
        goToStepByIndex(currentStepIndex - 1);
      }
    

    return (
        <main className="mx-auto flex max-w-6xl flex-1 flex-col px-6 pb-16 pt-8">
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
                                        Step {currentStepIndex + 1} of {totalSteps}
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
                                    {currentStep.id === 4 && (
                                        <StripeObjectsStep
                                            value={enabledStripeObjects}
                                            onChange={setEnabledStripeObjects}
                                            disabled={submitting}
                                        />
                                    )}
                                    <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                                        <div className="flex gap-2">
                                            {!isFirstStep && (
                                                <button
                                                    type="button"
                                                    onClick={handleBack}
                                                    disabled={submitting}
                                                    className="inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                                                >
                                                    Back
                                                </button>
                                            )}
                                            <button
                                                className="inline-flex cursor-pointer items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                                                type="button"
                                                onClick={handlePrimaryAction}
                                                disabled={submitting}
                                                aria-label={currentStep.ctaLabel}
                                            >
                                                {submitting ? (
                                                    <>
                                                        <Spinner />
                                                        {primaryLoadingLabel}
                                                    </>
                                                ) : (
                                                    currentStep.ctaLabel
                                                )}
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
                                        We never access existing files you own; new sheets are
                                        created in your Drive with you as the owner. AutoSync only has access to the files you create within our app.
                                    </div>
                                )}

                                {error && (
                                    <p className="text-sm text-red-600 mt-2">
                                        {error}
                                    </p>
                                )}

                            </article>
                        </div>
                    </section>
                </main>
            </div>
        </main>
    );
}
