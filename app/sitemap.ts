import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import {
    getAllBlogPosts,
    getAllPageSlugs,
} from "@/lib/contentful/contentful-queries";

// Regenerate hourly so newly published Contentful entries appear without a redeploy.
export const revalidate = 3600;

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
    const now = new Date();

    // A Contentful outage should not take the whole sitemap down.
    const [posts, pageSlugs] = await Promise.all([
        getAllBlogPosts().catch((err) => {
            console.error("sitemap: getAllBlogPosts failed", err);
            return [];
        }),
        getAllPageSlugs().catch((err) => {
            console.error("sitemap: getAllPageSlugs failed", err);
            return [];
        }),
    ]);

    const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
        url: absolute(route.path),
        lastModified: now,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
    }));

    // getAllBlogPosts() filters on showInProduction in production, so drafts stay out.
    const blogEntries: MetadataRoute.Sitemap = posts
        .filter((post) => Boolean(post.slug))
        .map((post) => {
            const published = post.publishDate ? new Date(post.publishDate) : null;
            const lastModified =
                published && !Number.isNaN(published.getTime()) ? published : now;

            return {
                url: absolute(`/blog/${post.slug}`),
                lastModified,
                changeFrequency: "monthly" as const,
                priority: 0.6,
            };
        });

    const pageEntries: MetadataRoute.Sitemap = pageSlugs
        .filter(Boolean)
        .map((slug) => ({
            url: absolute(`/pages/${slug}`),
            lastModified: now,
            changeFrequency: "yearly" as const,
            priority: 0.4,
        }));

    return [...staticEntries, ...blogEntries, ...pageEntries];
}
