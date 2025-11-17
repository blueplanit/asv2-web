"use client";

type StepStatus = "complete" | "current" | "upcoming";

export type Step = {
    id: number;
    title: string;
    description: string;
    ctaLabel: string;
    status: StepStatus;
    helper?: string;
};

const initialSteps: Step[] = [
    {
        id: 1,
        title: "Sign in with Google",
        description:
            "Create your app account with Google so we can personalize your workspace and keep you signed in securely.",
        ctaLabel: "Continue with Google",
        status: "current",
        helper: "Profile and email only—no Drive access yet.",
    },
    {
        id: 2,
        title: "Connect Stripe",
        description: "Connect the Stripe account you want mirrored into Sheets via Stripe Connect OAuth.",
        ctaLabel: "Connect Stripe",
        status: "upcoming",
        helper: "We never see your full card numbers—Stripe handles billing data.",
    },
    {
        id: 3,
        title: "Grant Sheets access",
        description:
            "Allow AutoSync to create and update one Google Sheet in your Drive using drive.file + spreadsheets scopes.",
        ctaLabel: "Connect Google Sheets",
        status: "upcoming",
    },
    {
        id: 4,
        title: "Create your workspace sheet",
        description:
            "We’ll create a spreadsheet named “Stripe Sync – {Business}” with protected *_raw tabs and a Working tab for analysis.",
        ctaLabel: "Create sheet",
        status: "upcoming",
    },
    {
        id: 5,
        title: "Choose objects & start sync",
        description:
            "Pick which Stripe objects to mirror and how far back to pull, then start your initial backfill and ongoing sync.",
        ctaLabel: "Start backfill & sync",
        status: "upcoming",
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

export function OnboardingWizard() {
    const [steps, setSteps] = React.useState<Step[]>(initialSteps);

    const completedCount = steps.filter((s) => s.status === "complete").length;
    const progressPercent = (completedCount / steps.length) * 100;

    function handleStepAction(step: Step) {
        // TODO:
        // - Step 1: call /api/auth/signin (NextAuth Google) or just redirect to /api/auth/signin
        // - Step 2: POST to /api/stripe/connect to get Connect URL, then window.location = url
        // - Step 3: hit /api/google/connect
        // - Step 4: POST /api/workspaces to create sheet
        // - Step 5: POST /api/workspaces/{id}/sync to start backfill
        console.log("Clicked step", step.id);

        // For now, advance step locally so UX feels real in dev
        setSteps((prev) => {
            return prev.map((s) => {
                if (s.id < step.id) return { ...s, status: "complete" };
                if (s.id === step.id) return { ...s, status: "complete" };
                if (s.id === step.id + 1 && s.status === "upcoming") return { ...s, status: "current" };
                return s;
            });
        });
    }

    return (
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
            <header className="flex flex-col gap-4 lg:sticky lg:top-8 lg:max-w-sm">
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100">
                    <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
                    Guided onboarding
                </div>
                <div className="space-y-3">
                    <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Stripe → Google Sheets</p>
                    <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                        Set up your workspace in minutes—then let continuous sync do the rest.
                    </h1>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                        <span>Progress</span>
                        <span>{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-100">
                        <div
                            className="h-2 rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${progressPercent}%` }}
                            role="progressbar"
                            aria-valuenow={progressPercent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                        />
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                        Need to pause? We’ll save your place and resume at the first incomplete step next time you sign in.
                    </p>
                </div>
            </header>

            <main className="flex-1 space-y-8">
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Onboarding wizard</p>
                            <h2 className="text-xl font-semibold text-slate-900">5 guided steps</h2>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100">
                            P95: &lt; 5 minutes
                        </span>
                    </div>
                    <div className="mt-6 space-y-4">
                        {steps.map((step) => (
                            <article
                                key={step.id}
                                className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition hover:border-slate-200 hover:bg-white"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div
                                            className={`flex size-10 items-center justify-center rounded-full border text-sm font-semibold shadow-sm ${step.status === "complete"
                                                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                                                    : step.status === "current"
                                                        ? "border-indigo-100 bg-indigo-50 text-indigo-700"
                                                        : "border-slate-200 bg-white text-slate-500"
                                                }`}
                                            aria-label={`Step ${step.id} ${step.status}`}
                                        >
                                            {step.status === "complete" ? "✓" : step.id}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Step {step.id}</p>
                                            <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
                                            <p className="text-sm text-slate-600">{step.description}</p>
                                            {step.helper && <p className="text-sm font-medium text-slate-700">{step.helper}</p>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                                        <button
                                            className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${step.status === "complete"
                                                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100"
                                                    : step.status === "current"
                                                        ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500"
                                                        : "bg-slate-900 text-white shadow-sm hover:bg-slate-800"
                                                }`}
                                            type="button"
                                            onClick={() => handleStepAction(step)}
                                            aria-label={step.ctaLabel}
                                        >
                                            {step.status === "complete" ? "Completed" : step.ctaLabel}
                                        </button>
                                        <span
                                            className={`text-xs font-semibold uppercase tracking-[0.2em] ${step.status === "complete"
                                                    ? "text-emerald-600"
                                                    : step.status === "current"
                                                        ? "text-indigo-600"
                                                        : "text-slate-400"
                                                }`}
                                        >
                                            {step.status === "complete"
                                                ? "Complete"
                                                : step.status === "current"
                                                    ? "In progress"
                                                    : "Queued"}
                                        </span>
                                    </div>
                                </div>

                                {/* Step-specific panels */}
                                {step.id === 3 && (
                                    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900">
                                        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 ring-1 ring-inset ring-indigo-100">
                                            Permissions
                                        </span>
                                        drive.file + spreadsheets scopes only. We never access existing files you own; new sheets are created in
                                        your Drive with you as the owner.
                                    </div>
                                )}

                                {step.id === 5 && (
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
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}

import * as React from "react";
