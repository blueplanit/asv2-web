import Link from "next/link";
import {
    documentToReactComponents,
} from "@contentful/rich-text-react-renderer";
import { type Document } from "@contentful/rich-text-types";
import {
    contentfulRichTextOptions,
} from "@/lib/contentful/contentful-rich-text";
import { APP_NAME, SITE_URL } from "@/lib/constants";
import type {
    BlogLanguage,
    BlogPostFields,
} from "@/lib/contentful/contentful";
import { getBlogPath } from "@/lib/contentful/blog-localization";
import { getCoverImageUrl } from "@/lib/contentful/blog-presentation";

type BlogPostArticleProps = {
    post: BlogPostFields;
    slug: string;
    language: BlogLanguage;
    alternatePath?: string;
};

const labels = {
    en: {
        breadcrumbLabel: "Breadcrumb",
        home: "Home",
        updated: "Updated",
        alternate: "Leer en español",
        alternateLanguage: "es",
    },
    es: {
        breadcrumbLabel: "Migas de pan",
        home: "Inicio",
        updated: "Actualizado",
        alternate: "Read in English",
        alternateLanguage: "en",
    },
} as const;

export function BlogPostArticle({
    post,
    slug,
    language,
    alternatePath,
}: BlogPostArticleProps) {
    const bodyDoc = post.body as unknown as Document;
    const pageLabels = labels[language];
    const postPath = getBlogPath(slug, language);
    const postUrl = new URL(postPath, SITE_URL).toString();
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
                inLanguage: language,
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
                        name: pageLabels.home,
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
    const dateLocale = language === "es" ? "es-ES" : "en-US";
    const publishedLabel = post.publishDate
        ? new Date(post.publishDate).toLocaleDateString(dateLocale, {
            year: "numeric",
            month: "short",
            day: "numeric",
        })
        : null;
    const updatedLabel = post.updatedAt
        ? new Date(post.updatedAt).toLocaleDateString(dateLocale, {
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
        <article lang={language} className="mx-auto max-w-3xl px-4 py-12">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
                }}
            />
            <header>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <nav aria-label={pageLabels.breadcrumbLabel} className="text-xs text-slate-500">
                        <ol className="flex items-center gap-2">
                            <li>
                                <Link className="hover:text-slate-700" href="/">
                                    {pageLabels.home}
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
                    {alternatePath && (
                        <Link
                            className="text-xs font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-4 hover:text-indigo-800"
                            href={alternatePath}
                            hrefLang={pageLabels.alternateLanguage}
                        >
                            {pageLabels.alternate}
                        </Link>
                    )}
                </div>
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
                    {wasUpdated && updatedLabel && <> · {pageLabels.updated} {updatedLabel}</>}
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
