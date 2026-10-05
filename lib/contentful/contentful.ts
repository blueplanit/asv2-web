// lib/contentful/contentful.ts
import { createClient } from "contentful";

const space = process.env.CONTENTFUL_SPACE_ID!;
const accessToken = process.env.CONTENTFUL_CDA_TOKEN!;
const environment = process.env.CONTENTFUL_ENVIRONMENT || "master";

export const contentfulClient = createClient({
    space,
    accessToken,
    environment,
});

// Production hides entries whose showInProduction flag is false.
// Every cached read takes this as an argument, so it forms part of the cache key.
// A development entry can then never satisfy a production request.
export const isProd = () => process.env.NODE_ENV === "production";

export type BlogLanguage = "en" | "es";

// Reads one entry by id, or null when the Delivery API does not serve it.
// Never cached: the webhook uses it to see the live state, which a cached answer would hide.
// The Delivery API serves published entries only, so null also means removed.
export async function getEntryById(id: string) {
    const res = await contentfulClient.getEntries({
        "sys.id[in]": [id],
        limit: 1,
        include: 0,
    });

    return res.items[0] ?? null;
}

export type BlogPostFields = {
    id: string;
    showInProduction?: boolean;
    language?: BlogLanguage;
    translationOf?: { sys?: { id?: string } };
    title: string;
    seoTitle?: string;
    slug: string;
    excerpt?: string;
    body: any;
    publishDate: string;
    authorName?: string;
    coverImage?: any;
    tags?: string[];
    updatedAt?: string;
};

// A Blog Post without its body. The listing reads this, so the index and the sitemap
// never pull the rich text of every post just to show a title and a date.
export type BlogPostSummary = Omit<BlogPostFields, "body">;

export type PageFields = {
    title: string;
    slug: string;
    body: any;
    layoutVariant?: "default" | "centered" | "two-column";
    theme?: "light" | "dark" | "brand";
};

// A Promotion carries no slug or pageKey — see ADR-0005. `id` is the entry's sys.id,
// used to key a visitor's banner dismissal so a later, different Promotion shows again.
export type PromotionFields = {
    id: string;
    showInProduction?: boolean;
    stripePromotionCodeId: string;
    bannerHeadline: string;
    ctaLabel: string;
    ctaHref: string;
};
