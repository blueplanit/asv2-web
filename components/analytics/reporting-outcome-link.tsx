"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackAmplitudeEvent } from "@/lib/analytics/amplitude-client";
import { REPORTING_OUTCOME_VERSION } from "@/lib/marketing/reporting-outcomes";

type Props = {
    originPath: string;
    destinationPath: string;
    placement: string;
    outcome: string;
    className?: string;
    children: ReactNode;
};

export function ReportingOutcomeLink({ originPath, destinationPath, placement, outcome, className, children }: Props) {
    return (
        <Link
            href={destinationPath}
            className={className}
            onClick={() => trackAmplitudeEvent("Reporting Outcome Clicked", {
                origin_path: originPath,
                destination_path: destinationPath,
                placement,
                outcome,
                experiment_version: REPORTING_OUTCOME_VERSION,
            })}
        >
            {children}
        </Link>
    );
}
