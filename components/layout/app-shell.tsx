"use client";

import * as React from "react";
import { signOut, useSession } from "next-auth/react";
import { SiteHeader } from "./site-header";

export function AppShell({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const isAuthed = status === "authenticated";
    const userEmail = session?.user?.email;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
            <SiteHeader
                variant="app"
                isAuthed={isAuthed}
                userEmail={userEmail}
                onSignOut={() => {
                    signOut({ callbackUrl: "/login" });
                }}
            />

            <main>{children}</main>
        </div>
    );
}
