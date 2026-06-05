// lib/contentful/contentful-queries.ts
import { contentfulClient, BlogPostFields, PageFields } from "./contentful";
const isProd = process.env.NODE_ENV === "production";


// All blog posts
export async function getAllBlogPosts(): Promise<BlogPostFields[]> {
    const res = await contentfulClient.getEntries({
        content_type: "blogPostASv2", // content type ID you created
        order: ["-fields.publishDate"],
        ...(isProd ? { "fields.showInProduction": true } : {}),
    });

    return res.items.map((item) => item.fields as BlogPostFields);
}

// All blog post slugs
export async function getAllBlogPostSlugs(): Promise<string[]> {
    const res = await contentfulClient.getEntries({
        content_type: "blogPostASv2",
        select: ["fields.slug"],
        ...(isProd ? { "fields.showInProduction": true } : {}),
    });

    return res.items
        .map((item) => item.fields as BlogPostFields)
        .map((post) => post.slug);
}

// Single blog post by slug
export async function getBlogPostBySlug(slug: string): Promise<BlogPostFields | null> {
    if (!slug) return null;

    const res = await contentfulClient.getEntries({
        content_type: "blogPostASv2",
        limit: 1,
        "fields.slug": slug,
        include: 10,
        ...(isProd ? { "fields.showInProduction": true } : {}),
    });

    if (!res.items.length) return null;
    const post = res.items[0].fields as BlogPostFields;

    if (isProd && !post.showInProduction) return null;

    return post;
}

// CMS Page by slug (terms/privacy/about/etc.)
export async function getPageBySlug(slug: string): Promise<PageFields | null> {
    if (!slug) return null;

    const res = await contentfulClient.getEntries({
        content_type: "pageASv2", // ID of your Page content type
        limit: 1,
        "fields.slug": slug,
    });

    if (!res.items.length) return null;
    return res.items[0].fields as PageFields;
}
