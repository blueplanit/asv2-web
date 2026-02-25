"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AmplitudeInit } from "@/components/analytics/amplitude-init";

const queryClient = new QueryClient();

export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <SessionProvider>
            <QueryClientProvider client={queryClient}>
                <AmplitudeInit />
                {children}
            </QueryClientProvider>
        </SessionProvider>
    );
}
