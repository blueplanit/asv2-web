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

export function PromotionBanner({ promotion }: PromotionBannerProps) {
    const pathname = usePathname() ?? "";
    const { status: sessionStatus } = useSession();

    // Defaults to not-dismissed. A visitor who already dismissed this Promotion
    // is handled before paint by the script above, so this default only matters
    // for the render(s) before the effect below confirms it either way.
    const [dismissed, setDismissed] = useState(false);
    const [checkedDismissal, setCheckedDismissal] = useState(false);
    // An existing paying subscriber isn't this Promotion's audience (ADR-0005
    // decision 5 is about new checkouts, not existing ones), but nothing about that
    // is knowable server-side — the marketing pages stay session-agnostic on purpose
    // (ADR-0003). Defaults to not-hidden; `subscriberCheckPending` below keeps the
    // banner from rendering at all until this resolves one way or the other, so a
    // subscriber never sees it flash on before disappearing.
    const [hideForSubscriber, setHideForSubscriber] = useState(false);
    const [checkedSubscriberStatus, setCheckedSubscriberStatus] = useState(false);
    const [impressionTracked, setImpressionTracked] = useState(false);

    useEffect(() => {
        const storedId = window.localStorage.getItem(DISMISSED_STORAGE_KEY);
        setDismissed(storedId === promotion.id);
        setCheckedDismissal(true);
    }, [promotion.id]);

    useEffect(() => {
        if (sessionStatus === "loading") return;
        if (sessionStatus !== "authenticated") {
            setCheckedSubscriberStatus(true);
            return;
        }

        let cancelled = false;
        fetch("/api/billing/subscription-status")
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (cancelled) return;
                setHideForSubscriber(Boolean(data?.activePaidSubscriber));
            })
            .catch(() => { })
            .finally(() => {
                if (cancelled) return;
                setCheckedSubscriberStatus(true);
            });

        return () => {
            cancelled = true;
        };
    }, [sessionStatus]);

    const suppressed = isSuppressedPath(pathname);
    // True until we know whether to hide for a subscriber: either the session
    // itself hasn't resolved, or it resolved authenticated and the follow-up
    // subscription-status fetch hasn't landed yet. Gating on this means the
    // banner waits to render rather than rendering and then retracting.
    const subscriberCheckPending =
        sessionStatus === "loading" ||
        (sessionStatus === "authenticated" && !checkedSubscriberStatus);
    const visible = !dismissed && !suppressed && !hideForSubscriber && !subscriberCheckPending;

    useEffect(() => {
        // Waits for both checks. Without this, a visitor the banner is about to hide
        // — already dismissed, or an existing subscriber — still logs a "Viewed" event
        // in the instant before it does, since all these effects fire off the same
        // first render, where the hiding state still holds its visible-by-default value.
        if (!checkedDismissal || !checkedSubscriberStatus || !visible || impressionTracked) return;
        setImpressionTracked(true);
        trackAmplitudeEvent("Promotion Banner Viewed", { promotion_id: promotion.id });
    }, [checkedDismissal, checkedSubscriberStatus, visible, impressionTracked, promotion.id]);

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
