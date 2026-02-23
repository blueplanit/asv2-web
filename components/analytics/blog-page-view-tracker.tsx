"use client";

import { useEffect } from "react";
import { trackAmplitudeEvent } from "@/lib/analytics/amplitude-client";

export function BlogPageViewTracker() {
    useEffect(() => {
        trackAmplitudeEvent("SyncStaq: Blog Page Viewed");
    }, []);

    return null;
}
