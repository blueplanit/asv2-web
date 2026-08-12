// lib/contentful/contentful-queries.ts
import { unstable_cache } from "next/cache";
import {
    contentfulClient,
    isProd,
    type BlogPostFields,
    type BlogPostSummary,
    type PageFields,
} from "./contentful";
import {
    BACKSTOP_WINDOW_SECONDS,
    BLOG_INDEX_TAG,
    CONTENT_TYPES,
    PAGE_INDEX_TAG,
    contentTypeTag,
    slugTag,
} from "./content-routes";

/*
 * The Contentful SDK sends its requests with axios, not fetch, so Next never caches a read
 * on its own. Every read below would otherwise spend one Delivery Quota call per page view.
 * unstable_cache stores the result, so each read here is wrapped.
 *
 * A cached read never catches a Contentful error. The throw is deliberate: it leaves the
 * expired entry in place and Next keeps serving the last good page. A caught error would
 * instead cache an empty result for the whole Backstop Window.
 *
 * See docs/adr/0003-contentful-delivery-quota.md.
 */

// Every listing field except the body. The index and the sitemap need nothing else.
const BLOG_SUMMARY_FIELDS = [
    "sys.id",
    "sys.updatedAt",
    "fields.title",
    "fields.slug",
    "fields.excerpt",
    "fields.publishDate",
    "fields.authorName",
    "fields.coverImage",
    "fields.tags",
    "fields.showInProduction",
];

function withProductionFilter(
    query: Record<string, unknown>,
    production: boolean,
): Record<string, unknown> {
    if (!production) return query;
    return { ...query, "fields.showInProduction": true };
}

function mapBlogPost<T>(item: { fields: unknown; sys: { updatedAt: string } }): T {
    return {
        ...(item.fields as T),
        updatedAt: item.sys.updatedAt,
    };
}

/* Blog Posts */

const readAllBlogPosts = async (production: boolean): Promise<BlogPostSummary[]> => {
    const res = await contentfulClient.getEntries(
        withProductionFilter(
            {
                content_type: CONTENT_TYPES.BLOG_POST,
                select: BLOG_SUMMARY_FIELDS,
                include: 1, // resolves the coverImage asset
                order: ["-fields.publishDate"],
                limit: 1000,
            },
            production,
        ),
    );

    return res.items.map((item) => mapBlogPost<BlogPostSummary>(item));
};

// The one listing read. The index, the sitemap, generateStaticParams, and the slug
// guards all share it, so the whole set costs a single Contentful call.
export const getAllBlogPosts = (): Promise<BlogPostSummary[]> =>
    unstable_cache(readAllBlogPosts, ["blog-post-list"], {
        revalidate: BACKSTOP_WINDOW_SECONDS,
        tags: [contentTypeTag(CONTENT_TYPES.BLOG_POST), BLOG_INDEX_TAG],
    })(isProd());

export async function getAllBlogPostSlugs(): Promise<string[]> {
    const posts = await getAllBlogPosts();
    return posts.map((post) => post.slug).filter(Boolean);
}

const readBlogPostBySlug = async (
    slug: string,
    production: boolean,
): Promise<BlogPostFields | null> => {
    const res = await contentfulClient.getEntries(
        withProductionFilter(
            {
                content_type: CONTENT_TYPES.BLOG_POST,
                "fields.slug": slug,
                limit: 1,
                include: 10,
            },
            production,
        ),
    );

    if (!res.items.length) return null;
    return mapBlogPost<BlogPostFields>(res.items[0]);
};

// Reads one Blog Post, or null when this site shows no post with the slug.
//
// The slug comes from the URL, so an unchecked slug would let any visitor spend a call
// and fill the cache. The listing is already cached, so the check costs nothing.
export async function getBlogPostBySlug(slug: string): Promise<BlogPostFields | null> {
    if (!slug) return null;

    const slugs = await getAllBlogPostSlugs();
    if (!slugs.includes(slug)) return null;

    // unstable_cache fixes its tags when it wraps, so the wrapper is built per slug.
    // The key parts and the callback stay identical, so one slug always hits one entry.
    return unstable_cache(readBlogPostBySlug, ["blog-post", slug], {
        revalidate: BACKSTOP_WINDOW_SECONDS,
        tags: [
            contentTypeTag(CONTENT_TYPES.BLOG_POST),
            slugTag(CONTENT_TYPES.BLOG_POST, slug),
        ],
    })(slug, isProd());
}

/* CMS Pages */

const readAllPageSlugs = async (): Promise<string[]> => {
    const res = await contentfulClient.getEntries({
        content_type: CONTENT_TYPES.PAGE,
        select: ["fields.slug"],
        limit: 1000,
    });

    return res.items
        .map((item) => (item.fields as PageFields).slug)
        .filter(Boolean);
};

// The CMS Page slug listing. Feeds the sitemap, generateStaticParams, and the slug guard.
export const getAllPageSlugs = (): Promise<string[]> =>
    unstable_cache(readAllPageSlugs, ["page-slug-list"], {
        revalidate: BACKSTOP_WINDOW_SECONDS,
        tags: [contentTypeTag(CONTENT_TYPES.PAGE), PAGE_INDEX_TAG],
    })();

const readPageBySlug = async (slug: string): Promise<PageFields | null> => {
    const res = await contentfulClient.getEntries({
        content_type: CONTENT_TYPES.PAGE,
        "fields.slug": slug,
        limit: 1,
    });

    if (!res.items.length) return null;
    return res.items[0].fields as PageFields;
};

// Reads one CMS Page, or null when this site shows no page with the slug.
// Guarded like getBlogPostBySlug, and for the same reason.
export async function getPageBySlug(slug: string): Promise<PageFields | null> {
    if (!slug) return null;

    const slugs = await getAllPageSlugs();
    if (!slugs.includes(slug)) return null;

    return unstable_cache(readPageBySlug, ["cms-page", slug], {
        revalidate: BACKSTOP_WINDOW_SECONDS,
        tags: [contentTypeTag(CONTENT_TYPES.PAGE), slugTag(CONTENT_TYPES.PAGE, slug)],
    })(slug);
}
