// components/layout/site-footer.tsx
import Link from "next/link";
import { APP_NAME, STRIPE_MARKETPLACE_URL } from "@/lib/constants";
import { Brand } from "@/components/brand/brand";

type FooterLinkItem = {
    label: string;
    href: string;
    // An external href leaves the site, so it renders an <a>, not a next/link <Link>.
    external?: boolean;
};

const productLinks: FooterLinkItem[] = [
    // { label: "Overview", href: "#" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Pricing", href: "/pricing" },
    { label: "Stripe App", href: STRIPE_MARKETPLACE_URL, external: true },
    // { label: "Changelog", href: "#" },
    // { label: "Status", href: "#" },
];

const resourcesLinks: FooterLinkItem[] = [
    // { label: "Docs", href: "#" },
    // { label: "API Reference", href: "#" },
    // { label: "Guides", href: "#" },
    { label: "Stripe to Sheets", href: "/stripe-google-sheets-integration" },
    { label: "CSV Export Alternative", href: "/stripe-csv-export-alternative" },
    { label: "Blog", href: "/blog" },
    { label: "Sample Sheet", href: "/sample-sheet" },
    { label: "How it works", href: "/how-it-works" },
    { label: "Commission revenue share", href: "/use-cases/stripe-commission-revenue-share" },
];

const companyLinks: FooterLinkItem[] = [
    { label: "About", href: "/pages/about" },
    // { label: "Customers", href: "#" },
    // { label: "Careers", href: "#" },
    { label: "Contact", href: "/pages/contact" },
];

const legalLinks: FooterLinkItem[] = [
    { label: "Privacy", href: "/pages/privacy-policy" },
    { label: "Terms", href: "/pages/terms" },
    // { label: "Data Processing", href: "#" },
    // { label: "Security", href: "#" },
];

const socialLinks = [
    { label: "YouTube", href: "#" },
];

const footerLinkClass =
    "-mx-2 block rounded-md px-2 py-1 cursor-pointer transition-colors hover:bg-slate-50 hover:text-slate-900 sm:mx-0 sm:inline sm:rounded-none sm:px-0 sm:py-0 sm:hover:bg-transparent";

function FooterLink({ item }: { item: FooterLinkItem }) {
    if (item.external) {
        return (
            <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={footerLinkClass}
            >
                {item.label}
            </a>
        );
    }

    return (
        <Link href={item.href} className={footerLinkClass}>
            {item.label}
        </Link>
    );
}

export function SiteFooter() {
    const year = new Date().getFullYear();

    return (
        <footer className="border-t border-slate-200 bg-white/80">
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-8">
                <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                    {/* Brand + brief copy */}
                    <div className="space-y-3 text-center sm:text-left">
                        <div className="flex items-center justify-center gap-3 sm:justify-start">
                            <Brand size={32} />
                        </div>

                        <p className="mx-auto max-w-sm text-xs leading-relaxed text-slate-500 sm:mx-0">
                            {APP_NAME} keeps your Stripe business data mirrored into a single, structured
                            Google Sheet so you can focus on insights, not exports.
                        </p>
                        <p className="text-[11px] text-slate-400">
                            Stripe and Google Sheets are trademarks of their respective owners.
                        </p>
                    </div>

                    {/* Link columns */}
                    <div className="grid grid-cols-2 gap-6 text-xs text-slate-600 sm:grid-cols-3 lg:grid-cols-4">
                        <div className="space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Product
                            </p>
                            <ul className="space-y-1.5">
                                {productLinks.map((item) => (
                                    <li key={item.label}>
                                        <FooterLink item={item} />
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
                                        <FooterLink item={item} />
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
                                        <FooterLink item={item} />
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
                                        <FooterLink item={item} />
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
                <div className="mt-6 flex flex-col gap-2 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-500 sm:text-left sm:flex-row sm:items-center sm:justify-between pb-4">
                    <span>© {year} {APP_NAME}, a Blue Planit LLC product. All rights reserved.</span>
                </div>
            </div>
        </footer>
    );
}
