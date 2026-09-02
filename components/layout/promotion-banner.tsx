// components/layout/promotion-banner.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { X } from "lucide-react";
import type { PromotionFields } from "@/lib/contentful/contentful";
import { trackAmplitudeEvent } from "@/lib/analytics/amplitude-client";
import {
    BANNER_ELEMENT_ID,
    DISMISSED_STORAGE_KEY,
    SUBSCRIBER_STORAGE_KEY,
    SUPPRESS_STYLE_ID,
} from "@/lib/promotions/banner-suppression";

// Routes whose whole purpose is one focused action, not browsing — a Promotion
// competing for attention there is friction, not reinforcement.
function isSuppressedPath(pathname: string) {
    return pathname === "/login" || pathname.startsWith("/es");
}

// Blocked or zero-quota storage throws (Safari private browsing). The banner then
// behaves as if nothing was ever stored, rather than breaking the page.
function safeGetItem(key: string): string | null {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeSetItem(key: string, value: string) {
    try {
        window.localStorage.setItem(key, value);
    } catch { }
}

type PromotionBannerProps = {
    promotion: PromotionFields;
};

type CheckStatus = "pending" | "yes" | "no";

export function PromotionBanner({ promotion }: PromotionBannerProps) {
    const pathname = usePathname() ?? "";
    const { status: sessionStatus } = useSession();

    const [dismissed, setDismissed] = useState<CheckStatus>("pending");
    // Seeded below from the last known answer, so a returning subscriber is hidden
    // before paint by the suppression script rather than a network round trip later.
    const [hideForSubscriber, setHideForSubscriber] = useState<CheckStatus>("pending");
    // That seed is a cached guess. Analytics waits for the live answer instead.
    const [subscriberAnswerConfirmed, setSubscriberAnswerConfirmed] = useState(false);
    const [impressionTracked, setImpressionTracked] = useState(false);

    const checkedDismissal = dismissed !== "pending";

    useEffect(() => {
        setDismissed(safeGetItem(DISMISSED_STORAGE_KEY) === promotion.id ? "yes" : "no");
        setHideForSubscriber(safeGetItem(SUBSCRIBER_STORAGE_KEY) === "1" ? "yes" : "no");
    }, [promotion.id]);

    useEffect(() => {
        if (sessionStatus === "loading") return;
        if (sessionStatus !== "authenticated") {
            // Clears the cache too, so a subscriber who logs out stops being hidden.
            safeSetItem(SUBSCRIBER_STORAGE_KEY, "0");
            setHideForSubscriber("no");
            setSubscriberAnswerConfirmed(true);
            return;
        }

        let cancelled = false;
        fetch("/api/billing/subscription-status")
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (cancelled) return;
                const isSubscriber = Boolean(data?.activePaidSubscriber);
                safeSetItem(SUBSCRIBER_STORAGE_KEY, isSubscriber ? "1" : "0");
                setHideForSubscriber(isSubscriber ? "yes" : "no");
            })
            // A failed check keeps the cached guess, rather than flipping the banner
            // on a subscriber mid-visit.
            .catch(() => { })
            .finally(() => {
                if (cancelled) return;
                setSubscriberAnswerConfirmed(true);
            });

        return () => {
            cancelled = true;
        };
    }, [sessionStatus]);

    const suppressed = isSuppressedPath(pathname);
    const visible = dismissed !== "yes" && !suppressed && hideForSubscriber !== "yes";

    // Lifts the pre-paint guard when the cached answer turns out to be stale — a
    // subscriber who cancelled would otherwise stay hidden by that injected style.
    useEffect(() => {
        if (!visible) return;
        document.getElementById(SUPPRESS_STYLE_ID)?.remove();
    }, [visible]);

    useEffect(() => {
        // Waits for the live subscriber answer, not the seeded guess, so a visitor the
        // banner is about to hide for never logs a "Viewed" in the instant before it does.
        if (!checkedDismissal || !subscriberAnswerConfirmed || !visible || impressionTracked) return;
        setImpressionTracked(true);
        trackAmplitudeEvent("Promotion Banner Viewed", { promotion_id: promotion.id });
    }, [checkedDismissal, subscriberAnswerConfirmed, visible, impressionTracked, promotion.id]);

    if (!visible) return null;

    function handleDismiss() {
        // State first, so the button still works where the write below throws.
        setDismissed("yes");
        safeSetItem(DISMISSED_STORAGE_KEY, promotion.id);
        trackAmplitudeEvent("Promotion Banner Dismissed", { promotion_id: promotion.id });
    }

    // z-50 clears the site header, which is relative z-40 and sits later in the DOM,
    // so an equal z-index would let it paint over this while scrolling.
    // Symmetric px-12 reserves the gutter the absolutely positioned dismiss button
    // sits in, so long copy cannot run underneath it on a narrow screen.
    return (
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
    );
}
