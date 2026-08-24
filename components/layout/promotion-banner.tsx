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

const BANNER_ELEMENT_ID = "promotion-banner";

// Hides the banner during parse, before it can paint. The page is static, so only the
// browser knows about a dismissal, and useEffect runs a frame too late to avoid a flash.
function dismissedBeforePaintScript(promotionId: string) {
    return `try{if(localStorage.getItem(${JSON.stringify(DISMISSED_STORAGE_KEY)})===${JSON.stringify(promotionId)}){var s=document.createElement("style");s.textContent="#${BANNER_ELEMENT_ID}{display:none}";document.head.appendChild(s);}}catch(e){}`;
}

export function PromotionBanner({ promotion }: PromotionBannerProps) {
    const pathname = usePathname() ?? "";

    // Visible by default so the server-rendered page carries the banner with no
    // flash for the common case (a visitor who hasn't dismissed anything yet).
    // A visitor who dismissed it is handled before paint by the script above.
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
        <>
            <script
                // Server-rendered, so it executes during parse. React does not re-run it
                // on hydration, which is what makes it a one-shot pre-paint guard.
                dangerouslySetInnerHTML={{ __html: dismissedBeforePaintScript(promotion.id) }}
            />
            {/* z-50 clears the site header, which is relative z-40 and sits later in the
                DOM, so an equal z-index would let it paint over this while scrolling. */}
            {/* Symmetric px-12 keeps the copy centred on the viewport while reserving a
                gutter the absolutely positioned dismiss button sits in, so long copy
                cannot run underneath it on a narrow screen. */}
            <div
                id={BANNER_ELEMENT_ID}
                className="sticky top-0 z-50 flex items-center justify-center bg-indigo-600 px-12 py-2.5 text-sm font-medium text-white"
            >
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>
        </>
    );
}
