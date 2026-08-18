// components/layout/promotion-banner.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import type { PromotionFields } from "@/lib/contentful/contentful";
import { trackAmplitudeEvent } from "@/lib/analytics/amplitude-client";

const DISMISSED_STORAGE_KEY = "promotion-banner-dismissed-id";

// Routes whose whole purpose is one focused action, not browsing — a Promotion
// competing for attention there is friction, not reinforcement.
function isSuppressedPath(pathname: string) {
    return pathname === "/login" || pathname.startsWith("/es");
}

type PromotionBannerProps = {
    promotion: PromotionFields;
};

export function PromotionBanner({ promotion }: PromotionBannerProps) {
    const pathname = usePathname() ?? "";

    // Visible by default so the server-rendered page carries the banner with no
    // flash for the common case (a visitor who hasn't dismissed anything yet).
    // Only flips to true, post-mount, for a visitor who dismissed this exact
    // Promotion before — localStorage isn't available during the server render.
    const [dismissed, setDismissed] = useState(false);
    const [checkedDismissal, setCheckedDismissal] = useState(false);
    const [impressionTracked, setImpressionTracked] = useState(false);

    useEffect(() => {
        const storedId = window.localStorage.getItem(DISMISSED_STORAGE_KEY);
        setDismissed(storedId === promotion.id);
        setCheckedDismissal(true);
    }, [promotion.id]);

    const suppressed = isSuppressedPath(pathname);
    const visible = !dismissed && !suppressed;

    useEffect(() => {
        // Wait for the dismissal check. Without this, a visitor who already dismissed
        // this exact Promotion still logs a "Viewed" event in the instant before the
        // banner hides itself — both effects fire on the same first render, where
        // `dismissed` still holds its pre-check default.
        if (!checkedDismissal || !visible || impressionTracked) return;
        setImpressionTracked(true);
        trackAmplitudeEvent("Promotion Banner Viewed", { promotion_id: promotion.id });
    }, [checkedDismissal, visible, impressionTracked, promotion.id]);

    if (!visible) return null;

    function handleDismiss() {
        window.localStorage.setItem(DISMISSED_STORAGE_KEY, promotion.id);
        setDismissed(true);
        trackAmplitudeEvent("Promotion Banner Dismissed", { promotion_id: promotion.id });
    }

    return (
        <div className="sticky top-0 z-40 flex items-center justify-center gap-3 bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white">
            <Link
                href={promotion.ctaHref}
                className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center hover:underline"
            >
                <span>{promotion.bannerHeadline}</span>
                <span className="font-semibold underline-offset-2">{promotion.ctaLabel}</span>
            </Link>
            <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss promotion"
                className="cursor-pointer rounded-full p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
                <X className="h-4 w-4" aria-hidden="true" />
            </button>
        </div>
    );
}
