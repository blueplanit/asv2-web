// app/blog/[slug]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
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
import { APP_NAME, SITE_URL } from "@/lib/constants";
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

        const title = post.title;
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
            publishedTime: post.publishDate,
            modifiedTime: post.updatedAt,
            authors: post.authorName ? [post.authorName] : undefined,
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
    const postUrl = new URL(`/blog/${slug}`, SITE_URL).toString();
    const coverImage = getCoverImageUrl(post);
    const author = post.authorName
        ? {
            "@type": "Person",
            name: post.authorName,
            url: new URL("/pages/about", SITE_URL).toString(),
        }
        : { "@type": "Organization", name: APP_NAME, url: SITE_URL };
    const structuredData = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "BlogPosting",
                headline: post.title,
                description: post.excerpt,
                ...(coverImage ? { image: [coverImage] } : {}),
                datePublished: post.publishDate,
                dateModified: post.updatedAt || post.publishDate,
                author,
                publisher: {
                    "@type": "Organization",
                    name: APP_NAME,
                    url: SITE_URL,
                    logo: {
                        "@type": "ImageObject",
                        url: new URL("/brand/syncstaq-icon.svg", SITE_URL).toString(),
                    },
                },
                mainEntityOfPage: {
                    "@type": "WebPage",
                    "@id": postUrl,
                },
            },
            {
                "@type": "BreadcrumbList",
                itemListElement: [
                    {
                        "@type": "ListItem",
                        position: 1,
                        name: "Home",
                        item: SITE_URL,
                    },
                    {
                        "@type": "ListItem",
                        position: 2,
                        name: "Blog",
                        item: new URL("/blog", SITE_URL).toString(),
                    },
                    {
                        "@type": "ListItem",
                        position: 3,
                        name: post.title,
                        item: postUrl,
                    },
                ],
            },
        ],
    };
    const publishedLabel = post.publishDate
        ? new Date(post.publishDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        })
        : null;
    const updatedLabel = post.updatedAt
        ? new Date(post.updatedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        })
        : null;
    const wasUpdated = Boolean(
        post.publishDate &&
        post.updatedAt &&
        new Date(post.updatedAt).getTime() - new Date(post.publishDate).getTime() > 24 * 60 * 60 * 1000,
    );

    return (
        <article className="mx-auto max-w-3xl px-4 py-12">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
                }}
            />
            <header>
                <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
                    <ol className="flex items-center gap-2">
                        <li>
                            <Link className="hover:text-slate-700" href="/">
                                Home
                            </Link>
                        </li>
                        <li aria-hidden="true">/</li>
                        <li>
                            <Link className="hover:text-slate-700" href="/blog">
                                Blog
                            </Link>
                        </li>
                    </ol>
                </nav>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                    {post.title}
                </h1>
                <p className="mt-2 text-xs text-slate-500">
                    {publishedLabel}
                    {post.authorName && (
                        <>
                            {" · "}
                            <Link className="hover:text-slate-700" href="/pages/about">
                                {post.authorName}
                            </Link>
                        </>
                    )}
                    {wasUpdated && updatedLabel && <> · Updated {updatedLabel}</>}
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
