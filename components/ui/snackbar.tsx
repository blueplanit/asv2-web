// components/ui/snackbar.tsx
"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

type SnackbarVariant = "success" | "info" | "warning";

type SnackbarProps = {
    open: boolean;
    onClose?: () => void;
    variant?: SnackbarVariant;
    title: string;
    description?: string;
    animated?: boolean;
    autoHideMs?: number;
};

//@ts-ignore
const variantStyles: Record<SnackbarVariant, { icon: JSX.Element; bar: string }> = {
    success: {
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
        bar: "bg-emerald-500",
    },
    info: {
        icon: <Info className="h-4 w-4 text-sky-600" />,
        bar: "bg-sky-500",
    },
    warning: {
        icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
        bar: "bg-amber-500",
    },
};

export function Snackbar({
    open,
    onClose,
    variant = "success",
    title,
    description,
    animated = true,
    autoHideMs = 7000,
}: SnackbarProps) {
    // Internal state to drive animation (so initial mount with open=true still animates)
    const [internalOpen, setInternalOpen] = useState(false);

    useEffect(() => {
        if (open) {
            setInternalOpen(true);
        } else {
            setInternalOpen(false);
        }
    }, [open]);

    useEffect(() => {
        if (!open || !autoHideMs) return;
        const id = window.setTimeout(() => {
            onClose?.();
        }, autoHideMs);
        return () => window.clearTimeout(id);
    }, [open, autoHideMs, onClose]);

    const { icon, bar } = variantStyles[variant];

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:bottom-6">
            <div
                className={clsx(
                    "pointer-events-auto flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg shadow-slate-200 backdrop-blur ring-1 ring-black/5",
                    animated && "transition-opacity duration-150 ease-out",
                    internalOpen
                        ? "opacity-100 snackbar-bounce-open"
                        : "opacity-0 pointer-events-none translate-y-10",
                )}
                role="status"
                aria-live="polite"
            >
                <div className={clsx("mt-1 h-7 w-0.5 rounded-full snackbar-bar-pulse", bar)} />
                <div className="mt-0.5 rounded-full bg-slate-100 p-1.5">{icon}</div>
                <div className="flex-1 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900">{title}</p>
                    {description && (
                        <p className="mt-1 text-[11px] text-slate-500">
                            {description}
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="cursor-pointer mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Dismiss notification"
                >
                    <X className="h-3 w-3" />
                </button>
            </div>
        </div>
    );
}
