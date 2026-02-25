// components/marketing/how-it-works-section.tsx
import React from "react";
import type { MarketingCopy } from "@/lib/marketing/marketing-copy";
import {
    LinkIcon,
    ArrowPathIcon,
    TableCellsIcon,
    ArrowRightIcon,
} from "@heroicons/react/20/solid";

type HowItWorksCopy = MarketingCopy["howItWorks"];

type Props = {
    copy: HowItWorksCopy;
};

const stepIcons = [LinkIcon, ArrowPathIcon, TableCellsIcon] as const;

export function HowItWorksSection({ copy }: Props) {
    return (
        <section id="how-it-works" className="mt-0 space-y-6">
            <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl text-center">
                    {copy.heading}
                </h2>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 text-center">
                    {copy.eyebrow}
                </p>
            </div>

            {/* Tiles with arrow connectors between them (desktop only) */}
            <div className="relative">
                {/* Soft glow behind the tiles (not outlining the container) */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -z-10 mx-2 sm:mx-6 max-w-5xl sm:left-1/2 sm:-translate-x-1/2 rounded-[3rem] bg-gradient-to-r from-indigo-100 via-sky-100 to-emerald-100 opacity-70 blur-3xl"
                />

                <ol className="relative grid gap-4 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch sm:gap-6">
                    {copy.steps.map((step, idx) => {
                        const Icon = stepIcons[idx] ?? TableCellsIcon;
                        const isLast = idx === copy.steps.length - 1;

                        return (
                            <React.Fragment key={step.id}>
                                {/* tile */}
                                <li className="rounded-2xl border border-slate-200 bg-white/95 shadow-[0_20px_80px_rgba(15,23,42,0.07)] p-5 text-sm text-slate-700 backdrop-blur">
                                    <div className="flex items-start gap-3">
                                        <span className="mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-50 ring-1 ring-slate-200">
                                            <Icon className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                                        </span>

                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-900">
                                                {step.title}
                                            </h3>
                                            <p className="mt-1 text-sm leading-relaxed text-slate-600">
                                                {step.description}
                                            </p>
                                        </div>
                                    </div>
                                </li>

                                {/* arrow connector */}
                                {!isLast && (
                                    <li
                                        role="presentation"
                                        aria-hidden="true"
                                        className="hidden sm:flex items-center justify-center"
                                    >
                                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-slate-300 ring-1 ring-slate-200 shadow-sm">
                                            <ArrowRightIcon className="h-4 w-4" />
                                        </span>
                                    </li>
                                )}
                            </React.Fragment>
                        );
                    })}
                </ol>
            </div>
        </section>
    );
}
