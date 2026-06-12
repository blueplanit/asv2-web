// app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { SiteFooter } from "@/components/layout/site-footer";
import { APP_NAME, APP_URL } from "@/lib/constants";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export const metadata: Metadata = {
    metadataBase: new URL(APP_URL),
    title: `${APP_NAME} | Stripe billing data in Google Sheets`,
    description:
        "Keep Stripe billing data synced into Google Sheets for reporting, reconciliation, and analysis without repeated CSV exports.",
    openGraph: {
        title: `${APP_NAME} | Stripe billing data in Google Sheets`,
        description:
            "Keep Stripe billing data synced into Google Sheets for reporting, reconciliation, and analysis without repeated CSV exports.",
        url: APP_URL,
        siteName: APP_NAME,
        type: "website",
        images: [
            {
                url: "/android-chrome-512x512.png",
                width: 512,
                height: 512,
                alt: "SyncStaq syncs Stripe billing data into Google Sheets.",
            },
        ],
    },
    twitter: {
        card: "summary",
        title: `${APP_NAME} | Stripe billing data in Google Sheets`,
        description:
            "Keep Stripe billing data synced into Google Sheets for reporting, reconciliation, and analysis without repeated CSV exports.",
        images: ["/android-chrome-512x512.png"],
    },
    icons: {
        icon: [
            { url: "/favicon.ico" },
            { url: "/icon.png", type: "image/png", sizes: "512x512" },
        ],
        apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="h-full">
            <head>
                {GA_MEASUREMENT_ID ? (
                    <>
                        <Script
                            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
                            strategy="afterInteractive"
                        />
                        <Script id="ga-config" strategy="afterInteractive">
                            {`
                                window.dataLayer = window.dataLayer || [];
                                function gtag(){dataLayer.push(arguments);}
                                window.gtag = gtag;
                                gtag('js', new Date());
                                gtag('config', '${GA_MEASUREMENT_ID}');
                            `}
                        </Script>
                    </>
                ) : null}
            </head>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-slate-50 text-slate-900`}
            >
                <AppProviders>
                    <div className="min-h-screen flex flex-col">
                        <div className="flex-1">{children}</div>
                        <SiteFooter />
                    </div>
                </AppProviders>
            </body>
        </html>
    );
}
