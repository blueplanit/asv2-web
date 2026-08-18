import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
    getAllBlogPostSlugs,
    getAllBlogPosts,
    getBlogPostBySlug,
} from "@/lib/contentful/contentful-queries";
import {
    getAvailableBlogAlternates,
} from "@/lib/contentful/blog-localization";
import {
    getBrandedMetadataTitle,
    getCoverImageUrl,
} from "@/lib/contentful/blog-presentation";
import { APP_NAME } from "@/lib/constants";
import { createMarketingMetadata } from "@/lib/marketing/seo-metadata";
import { BlogPostArticle } from "@/components/blog/blog-post-article";

// The Backstop Window. A Contentful webhook expires this post as soon as it changes,
// so the window only catches a failed webhook. See docs/adr/0003-contentful-delivery-quota.md.
export const revalidate = 604800; // BACKSTOP_WINDOW_SECONDS

// A newly published post is not in this list, which runs at build time.
// dynamicParams stays true so that post still renders, on demand, the moment it publishes.
export const dynamicParams = true;

// Reuses the cached listing, so every post costs the one call the listing already spends.
export async function generateStaticParams() {
    const slugs = await getAllBlogPostSlugs("en");
    return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;

    try {
        const post = await getBlogPostBySlug(slug, "en");
        if (!post) {
            return {
                title: `Post not found | ${APP_NAME} Blog`,
                description: "This blog post could not be found.",
            };
        }

        const posts = await getAllBlogPosts();
        const languages = getAvailableBlogAlternates(slug, posts);

        return createMarketingMetadata({
            title: getBrandedMetadataTitle(post.seoTitle || post.title),
            description:
                post.excerpt ||
                "Insights on Stripe → Google Sheets sync, infrastructure, and product updates.",
            path: `/blog/${slug}`,
            type: "article",
            image: getCoverImageUrl(post),
            imageAlt: post.title,
            publishedTime: post.publishDate,
            modifiedTime: post.updatedAt,
            authors: post.authorName ? [post.authorName] : undefined,
            languages,
            openGraphLocale: "en_US",
        });
    } catch (err) {
        console.error("generateMetadata error for blog post", { slug, err });
        return {
            title: `Post not available | ${APP_NAME} Blog`,
            description: "There was an error loading this blog post.",
        };
    }
}

export default async function BlogPostPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const post = await getBlogPostBySlug(slug, "en");
    if (!post) return notFound();

    const posts = await getAllBlogPosts();
    const alternates = getAvailableBlogAlternates(slug, posts);

    return (
        <BlogPostArticle
            post={post}
            slug={slug}
            language="en"
            alternatePath={alternates?.es}
        />
    );
}
