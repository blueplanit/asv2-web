// app/blog/[slug]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
    getAllBlogPostSlugs,
    getBlogPostBySlug,
} from "@/lib/contentful/contentful-queries";
import {
    documentToReactComponents,
} from "@contentful/rich-text-react-renderer";
import { type Document } from "@contentful/rich-text-types";
import {
    contentfulRichTextOptions,
} from "@/lib/contentful/contentful-rich-text";
import { APP_NAME } from "@/lib/constants";
import type { BlogPostFields } from "@/lib/contentful/contentful";
import { createMarketingMetadata } from "@/lib/marketing/seo-metadata";

export const revalidate = 60;

export async function generateStaticParams() {
    const slugs = await getAllBlogPostSlugs();
    return slugs.map((slug) => ({ slug }));
}

function getCoverImageUrl(post: BlogPostFields): string | undefined {
    const file = post.coverImage?.fields?.file;
    const rawUrl = typeof file?.url === "string" ? file.url : file?.["en-US"]?.url;

    if (!rawUrl) return undefined;
    return rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;
}

// SEO metadata: use excerpt as meta description
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;

    try {
        const post = await getBlogPostBySlug(slug);
        if (!post) {
            return {
                title: `Post not found | ${APP_NAME} Blog`,
                description: "This blog post could not be found.",
            };
        }

        const title = `${post.title} | ${APP_NAME} Blog`;
        const description =
            post.excerpt ||
            "Insights on Stripe → Google Sheets sync, infrastructure, and product updates.";

        return createMarketingMetadata({
            title,
            description,
            path: `/blog/${slug}`,
            type: "article",
            image: getCoverImageUrl(post),
            imageAlt: post.title,
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

    const post = await getBlogPostBySlug(slug);
    if (!post) return notFound();

    const bodyDoc = post.body as unknown as Document;

    return (
        <article className="mx-auto max-w-3xl px-4 py-12">
            <header>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Blog
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                    {post.title}
                </h1>
                <p className="mt-2 text-xs text-slate-500">
                    {post.publishDate &&
                        new Date(post.publishDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                        })}{" "}
                    {post.authorName && <> · {post.authorName}</>}
                </p>
            </header>

            {bodyDoc && (
                <div className="mt-8 text-base leading-8">
                    {documentToReactComponents(bodyDoc, contentfulRichTextOptions)}
                </div>
            )}
        </article>
    );
}
