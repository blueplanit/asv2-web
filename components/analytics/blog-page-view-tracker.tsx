"use client";

import { useEffect } from "react";
import { trackAmplitudeEvent } from "@/lib/analytics/amplitude-client";

export function BlogPageViewTracker() {
    useEffect(() => {
        trackAmplitudeEvent("Blog Page Viewed");
    }, []);

    return null;
}
