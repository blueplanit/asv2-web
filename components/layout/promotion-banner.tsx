// components/layout/promotion-banner.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
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

// A pending check fails open for dismissal (matches the pre-paint script) but fails
// closed for the subscriber check — nothing about that is knowable server-side.
type CheckStatus = "pending" | "yes" | "no";

export function PromotionBanner({ promotion }: PromotionBannerProps) {
    const pathname = usePathname() ?? "";
    const { status: sessionStatus } = useSession();

    const [dismissed, setDismissed] = useState<CheckStatus>("pending");
    const [hideForSubscriber, setHideForSubscriber] = useState<CheckStatus>("pending");
    const [impressionTracked, setImpressionTracked] = useState(false);

    const checkedDismissal = dismissed !== "pending";
    const checkedSubscriberStatus = hideForSubscriber !== "pending";

    useEffect(() => {
        const storedId = window.localStorage.getItem(DISMISSED_STORAGE_KEY);
        setDismissed(storedId === promotion.id ? "yes" : "no");
    }, [promotion.id]);

    useEffect(() => {
        if (sessionStatus === "loading") return;
        if (sessionStatus !== "authenticated") {
            setHideForSubscriber("no");
            return;
        }

        let cancelled = false;
        fetch("/api/billing/subscription-status")
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (cancelled) return;
                setHideForSubscriber(data?.activePaidSubscriber ? "yes" : "no");
            })
            // A network error never reached .then above, so fail open to "not hidden".
            .catch(() => {
                if (cancelled) return;
                setHideForSubscriber((current) => (current === "pending" ? "no" : current));
            });

        return () => {
            cancelled = true;
        };
    }, [sessionStatus]);

    const suppressed = isSuppressedPath(pathname);
    // Holds the banner unrendered until we know whether to hide it for a subscriber.
    const subscriberCheckPending =
        sessionStatus === "loading" ||
        (sessionStatus === "authenticated" && !checkedSubscriberStatus);
    const visible = dismissed !== "yes" && !suppressed && hideForSubscriber !== "yes" && !subscriberCheckPending;

    useEffect(() => {
        // Waits for both checks, so a visitor the banner is about to hide for doesn't
        // log a "Viewed" event in the instant before it does.
        if (!checkedDismissal || !checkedSubscriberStatus || !visible || impressionTracked) return;
        setImpressionTracked(true);
        trackAmplitudeEvent("Promotion Banner Viewed", { promotion_id: promotion.id });
    }, [checkedDismissal, checkedSubscriberStatus, visible, impressionTracked, promotion.id]);

    if (!visible) return null;

    function handleDismiss() {
        window.localStorage.setItem(DISMISSED_STORAGE_KEY, promotion.id);
        setDismissed("yes");
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
            {/* Symmetric px-12 reserves the gutter the absolutely positioned dismiss button
                sits in, so long copy cannot run underneath it on a narrow screen. */}
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
