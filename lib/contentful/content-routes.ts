// lib/contentful/content-routes.ts
// Every site-specific fact about Contentful routing lives here.
// The space serves three websites, so most entries in it belong to the other two.
// See docs/adr/0003-contentful-delivery-quota.md.

export const CONTENT_TYPES = {
    BLOG_POST: "blogPostASv2",
    CMS_PAGE: "pageASv2",
    COPY_CONFIG: "aSv2CopyAndConfig",
} as const;

// Content types this site renders. A webhook for any other type costs no Contentful call.
export const SERVED_CONTENT_TYPES: string[] = Object.values(CONTENT_TYPES);

// The pageKey of each Copy Config entry. These entries carry no slug.
export const COPY_PAGE_KEYS = {
    LANDING: "landing",
    PRICING: "pricing",
} as const;

// The Backstop Window, in seconds. A webhook is how content normally reaches the site,
// so this only catches a webhook that failed.
// Next cannot import a value into `revalidate`, so each route hardcodes 604800 and cites this.
export const BACKSTOP_WINDOW_SECONDS = 7 * 24 * 60 * 60;

/* Cache tags. The webhook expires a cached read by tag rather than by path. */

// Expires every cached read of one content type. Used when a payload names no single entry.
export const contentTypeTag = (contentType: string) => `contentful:${contentType}`;

// Expires the cached read of one entry.
export const slugTag = (contentType: string, slug: string) =>
    `contentful:${contentType}:${slug}`;

// Expires a listing. A new, renamed, or removed entry changes what the listing shows.
export const BLOG_INDEX_TAG = `contentful:${CONTENT_TYPES.BLOG_POST}:index`;
export const CMS_PAGE_INDEX_TAG = `contentful:${CONTENT_TYPES.CMS_PAGE}:index`;

// Expires one Copy Config entry, keyed by pageKey.
export const copyKeyTag = (pageKey: string) =>
    `contentful:${CONTENT_TYPES.COPY_CONFIG}:${pageKey}`;
