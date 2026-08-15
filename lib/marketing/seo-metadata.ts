import type { Metadata } from "next";

const DEFAULT_SOCIAL_IMAGE = "/og/syncstaq-banner.png";

type MarketingMetadataOptions = {
    title: string;
    description: string;
    path: string;
    type?: "article" | "website";
    image?: string;
    imageAlt?: string;
    publishedTime?: string;
    modifiedTime?: string;
    authors?: string[];
    languages?: Record<string, string>;
    openGraphLocale?: string;
};

export function createMarketingMetadata({
    title,
    description,
    path,
    type = "website",
    image = DEFAULT_SOCIAL_IMAGE,
    imageAlt = "SyncStaq syncs Stripe billing data into Google Sheets.",
    publishedTime,
    modifiedTime,
    authors,
    languages,
    openGraphLocale,
}: MarketingMetadataOptions): Metadata {
    return {
        title,
        description,
        alternates: {
            canonical: path,
            ...(languages ? { languages } : {}),
        },
        openGraph: {
            title,
            description,
            url: path,
            type,
            ...(openGraphLocale ? { locale: openGraphLocale } : {}),
            ...(type === "article"
                ? {
                    publishedTime,
                    modifiedTime,
                    authors,
                }
                : {}),
            images: [{ url: image, alt: imageAlt }],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [image],
        },
    };
}
