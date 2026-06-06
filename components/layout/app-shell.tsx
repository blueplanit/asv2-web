"use client";

import * as React from "react";
import { SiteHeader } from "./site-header";

export function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
            <SiteHeader variant="app" />
            <main>{children}</main>
        </div>
    );
}
