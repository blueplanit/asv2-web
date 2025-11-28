// components/site-header.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { User, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

type NavItem = { href: string; label: string };

type SiteHeaderProps = {
    variant: "public" | "app";

    // App (private) nav
    appNavItems?: NavItem[];

    // Auth state (used mostly for app variant, but you can reuse on public)
    isAuthed?: boolean;
    userEmail?: string | null;

    // Called when user clicks "Log out"
    onSignOut?: () => void;
};

const baseNavItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/pricing", label: "Pricing" },
    { href: "/blog", label: "Blog" },
];

export function SiteHeader(props: SiteHeaderProps) {
    const { variant, appNavItems = [], isAuthed, userEmail, onSignOut } = props;
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);
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
                    if (isPublic) {
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
                        onClick={() => {
                            setMenuOpen(false);
                            onSignOut?.();
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

    return (
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="mx-auto flex w-full items-center justify-between px-6 py-3">
                {/* Brand */}
                <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                            AS
                        </span>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold tracking-tight text-slate-900">
                                {isPublic ? "AutoSync" : "AutoSync Control Tower"}
                            </span>
                            <span className="text-xs text-slate-500">
                                Stripe → Google Sheets
                            </span>
                        </div>
                    </Link>
                </div>

                {/* Nav */}

                <nav className="flex items-center gap-0 text-sm">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                "rounded-full px-3 py-1 font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900",
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}

                    {
                        !isAuthed ? (
                            <Link
                                href="/login"
                                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                Log in
                            </Link>
                        ) : userMenu
                    }
                </nav>
            </div>
        </header>
    );
}


// {isPublic ? (
//     <nav className="flex items-center gap-4 text-sm">
//         <a
//             href="/pricing"
//             className="text-slate-600 transition hover:text-slate-900"
//         >
//             Pricing
//         </a>
//         <a
//             href="/blog"
//             className="text-slate-600 transition hover:text-slate-900"
//         >
//             Blog
//         </a>
//         {isAuthed ? (
//             <Link
//                 href="/dashboard"
//                 className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
//             >
//                 Go to app
//             </Link>
//         ) : (
//             <Link
//                 href="/login"
//                 className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
//             >
//                 Log in
//             </Link>
//         )}
//     </nav>
// ) : (
//     <nav className="flex items-center gap-0 text-sm">
//         {appNavItems.map((item) => (
//             <Link
//                 key={item.href}
//                 href={item.href}
//                 className={clsx(
//                     "rounded-full px-3 py-1 font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900",
//                 )}
//             >
//                 {item.label}
//             </Link>
//         ))}
