// components/onboarding/onboarding-wizard.tsx
"use client";

import { APP_NAME } from "@/lib/constants";
import * as React from "react";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUserState } from "../user-state-provider";
import { useEffect } from "react";
import { DataSyncEntryId } from "@/lib/schemas/sync-config";
import { StripeObjectsStep } from "./stripe-objects-config";
import { Spinner } from "@/components/ui/spinner";
import { Snackbar } from "@/components/ui/snackbar";
import { StripeDataSyncEntry } from "@blueplanit/asv2-shared";
import {
    trackAmplitudeError,
    trackAmplitudeEvent,
} from "@/lib/analytics/amplitude-client";

type StepStatus = "complete" | "current" | "upcoming";
type InitSheetTabStates = Array<{
    sheetId: number;
    dataSyncEntryId: DataSyncEntryId;
    rowCount?: number;
    lastSyncedAt?: string | null;
}>;

export const WORKSPACE_SHEET_TITLE = `My ${APP_NAME} Workspace`;
export const FOLDER_NAME = APP_NAME;
export const WORKING_SHEET_TITLE = "Working Sheet";
export const WORKING_SHEET_MESSAGE = "Use this sheet for your own analysis. You can edit anything here. Do NOT edit the protected tabs. Instead, reference the protected *_raw (DO NOT EDIT) tabs with formulas.";
export const OBJECTS: { id: DataSyncEntryId; label: string; note: string }[] = [
    { id: "invoices", label: "Invoices", note: "Status, amounts, and payments" },
    { id: "charges", label: "Charges", note: "Transactions (amounts, refunds, statement descriptors, etc.)" },
    { id: "customers", label: "Customers", note: "Identifiers and emails" },
    { id: "payouts", label: "Payouts", note: "Amount, arrival date, etc." },
    { id: "subscriptions", label: "Subscriptions", note: "Plan details, status, cancellations, etc." },
    // { id: "payment_intents", label: "Payment Intents", note: "Authorizations and captures" },
    { id: "disputes", label: "Disputes", note: "Disputed transactions" },
    { id: "invoice_line_items", label: "Invoice Line Items", note: "Line items for each invoice" },
];
export const AVAILABLE_DATA_SYNC_ENTRY_IDS: DataSyncEntryId[] = OBJECTS.map((obj) => obj.id);

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
        helper: "This is a read-only connection to your Stripe account. No two way sync is performed.",
    },
    {
        id: 2,
        title: "Grant Sheets access",
        description: `Allow ${APP_NAME} to create and update Google Sheets files in your Drive.`,
        ctaLabel: "Connect Google Sheets",
    },
    {
        id: 3,
        title: "Create your workspace sheet",
        description: `We’ll create a new Google Sheets file named “${WORKSPACE_SHEET_TITLE}” in the “${FOLDER_NAME}” folder in your Drive to hold your Stripe data.`,
        ctaLabel: "Create sheet",
    },
    {
        id: 4,
        title: "Choose Stripe data & start your 14-day trial",
        description: "Pick which Stripe data objects to sync into your newly created Google Sheet. Then, start your initial backfill and ongoing sync.",
        ctaLabel: "Start backfill & sync",
    },
];


