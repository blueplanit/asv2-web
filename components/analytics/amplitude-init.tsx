"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    identifyAmplitudeUser,
    initAmplitude,
    resetAmplitudeUser,
} from "@/lib/analytics/amplitude-client";

export function AmplitudeInit() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { data: session, status } = useSession();
    const lastTrackedPathRef = useRef<string | null>(null);

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

            identifyAmplitudeUser({
                userId,
                email: session?.user?.email,
            });
            return;
        }

        if (status === "unauthenticated") {
            resetAmplitudeUser();
        }
    }, [session?.user, status]);

    useEffect(() => {
        const queryString = searchParams?.toString();
        const pathWithQuery = queryString ? `${pathname}?${queryString}` : pathname;

        if (!pathWithQuery || lastTrackedPathRef.current === pathWithQuery) {
            return;
        }

        lastTrackedPathRef.current = pathWithQuery;
    }, [pathname, searchParams]);

    return null;
}
