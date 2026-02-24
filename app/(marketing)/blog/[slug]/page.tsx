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

export const revalidate = 60;

export async function generateStaticParams() {
    const slugs = await getAllBlogPostSlugs();
    return slugs.map((slug) => ({ slug }));
}

// SEO metadata: use excerpt as meta description
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    try {
        const post = await getBlogPostBySlug(params.slug);
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

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                type: "article",
                url: `/blog/${params.slug}`,
            },
            twitter: {
                card: "summary",
                title,
                description,
            },
        };
    } catch (err) {
        console.error("generateMetadata error for blog post", { slug: params.slug, err });
        return {
            title: `Post not available | ${APP_NAME} Blog`,
            description: "There was an error loading this blog post.",
        };
    }
}

export default async function BlogPostPage({
    params,
}: {
    params: { slug: string };
}) {
    const post = await getBlogPostBySlug(params.slug);
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
                <div className="mt-8 text-sm leading-relaxed">
                    {documentToReactComponents(bodyDoc, contentfulRichTextOptions)}
                </div>
            )}
        </article>
    );
}
