"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <SessionProvider>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </SessionProvider>
    );
}
