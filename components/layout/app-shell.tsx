"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { LogOut, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/pricing", label: "Pricing" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const isAuthed = status === "authenticated";

    const [menuOpen, setMenuOpen] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
            <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
                <div className="mx-auto flex w-full items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                        <Link href="/">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                                AS
                            </span>
                        </Link>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900">
                                AutoSync Control Tower
                            </span>
                            <span className="text-xs text-slate-500">Stripe → Google Sheets</span>
                        </div>
                    </div>

                    <nav className="flex items-center gap-0 text-sm">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={clsx(
                                    "rounded-full px-3 py-1 font-medium transition text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}

                        {isAuthed && (
                            <div className="relative" ref={menuRef}>
                                <button
                                    type="button"
                                    onClick={() => setMenuOpen((v) => !v)}
                                    className="cursor-pointer inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                >
                                    <User className="h-4 w-4" />
                                    <span className="max-w-[120px] truncate">
                                        {session.user?.email ?? "Account"}
                                    </span>
                                </button>

                                {menuOpen && (
                                    <div className="absolute right-0 mt-2 w-40 rounded-xl border border-slate-200 bg-white py-1 text-xs text-slate-700 shadow-lg flex flex-col items-start gap-1">
                                        <button
                                            type="button"
                                            onClick={() => signOut({ callbackUrl: "/login" })}
                                            className="block w-full cursor-pointer px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            Log out
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </nav>
                </div>
            </header>

            <main>{children}</main>
        </div>
    );
}
