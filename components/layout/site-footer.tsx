// components/layout/site-footer.tsx
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { Brand } from "@/components/brand/brand";
const productLinks = [
    // { label: "Overview", href: "#" },
    { label: "Pricing", href: "/pricing" },
    // { label: "Changelog", href: "#" },
    // { label: "Status", href: "#" },
];

const solutionsLinks = [
    { label: "SaaS & Subscriptions", href: "#" },
    { label: "Finance & RevOps", href: "#" },
    { label: "Ops & Analytics", href: "#" },
];

const resourcesLinks = [
    // { label: "Docs", href: "#" },
    // { label: "API Reference", href: "#" },
    // { label: "Guides", href: "#" },
    { label: "Blog", href: "/blog" },
];

const companyLinks = [
    { label: "About", href: "/pages/about" },
    // { label: "Customers", href: "#" },
    // { label: "Careers", href: "#" },
    { label: "Contact", href: "/pages/contact" },
];

const legalLinks = [
    { label: "Privacy", href: "/pages/privacy-policy" },
    { label: "Terms", href: "/pages/terms" },
    // { label: "Data Processing", href: "#" },
    // { label: "Security", href: "#" },
];

const socialLinks = [
    { label: "YouTube", href: "#" },
];

export function SiteFooter() {
    const year = new Date().getFullYear();

    return (
        <footer className="border-t border-slate-200 bg-white/80">
            <div className="mx-auto max-w-6xl px-6 py-8">
                <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                    {/* Brand + brief copy */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Brand size={32} />
                        </div>

                        <p className="max-w-sm text-xs leading-relaxed text-slate-500">
                            {APP_NAME} keeps your Stripe business data mirrored into a single, structured
                            Google Sheet so you can focus on insights, not exports.
                        </p>
                        <p className="text-[11px] text-slate-400">
                            Stripe and Google Sheets are trademarks of their respective owners.
                        </p>
                    </div>

                    {/* Link columns */}
                    <div className="grid gap-6 text-xs text-slate-600 sm:grid-cols-3 lg:grid-cols-4">
                        <div className="space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Product
                            </p>
                            <ul className="space-y-1.5">
                                {productLinks.map((item) => (
                                    <li key={item.label}>
                                        <Link
                                            href={item.href}
                                            className="cursor-pointer hover:text-slate-900 transition-colors"
                                        >
                                            {item.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Resources
                            </p>
                            <ul className="space-y-1.5">
                                {resourcesLinks.map((item) => (
                                    <li key={item.label}>
                                        <Link
                                            href={item.href}
                                            className="cursor-pointer hover:text-slate-900 transition-colors"
                                        >
                                            {item.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Company
                            </p>
                            <ul className="space-y-1.5">
                                {companyLinks.map((item) => (
                                    <li key={item.label}>
                                        <Link
                                            href={item.href}
                                            className="cursor-pointer hover:text-slate-900 transition-colors"
                                        >
                                            {item.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Legal & Social
                            </p>
                            <ul className="space-y-1.5">
                                {legalLinks.map((item) => (
                                    <li key={item.label}>
                                        <Link
                                            href={item.href}
                                            className="cursor-pointer hover:text-slate-900 transition-colors"
                                        >
                                            {item.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                            <ul className="mt-2 flex flex-wrap gap-2 text-[11px]">
                                {socialLinks.map((item) => (
                                    <li key={item.label}>
                                        <Link
                                            href={item.href}
                                            className="cursor-pointer rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                                        >
                                            {item.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-6 flex flex-col gap-2 border-t border-slate-200 pt-4 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>© {year} {APP_NAME}, a Blue Planit LLC product. All rights reserved.</span>
                    <div className="flex flex-wrap gap-3">
                        {/* <span>Data residency: TBD</span>
                        <span>EU & GDPR-ready: TBD</span> */}
                    </div>
                </div>
            </div>
        </footer>
    );
}
