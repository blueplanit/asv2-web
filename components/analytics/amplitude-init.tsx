"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    identifyAmplitudeUser,
    initAmplitude,
    resetAmplitudeUser,
    stampAcquisitionChannel,
    trackAmplitudeEvent,
    type AcquisitionChannel,
} from "@/lib/analytics/amplitude-client";
import { EVENT_NAMES } from "@/lib/analytics/event-names";

const LOGGED_IN_SESSION_KEY = "syncstaq:logged-in-tracked";

// The landing route is the channel signal — no query param has to survive the
// Google OAuth round-trip.
function channelForPathname(pathname: string | null): AcquisitionChannel {
    if (pathname?.startsWith("/stripe-app/")) return "stripe_app";
    if (pathname?.startsWith("/google-add-on/")) return "google_add_on";
    return "web";
}

export function AmplitudeInit() {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const lastIdentifiedRef = useRef<string | null>(null);
    // Captured on mount so later client-side navigation cannot overwrite the
    // route the user actually arrived on.
    const entryChannelRef = useRef<AcquisitionChannel>(channelForPathname(pathname));

    useEffect(() => {
        initAmplitude();
        stampAcquisitionChannel(entryChannelRef.current);
    }, []);

    useEffect(() => {
        if (status === "authenticated") {
            const userId =
                (session?.user as any)?.userId ??
                (session?.user as any)?.id;
            if (!userId) {
                return;
            }
            if (!session?.user?.email) {
                return;
            }

            const identityKey = `${userId}:${session.user.email}`;
            if (lastIdentifiedRef.current === identityKey) {
                return;
            }
            lastIdentifiedRef.current = identityKey;

            identifyAmplitudeUser({
                userId,
                email: session.user.email,
            });

            // Once per browser session — this component remounts on every full
            // page load, and "Logged In" should not count those.
            try {
                if (!sessionStorage.getItem(LOGGED_IN_SESSION_KEY)) {
                    sessionStorage.setItem(LOGGED_IN_SESSION_KEY, "1");
                    trackAmplitudeEvent(EVENT_NAMES.LOGGED_IN);
                }
            } catch {
                // Private browsing can block sessionStorage; skip the event
                // rather than break identification.
            }
            return;
        }

        if (status === "unauthenticated") {
            resetAmplitudeUser();
            lastIdentifiedRef.current = null;
            try {
                sessionStorage.removeItem(LOGGED_IN_SESSION_KEY);
            } catch {
                // Ignore — see above.
            }
        }
    }, [session?.user, status]);

    return null;
}
