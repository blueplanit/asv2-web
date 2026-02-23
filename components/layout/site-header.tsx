// components/site-header.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { User, LogOut, Menu, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Brand } from "@/components/brand/brand";
import { trackAmplitudeEvent } from "@/lib/analytics/amplitude-client";

type NavItem = { href: string; label: string };

type SiteHeaderProps = {
    variant: "public" | "app";

    // App (private) nav
    appNavItems?: NavItem[];

    // Auth state (used mostly for app variant, but you can reuse on public)
    isAuthed?: boolean;
    userEmail?: string | null;
};

const baseNavItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/pricing", label: "Pricing" },
    { href: "/blog", label: "Blog" },
];

export function SiteHeader(props: SiteHeaderProps) {
    const { variant, appNavItems = [], isAuthed, userEmail } = props;
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    // close user menu on outside click / escape
    useEffect(() => {
        if (!menuOpen) return;

        function handleClick(e: MouseEvent) {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }

        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape") setMenuOpen(false);
        }

        window.addEventListener("mousedown", handleClick);
        window.addEventListener("keydown", handleKey);
        return () => {
            window.removeEventListener("mousedown", handleClick);
            window.removeEventListener("keydown", handleKey);
        };
    }, [menuOpen]);

    // close mobile menu on escape + lock body scroll while open
    useEffect(() => {
        if (!mobileNavOpen) return;
        const previousOverflow = document.body.style.overflow;

        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape") setMobileNavOpen(false);
        }

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleKey);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKey);
        };
    }, [mobileNavOpen]);

    const isPublic = variant === "public";
    const navItems = baseNavItems.concat(appNavItems);

    const userMenu = (
        <div className="relative ml-2" ref={menuRef}>

            <button
                type="button"
                onClick={() => {
                    if (!isAuthed && isPublic) {
                        router.push("/login");
                        return;
                    }
                    setMenuOpen((v) => !v);
                }}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
                <User className="h-4 w-4" />
                <span className="max-w-[140px] truncate">
                    {userEmail ?? "Account"}
                </span>
            </button>

            {menuOpen ? (
                <div className="absolute right-0 mt-2 flex w-40 flex-col items-start gap-1 rounded-xl border border-slate-200 bg-white py-1 text-xs text-slate-700 shadow-lg">
                    <button
                        type="button"
                        onClick={async () => {
                            setMenuOpen(false);
                            if (isAuthed) {
                                try {
                                    trackAmplitudeEvent("User Logged Out", {
                                        source: "site_header_desktop_menu",
                                        variant,
                                    });
                                    await signOut({ callbackUrl: "/login", redirect: true });
                                } catch (error) {
                                    console.error("Error signing out", error);
                                }
                            }
                        }}
                        className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50"
                    >
                        <LogOut className="h-4 w-4" />
                        Log out
                    </button>
                </div>
            ) : null}
        </div>
    )

    function trackTopNavClick(href: string, location: "desktop" | "mobile") {
        if (href !== "/blog") return;
        trackAmplitudeEvent("Blog Navigation Clicked", {
            source: "site_header",
            location,
            variant,
        });
    }

    return (
        <header className="relative z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="mx-auto w-full px-4 sm:px-6">
                <div className="flex h-16 items-center justify-between">
                    {/* Brand */}
                    <div className="flex items-center gap-3">
                        <Brand size={32} />
                    </div>

                    {/* Desktop nav */}
                    <nav className="hidden items-center gap-0 text-sm md:flex">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => trackTopNavClick(item.href, "desktop")}
                                className={clsx(
                                    "rounded-full px-3 py-1 font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900",
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}

                        {!isAuthed ? (
                            <Link
                                href="/login"
                                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                Log in
                            </Link>
                        ) : userMenu}
                    </nav>

                    {/* Mobile menu toggle */}
                    <button
                        type="button"
                        onClick={() => setMobileNavOpen((v) => !v)}
                        aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
                        aria-expanded={mobileNavOpen}
                        aria-controls="mobile-site-nav"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 md:hidden"
                    >
                        {mobileNavOpen ? (
                            <X className="h-5 w-5" aria-hidden="true" />
                        ) : (
                            <Menu className="h-5 w-5" aria-hidden="true" />
                        )}
                    </button>
                </div>
            </div>

            {mobileNavOpen ? (
                <>
                    <div
                        className="fixed inset-0 z-30 bg-slate-900/20 md:hidden"
                        aria-hidden="true"
                        onClick={() => setMobileNavOpen(false)}
                    />
                    <div
                        id="mobile-site-nav"
                        className="absolute inset-x-0 top-full z-40 border-b border-slate-200 bg-white shadow-lg md:hidden"
                    >
                        <nav className="mx-auto flex w-full flex-col gap-1 px-4 py-4 sm:px-6">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => {
                                        trackTopNavClick(item.href, "mobile");
                                        setMobileNavOpen(false);
                                    }}
                                    className="rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </nav>

                        <div className="mx-4 mb-4 border-t border-slate-200 pt-4 sm:mx-6">
                            {!isAuthed ? (
                                <Link
                                    href="/login"
                                    onClick={() => setMobileNavOpen(false)}
                                    className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                    Log in
                                </Link>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 px-1 text-sm text-slate-600">
                                        <User className="h-4 w-4" />
                                        <span className="truncate">{userEmail ?? "Account"}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            setMobileNavOpen(false);
                                            try {
                                                trackAmplitudeEvent("User Logged Out", {
                                                    source: "site_header_mobile_menu",
                                                    variant,
                                                });
                                                await signOut({ callbackUrl: "/login", redirect: true });
                                            } catch (error) {
                                                console.error("Error signing out", error);
                                            }
                                        }}
                                        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Log out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : null}
        </header>
    );
}