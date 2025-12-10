// components/dashboard/rotate-sheet-modal.tsx
"use client";

import { FOLDER_NAME } from "../onboarding/onboarding-wizard";

type RotateSheetModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => Promise<void>;
    workspaceName: string;
    submitting: boolean;
    error: string | null;
};

export function RotateSheetModal({
    open,
    onOpenChange,
    onConfirm,
    workspaceName,
    submitting,
    error,
}: RotateSheetModalProps) {
    if (!open) return null;

    function handleClose() {
        if (submitting) return;
        onOpenChange(false);
    }

    async function handleConfirm() {
        await onConfirm();
    }

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
            <div
                className="absolute inset-0"
                aria-hidden="true"
                onClick={handleClose}
            />
            <div className="relative z-50 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
                <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Rotate spreadsheet
                    </p>
                    <h2 className="text-lg font-semibold text-slate-900">
                        Create a fresh sheet for{" "}
                        <span className="text-indigo-700">{workspaceName}</span>
                    </h2>
                    <p className="text-sm text-slate-700">
                        Workspace sheet nearing capacity. Creating new Google Sheet in Drive for ongoing Stripe data sync.
                    </p>
                    <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
                        <li>
                            A new spreadsheet will be created in your{" "}
                            <span className="font-medium">{FOLDER_NAME}</span> folder.
                        </li>
                        <li>
                            Your existing spreadsheet stays in Drive but
                            stops receiving new data.
                        </li>
                        <li>
                            All future Stripe data syncs will target the new
                            spreadsheet.
                        </li>
                    </ul>
                    {error && (
                        <p className="text-xs font-medium text-red-600">
                            {error}
                        </p>
                    )}
                </div>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={submitting}
                        className="inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-70"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={submitting}
                        className="inline-flex cursor-pointer items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-70"
                    >
                        {submitting ? "Creating new sheet…" : "Create new spreadsheet"}
                    </button>
                </div>
            </div>
        </div>
    );
}
