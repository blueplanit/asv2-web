"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
    identifyAmplitudeUser,
    initAmplitude,
    resetAmplitudeUser,
    trackAmplitudeEvent,
} from "@/lib/analytics/amplitude-client";

export function AmplitudeInit() {
    const { data: session, status } = useSession();
    const lastIdentifiedRef = useRef<string | null>(null);

    useEffect(() => {
        initAmplitude();
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
                email: session?.user?.email,
            });

            // Lightweight heuristic for "signup completed" without backend changes:
            // fire once per user per browser.
            if (typeof window !== "undefined") {
                const key = `syncstaq_signup_completed_tracked:${userId}`;
                const tracked = window.localStorage.getItem(key);
                if (!tracked) {
                    trackAmplitudeEvent("Signup Completed", {
                        heuristic: "first_auth_on_device",
                    });
                    window.localStorage.setItem(key, "1");
                }
            }
            return;
        }

        if (status === "unauthenticated") {
            resetAmplitudeUser();
            lastIdentifiedRef.current = null;
        }
    }, [session?.user, status]);

    return null;
}
