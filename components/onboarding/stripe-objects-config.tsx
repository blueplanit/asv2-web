// components/onboarding/stripe-objects-config.tsx
"use client";

import {
    type DataSyncEntryId,
} from "@/lib/schemas/sync-config";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { OBJECTS } from "./onboarding-wizard";
import { AVAILABLE_DATA_SYNC_ENTRY_IDS } from "./onboarding-wizard";

export function StripeObjectsStep(props: {
    value: DataSyncEntryId[];
    onChange: (next: DataSyncEntryId[]) => void;
    disabled?: boolean;
}) {
    const { value, onChange, disabled } = props;

    // Ensure caller can initialize with [] and we still show defaults
    const selected = value.length ? value : AVAILABLE_DATA_SYNC_ENTRY_IDS;
    const allSelected = selected.length === OBJECTS.length;

    function toggleObject(id: DataSyncEntryId) {
        if (disabled) return;
        const isSelected = selected.includes(id);

        if (isSelected) {
            // prevent "none selected"
            const remaining = selected.filter((x) => x !== id);
            if (remaining.length === 0) return;
            onChange(remaining);
        } else {
            onChange([...selected, id]);
        }
    }

    function resetToRecommended() {
        if (disabled) return;
        onChange(AVAILABLE_DATA_SYNC_ENTRY_IDS);
    }

    const reccomendedBtnText = allSelected ? "Recommended options" : "Sync all data";

    return (
        <div className="space-y-4 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={resetToRecommended}
                    disabled={disabled || allSelected}
                    className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold ${allSelected
                        ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer "
                        }`}
                >
                    {reccomendedBtnText}
                </button>
            </div>

            <div className="flex flex-wrap gap-2">
                {OBJECTS.map((obj) => {
                    const enabled = selected.includes(obj.id);
                    return (
                        <Tooltip key={obj.id}>
                            <TooltipTrigger asChild>
                                <button
                                    key={obj.id}
                                    type="button"
                                    onClick={() => toggleObject(obj.id)}
                                    disabled={disabled}
                                    className={`cursor-pointer inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${enabled
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                        : "border-slate-200 bg-slate-50 text-slate-400"
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-1.5 w-1.5 rounded-full ${enabled ? "bg-emerald-500" : "bg-slate-300"
                                            }`}
                                        aria-hidden
                                    />
                                    <span>{obj.label}</span>
                                    {enabled && (
                                        <span
                                            aria-hidden
                                            className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-300 text-[10px] font-bold text-slate-700"
                                        >
                                            ×
                                        </span>
                                    )}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                <p className="text-xs">{obj.note}</p>
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>
        </div>
    );
}
