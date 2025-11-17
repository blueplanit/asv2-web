"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

const navItems = [
    { href: "/dashboard", label: "Workspaces" },
    { href: "/onboarding", label: "New workspace" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const isAuthed = status === "authenticated";

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
            <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                            AS
                        </span>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900">
                                AutoSync Control Tower
                            </span>
                            <span className="text-xs text-slate-500">Stripe → Google Sheets</span>
                        </div>
                    </div>

                    <nav className="flex items-center gap-4 text-sm">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={clsx(
                                    "rounded-full px-3 py-1 font-medium transition",
                                    pathname?.startsWith(item.href)
                                        ? "bg-slate-900 text-white"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}

                        {isAuthed && (
                            <div className="flex items-center gap-2">
                                <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                                    <User className="h-4 w-4" />
                                    <span className="max-w-[140px] truncate">
                                        {session.user?.email ?? "Account"}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => signOut({ callbackUrl: "/login" })}
                                    className="inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                                >
                                    Log out
                                </button>
                            </div>
                        )}
                    </nav>
                </div>
            </header>

            <main className="mx-auto flex max-w-6xl flex-1 flex-col px-6 pb-16 pt-8">
                {children}
            </main>
        </div>
    );
}
