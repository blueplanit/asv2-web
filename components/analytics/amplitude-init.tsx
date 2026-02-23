"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
    identifyAmplitudeUser,
    initAmplitude,
    resetAmplitudeUser,
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
            return;
        }

        if (status === "unauthenticated") {
            resetAmplitudeUser();
            lastIdentifiedRef.current = null;
        }
    }, [session?.user, status]);

    return null;
}
