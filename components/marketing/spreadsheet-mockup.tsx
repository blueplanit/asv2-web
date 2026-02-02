// components/marketing/spreadsheet-mockup.tsx
import React from "react";

export function SpreadsheetMockup() {
    const COLS = 8; // A-H
    const ROWS = 8; // 1-10

    const letters = Array.from({ length: COLS }, (_, i) =>
        String.fromCharCode("A".charCodeAt(0) + i),
    );

    return (
        <div className="w-full shadow-lg rounded-3xl">
            <div className="mx-auto max-w-xl">
                {/* Window/frame */}
                <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
                    {/* Title bar */}
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                        <div className="flex items-center gap-3">
                            {/* mac dots */}
                            <div className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                            </div>

                            <span className="text-xs font-medium text-slate-900">
                                Stripe Sync Demo
                            </span>
                        </div>

                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 ring-1 ring-emerald-100">
                            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                            Healthy
                        </span>
                    </div>

                    {/* Sheet area */}
                    <div className="bg-slate-50">
                        <div className="px-0 pb-0 pt-0">
                            {/* Spreadsheet "canvas" */}
                            <div className="overflow-hidden bg-white">
                                {/* Column letters header row */}
                                <div
                                    className="grid bg-slate-50"
                                    style={{
                                        gridTemplateColumns: `40px repeat(${COLS}, minmax(0, 1fr))`,
                                    }}
                                >
                                    {/* top-left corner */}
                                    <div className="h-8 border-r border-slate-200" />

                                    {letters.map((ch) => (
                                        <div
                                            key={ch}
                                            className="flex h-8 items-center justify-center border-r border-slate-200 text-[11px] font-medium text-slate-500"
                                        >
                                            {ch}
                                        </div>
                                    ))}
                                </div>

                                {/* Body rows */}
                                <div className="bg-white border-t border-slate-200">
                                    {Array.from({ length: ROWS }).map((_, r) => (
                                        <div
                                            key={`r-${r}`}
                                            className="grid"
                                            style={{
                                                gridTemplateColumns: `40px repeat(${COLS}, minmax(0, 1fr))`,
                                            }}
                                        >
                                            {/* Row numbers */}
                                            <div className="flex h-7 items-center justify-center border-r border-b border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-500">
                                                {r + 1}
                                            </div>

                                            {/* Cells */}
                                            {Array.from({ length: COLS }).map((_, c) => (
                                                <div
                                                    key={`cell-${r}-${c}`}
                                                    className="relative h-7 border-b border-r border-slate-200"
                                                >
                                                    {/* faint placeholder content in some cells */}
                                                    <div className="absolute left-2 top-1/2 h-2 w-10 -translate-y-1/2 rounded bg-slate-200/40" />
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Bottom sheet tabs */}
                        <div className="bg-white px-4 py-3">
                            <div className="flex items-center gap-2">
                                <span className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-600 ring-1 ring-slate-200">
                                    <svg
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10 4.75a.75.75 0 01.75.75v3.75h3.75a.75.75 0 010 1.5h-3.75v3.75a.75.75 0 01-1.5 0v-3.75H5.5a.75.75 0 010-1.5h3.75V5.5a.75.75 0 01.75-.75z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </span>

                                {/* Active tab */}
                                <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-900 ring-1 ring-slate-200">
                                    Invoices
                                </span>

                                {/* Inactive tab */}
                                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-transparent">
                                    Subscriptions
                                </span>

                                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-transparent">
                                    Customers
                                </span>

                                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-transparent">
                                    Transactions
                                </span>
                                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-transparent">
                                    ...
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Optional: soft “glow” shadow for the mockup */}
                <div className="pointer-events-none mx-auto -mt-6 max-w-xl rounded-[28px] bg-slate-200/40 blur-3xl" />
            </div>
        </div>
    );
}