export function OnboardingWizard() {
    const searchParams = useSearchParams();
    const { user, refresh } = useUserState();
    const router = useRouter();
    const browserTimezone = React.useMemo(() => {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {
            return undefined;
        }
    }, []);
    const browserLocale = React.useMemo(() => {
        if (typeof navigator === "undefined") return undefined;
        return navigator.language || undefined;
    }, []);

    // Find the config that is actually in onboarding (multi-config safe).
    const onboardingConfig = React.useMemo(
        () => user.syncConfigs.find((cfg) => cfg.syncStatus === "onboarding") ?? null,
        [user.syncConfigs],
    );

    // "Any active config" = user has at least one workspace that is not onboarding/retired.
    const hasAnyActiveConfig = React.useMemo(
        () =>
            user.syncConfigs.some(
                (cfg) =>
                    cfg.syncStatus !== "onboarding" &&
                    cfg.syncStatus !== "retired",
            ),
        [user.syncConfigs],
    );

    // Derive initial step from ?step= query, default to 1
    const initialIndex = React.useMemo(() => {
        const stepParam = searchParams.get("step");
        const stepNumber = stepParam ? parseInt(stepParam, 10) : 1;
        if (!Number.isFinite(stepNumber)) return 0;
        return Math.min(Math.max(stepNumber - 1, 0), steps.length - 1);
    }, [searchParams]);

    const [currentStepIndex, setCurrentStepIndex] = React.useState(initialIndex);
    const viewedOnboardingStepsRef = React.useRef<Set<number>>(new Set());
    const onboardingCompletedRef = React.useRef(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);                     // NEW
    const [snackbarDescription, setSnackbarDescription] = useState<string>()

    // If there is no onboarding config but there *is* an active config,
    // the user is past onboarding → send them to dashboard.
    useEffect(() => {
        if (!onboardingConfig && hasAnyActiveConfig && currentStepIndex < steps.length - 1) {
            router.replace("/dashboard");
        }
    }, [onboardingConfig, hasAnyActiveConfig, router, currentStepIndex]);

    useEffect(() => {
        const mismatch = searchParams.get("googleMismatch");
        const stripeError = searchParams.get("stripeError");
        const stripeReason = searchParams.get("reason");
        const stripeDesc = searchParams.get("desc");
        const googleError = searchParams.get("googleError");
        const stepParam = searchParams.get("step");
        const stripeAttemptPending =
            typeof window !== "undefined" &&
            window.localStorage.getItem("syncstaq_oauth_pending_stripe") === "1";
        const googleAttemptPending =
            typeof window !== "undefined" &&
            window.localStorage.getItem("syncstaq_oauth_pending_google") === "1";

        if (stripeAttemptPending) {
            if (stripeError) {
                trackAmplitudeError("Stripe Connect Failed", stripeDesc ?? stripeError, {
                    error_code: stripeError,
                    reason: stripeReason ?? null,
                });
                window.localStorage.removeItem("syncstaq_oauth_pending_stripe");
            } else if (stepParam === "2") {
                trackAmplitudeEvent("Stripe Connect Succeeded");
                window.localStorage.removeItem("syncstaq_oauth_pending_stripe");
            }
        }

        if (googleAttemptPending) {
            if (googleError) {
                trackAmplitudeError("Google Connect Failed", googleError, {
                    error_code: googleError,
                });
                window.localStorage.removeItem("syncstaq_oauth_pending_google");
            } else if (stepParam === "3") {
                trackAmplitudeEvent("Google Connect Succeeded");
                window.localStorage.removeItem("syncstaq_oauth_pending_google");
            }
        }

        if (mismatch === "1") {
            const expectedEmail = searchParams.get("expectedEmail");
            const actualEmail = searchParams.get("actualEmail");

            const description =
                expectedEmail && actualEmail
                    ? `You're signed in as ${expectedEmail} but tried to connect ${actualEmail}. Please choose the same Google account you signed up with on the next screen.`
                    : "Please choose the same Google account you signed up with on the Google consent screen.";

            setSnackbarDescription(description);
            setSnackbarOpen(true);

            // Strip the mismatch params so refreshes don't retrigger the snackbar
            router.replace("/onboarding?step=2", { scroll: false });
        }
    }, [searchParams, router]);

    // Spreadsheet ID associated with the onboarding config (if any)
    const serverSpreadsheetId = onboardingConfig?.spreadsheetId ?? null;
    const [createdSpreadsheetId, setCreatedSpreadsheetId] = useState<string | null>(serverSpreadsheetId);

    // If user refreshes on step 4 and onboardingConfig now has a spreadsheetId,
    // hydrate local state from server.
    useEffect(() => {
        if (onboardingConfig?.spreadsheetId && !createdSpreadsheetId) {
            setCreatedSpreadsheetId(onboardingConfig.spreadsheetId);
        }
    }, [onboardingConfig, createdSpreadsheetId]);

    // init Stripe selection from onboarding config if present, else defaults
    const initialStripeDataSyncEntries: DataSyncEntryId[] = React.useMemo(() => {
        if (
            onboardingConfig?.stripeDataSyncMap &&
            (onboardingConfig.stripeDataSyncMap as any[]).length > 0
        ) {
            return (onboardingConfig.stripeDataSyncMap as any[])
                .filter(
                    (entry) =>
                        entry.kind === "object_table" &&
                        entry.enabled &&
                        typeof entry.id === "string",
                )
                .map((entry) => entry.id) as DataSyncEntryId[];
        }
        return AVAILABLE_DATA_SYNC_ENTRY_IDS;
    }, [onboardingConfig]);

    const [selectedDataSyncEntries, setSelectedDataSyncEntries] = useState<DataSyncEntryId[]>(initialStripeDataSyncEntries);

    // If the query param changes (e.g. another redirect), sync the step
    useEffect(() => {
        setCurrentStepIndex(initialIndex);
    }, [initialIndex]);

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
                    : "Starting trial & backfill...";

    useEffect(() => {
        if (viewedOnboardingStepsRef.current.has(currentStep.id)) {
            return;
        }
        viewedOnboardingStepsRef.current.add(currentStep.id);
        trackAmplitudeEvent("Onboarding Step Viewed", {
            step_id: currentStep.id,
            step_name: currentStep.title,
        });
    }, [currentStep.id, currentStep.title]);

    async function createSheet() {
        try {
            const res = await fetch("/api/google/create-sheet", {
                method: "POST",
                body: JSON.stringify({
                    userState: user,
                    timezone: browserTimezone,
                    locale: browserLocale,
                    folderName: FOLDER_NAME,
                    workspaceSheetTitle: WORKSPACE_SHEET_TITLE,
                    workingSheetTitle: WORKING_SHEET_TITLE,
                    workingSheetMessage: WORKING_SHEET_MESSAGE,
                }),
            });
            if (!res.ok) {
                const text = await res.text().catch(() => "");
                setError(text || "Failed to create sheet");
                trackAmplitudeError("Create Sheet Failed", text || "Failed to create sheet");
                return;
            }

            await refresh(); // now userState has SyncConfig + sheet info
            const data = await res.json();
            trackAmplitudeEvent("Onboarding Step Completed", {
                step_id: 3,
                step_name: "create_workspace_sheet",
                spreadsheet_id: data?.spreadsheetId ?? null,
            });
            return data;
        } catch (e) {
            setError(`Failed to create sheet: ${e instanceof Error ? e.message : JSON.stringify(e)}`)
            trackAmplitudeError("Create Sheet Failed", e);
            return false;
        }
    }

    async function saveSyncConfigSelection(spreadsheetId?: string | null) {
        setError(null);
        try {
            const res = await fetch("/api/update/sync-config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    selectedDataSyncEntries,
                    syncStatus: "backfill_running",
                    workingSheetTitle: WORKING_SHEET_TITLE,
                    workingSheetMessage: WORKING_SHEET_MESSAGE,
                    spreadsheetId,
                    userState: user,
                }),
            });
            if (!res.ok) {
                const text = await res.text().catch(() => "");
                setError(text || "Failed to save sync settings");
                return false;
            }
            const data = await res.json();

            if (data?.syncConfig?.spreadsheetId) {
                await initSheetTabState(data.syncConfig.spreadsheetId, data.syncConfig.stripeDataSyncMap);
            }

            await refresh();
            // initSheetTabState(spreadsheetId, selectedDataSyncEntries);
            return true;
        } catch (e) {
            setError(`Failed to save sync settings: ${e instanceof Error ? e.message : JSON.stringify(e)}`)
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
                trackAmplitudeError("Start Trial Failed", message || "Failed to start trial");
                return;
            }

            const data = await res.json();
            if (!data.ok) {
                setError(data.error || "Failed to start trial");
                trackAmplitudeError("Start Trial Failed", data.error || "Failed to start trial");
                return;
            }
            trackAmplitudeEvent("Start Trial Succeeded", {
                status: data.status ?? null,
                trial_ends_at: data.trialEndsAt ?? null,
            });
            // Optional: show trial end date from data.trialEndsAt
            // console.log("start trial resp data", data);
        } catch (e) {
            setError("Failed to start trial");
            trackAmplitudeError("Start Trial Failed", e instanceof Error ? e.message : "Failed to start trial");
            return false;
        }
        return true;
    }

    async function startInitialBackfill(spreadsheetId: string | null) {
        if (!spreadsheetId) {
            setError("Missing spreadsheet ID when starting backfill");
            return false;
        }

        try {
            const res = await fetch("/api/sync/init-backfill", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ spreadsheetId }),
            });

            if (!res.ok) {
                const text = await res.text().catch(() => "");
                setError(text || "Failed to start backfill");
                return false;
            }

            return true;
        } catch (e) {
            setError(
                `Failed to start backfill: ${e instanceof Error ? e.message : JSON.stringify(e)
                }`,
            );
            return false;
        }
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
            if (typeof window !== "undefined") {
                window.localStorage.setItem("syncstaq_oauth_pending_stripe", "1");
            }
            trackAmplitudeEvent("Onboarding Step Started", {
                step_id: 1,
                step_name: "connect_stripe",
            });
            setSubmitting(true);
            // Stripe connect → Stripe OAuth
            window.location.href = "/api/stripe/connect";
            return;
        }
        else if (currentStep.id === 2) {
            if (typeof window !== "undefined") {
                window.localStorage.setItem("syncstaq_oauth_pending_google", "1");
            }
            trackAmplitudeEvent("Onboarding Step Started", {
                step_id: 2,
                step_name: "connect_google_sheets",
            });
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
            if (!createSheetResponse || !createSheetResponse.spreadsheetId) return;
            setCreatedSpreadsheetId(createSheetResponse.spreadsheetId);
        }
        else if (currentStep.id === 4) {
            try {
                setSubmitting(true);
                // Start trial
                const trialOk = await handleStartTrial();

                // Save sync config selection
                const saveConfigOk = await saveSyncConfigSelection(createdSpreadsheetId);

                if (!trialOk || !saveConfigOk) {
                    setSubmitting(false);
                    return;
                }

                // 3) Trigger initial backfill Lambda
                const backfillOk = await startInitialBackfill(createdSpreadsheetId);

                if (!backfillOk) {
                    setSubmitting(false);
                    return;
                }

                trackAmplitudeEvent("Onboarding Step Completed", {
                    step_id: 4,
                    step_name: "configure_sync_and_start_backfill",
                    spreadsheet_id: createdSpreadsheetId,
                    selected_sync_objects: selectedDataSyncEntries,
                    selected_sync_objects_count: selectedDataSyncEntries.length,
                });
                trackAmplitudeEvent("Onboarding Completed", {
                    spreadsheet_id: createdSpreadsheetId,
                    selected_sync_objects: selectedDataSyncEntries,
                    selected_sync_objects_count: selectedDataSyncEntries.length,
                });
                onboardingCompletedRef.current = true;
                if (typeof window !== "undefined") {
                    window.localStorage.setItem(
                        "syncstaq_onboarding_completed_at",
                        new Date().toISOString(),
                    );
                }
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to start trial or save sync config");
                setSubmitting(false);
                return;
            }
            finally {
                setSubmitting(false);
            }
            router.replace("/dashboard?backfill_started=1");
            return;
        }

        if (!isLastStep) {
            goToStepByIndex(currentStepIndex + 1);
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
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                                        Step {currentStep.id}
                                                    </p>
                                                </div>
                                                <h3 className="text-lg font-semibold text-slate-900">{currentStep.title}</h3>
                                                <p className="text-sm text-slate-600">{currentStep.description}</p>
                                                {currentStep.helper && (
                                                    <p className="text-sm font-medium text-slate-700">
                                                        {currentStep.helper}
                                                    </p>
                                                )}
                                            </div>

                                        </div>
                                    </div>
                                    {currentStep.id === 4 && (
                                        <StripeObjectsStep
                                            value={selectedDataSyncEntries}
                                            onChange={setSelectedDataSyncEntries}
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
                                                className="inline-flex cursor-pointer items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 truncate"
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

                                        {currentStep.id === 4 && (
                                            <p className="text-[11px] text-slate-500 text-right sm:text-left max-w-xs">
                                                <span className="inline-flex items-center gap-2  text-[11px] font-medium text-emerald-700 ">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Your 14-day free trial starts after this. No card required!
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {currentStep.id === 2 && (
                                    <div className="space-y-3">
                                        {user.profile?.email && (
                                            <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                <span className="truncate">
                                                    You&apos;re signed in as{" "}
                                                    <span className="font-semibold">
                                                        {user.profile.email}
                                                    </span>
                                                    . Please choose the same account on the next screen.
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900">
                                            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 ring-1 ring-inset ring-indigo-100">
                                                Permissions
                                            </span>
                                            We will not access, edit, or delete any existing files you own. We only have access to the files created within our app.
                                        </div>
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
                <Snackbar
                    open={snackbarOpen}
                    onClose={() => setSnackbarOpen(false)}
                    variant="warning"
                    title="Please connect the same Google account"
                    description={snackbarDescription}
                    animated
                    autoHideMs={10000}
                />
            </div>
        </main>
    );
}


export async function initSheetTabState(spreadsheetId: string, stripeDataSyncEntries: StripeDataSyncEntry[]) {
    try {
        const initSheetTabStates: InitSheetTabStates = stripeDataSyncEntries
            .filter((entry) => entry.enabled)
            .map((entry) => ({
                sheetId: entry.sheetId!,
                dataSyncEntryId: entry.id as DataSyncEntryId,
            }));

        const res = await fetch("/api/update/sheet-tab-state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                spreadsheetId,
                initSheetTabStates,
            })
        })

        if (!res.ok) {
            const message = await res.text();
            throw new Error(message || "Failed to init sheet tab state");
        }

        const data = await res.json();
        console.log("init sheet tab state data", data);
    }
    catch (e) {
        console.warn("Failed to init sheet tab state", e);
    }
}