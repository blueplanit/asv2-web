"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_AUTOMATIC_ATTEMPTS = 4;

export function ActivationPendingRetry() {
    const router = useRouter();
    const [attempts, setAttempts] = useState(0);

    useEffect(() => {
        if (attempts >= MAX_AUTOMATIC_ATTEMPTS) return;

        const delayMs = 2000 * 2 ** attempts;
        const timeoutId = window.setTimeout(() => {
            setAttempts((current) => current + 1);
            router.refresh();
        }, delayMs);
        return () => window.clearTimeout(timeoutId);
    }, [attempts, router]);

    return (
        <div className="space-y-3">
            <p className="text-xs text-slate-500" aria-live="polite">
                {attempts < MAX_AUTOMATIC_ATTEMPTS
                    ? "We'll check again automatically."
                    : "This is taking longer than usual. You can safely check again."}
            </p>
            <button
                type="button"
                onClick={() => router.refresh()}
                className="inline-flex cursor-pointer items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
                Check again
            </button>
        </div>
    );
}
