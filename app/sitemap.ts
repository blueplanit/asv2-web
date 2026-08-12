import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import {
    getAllBlogPosts,
    getAllPageSlugs,
} from "@/lib/contentful/contentful-queries";

// The Backstop Window. A Contentful webhook expires the listings this reads as soon as an
// entry changes. See docs/adr/0003-contentful-delivery-quota.md.
export const revalidate = 604800; // BACKSTOP_WINDOW_SECONDS

type SitemapEntry = MetadataRoute.Sitemap[number];

const staticRoutes: Array<{
    path: string;
    changeFrequency: SitemapEntry["changeFrequency"];
    priority: number;
}> = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/pricing", changeFrequency: "monthly", priority: 0.9 },
    { path: "/stripe-google-sheets-integration", changeFrequency: "monthly", priority: 0.9 },
    { path: "/stripe-csv-export-alternative", changeFrequency: "monthly", priority: 0.9 },
    { path: "/use-cases/stripe-commission-revenue-share", changeFrequency: "monthly", priority: 0.8 },
    { path: "/how-it-works", changeFrequency: "monthly", priority: 0.8 },
    { path: "/sample-sheet", changeFrequency: "monthly", priority: 0.8 },
    { path: "/blog", changeFrequency: "weekly", priority: 0.7 },
];

const absolute = (path: string) => new URL(path, SITE_URL).toString();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // A Contentful error must throw. Next then keeps serving the last good sitemap.
    // These reads were caught before, which was safe under an hourly rebuild. Under the
    // Backstop Window, one failed regeneration would drop every post for a week.
    const [posts, pageSlugs] = await Promise.all([
        getAllBlogPosts(),
        getAllPageSlugs(),
    ]);

    const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
        url: absolute(route.path),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
    }));

    // getAllBlogPosts() filters on showInProduction in production, so drafts stay out.
    const blogEntries: MetadataRoute.Sitemap = posts
        .filter((post) => Boolean(post.slug))
        .map((post) => {
            const modifiedValue = post.updatedAt || post.publishDate;
            const modified = modifiedValue ? new Date(modifiedValue) : null;

            return {
                url: absolute(`/blog/${post.slug}`),
                ...(modified && !Number.isNaN(modified.getTime())
                    ? { lastModified: modified }
                    : {}),
                changeFrequency: "monthly" as const,
                priority: 0.6,
            };
        });

    const pageEntries: MetadataRoute.Sitemap = pageSlugs
        .filter(Boolean)
        .map((slug) => ({
            url: absolute(`/pages/${slug}`),
            changeFrequency: "yearly" as const,
            priority: 0.4,
        }));

    return [...staticEntries, ...blogEntries, ...pageEntries];
}
