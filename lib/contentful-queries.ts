// lib/contentful-queries.ts
import { contentfulClient, BlogPostFields, PageFields } from "./contentful";

// All blog posts
export async function getAllBlogPosts(): Promise<BlogPostFields[]> {
    const res = await contentfulClient.getEntries({
        content_type: "blogPostASv2", // content type ID you created
        order: ["-fields.publishDate"],
    });

    return res.items.map((item) => item.fields as BlogPostFields);
}

// All blog post slugs
export async function getAllBlogPostSlugs(): Promise<string[]> {
    const res = await contentfulClient.getEntries({
        content_type: "blogPostASv2",
        select: ["fields.slug"],
    });

    return res.items.map((item) => item.fields as BlogPostFields).map((item) => item.slug);
}

// Single blog post by slug
export async function getBlogPostBySlug(slug: string): Promise<BlogPostFields | null> {
    const res = await contentfulClient.getEntries({
        content_type: "blogPostASv2",
        limit: 1,
        "fields.slug": slug,
        include: 10,
    });

    if (!res.items.length) return null;
    return res.items[0].fields as BlogPostFields;
}

// CMS Page by slug (terms/privacy/about/etc.)
export async function getPageBySlug(slug: string): Promise<PageFields | null> {
    const res = await contentfulClient.getEntries({
        content_type: "pageASv2", // ID of your Page content type
        limit: 1,
        "fields.slug": slug,
    });

    if (!res.items.length) return null;
    return res.items[0].fields as PageFields;
}
