"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export function GoogleAnalytics() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (!GA_MEASUREMENT_ID) {
            return;
        }

        const search = searchParams?.toString();
        const url = search ? `${pathname}?${search}` : pathname;

        if (typeof window === "undefined") {
            return;
        }

        const gtag = (window as any).gtag;
        if (typeof gtag !== "function") {
            return;
        }

        gtag("config", GA_MEASUREMENT_ID, {
            page_path: url,
        });
    }, [pathname, searchParams]);

    return null;
}

