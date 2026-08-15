import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
    getAllBlogPostSlugs,
    getAllLocalizedBlogPosts,
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

const SPANISH_EXPORT_METADATA_TITLE =
    "Cómo exportar datos de Stripe a Google Sheets | SyncStaq";

export const revalidate = 604800; // BACKSTOP_WINDOW_SECONDS
export const dynamicParams = true;

export async function generateStaticParams() {
    const slugs = await getAllBlogPostSlugs("es");
    return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;

    try {
        const post = await getBlogPostBySlug(slug, "es");
        if (!post) {
            return {
                title: `Artículo no encontrado | ${APP_NAME}`,
                description: "No se pudo encontrar este artículo.",
            };
        }

        const posts = await getAllLocalizedBlogPosts();
        const languages = getAvailableBlogAlternates(slug, posts);

        return createMarketingMetadata({
            title:
                slug === "exportar-datos-stripe-google-sheets"
                    ? SPANISH_EXPORT_METADATA_TITLE
                    : getBrandedMetadataTitle(post.title),
            description:
                post.excerpt ||
                "Guías prácticas para llevar datos de facturación de Stripe a Google Sheets.",
            path: `/es/blog/${slug}`,
            type: "article",
            image: getCoverImageUrl(post),
            imageAlt: post.title,
            publishedTime: post.publishDate,
            modifiedTime: post.updatedAt,
            authors: post.authorName ? [post.authorName] : undefined,
            languages,
            openGraphLocale: "es_ES",
        });
    } catch (err) {
        console.error("generateMetadata error for Spanish blog post", { slug, err });
        return {
            title: `Artículo no disponible | ${APP_NAME}`,
            description: "Se produjo un error al cargar este artículo.",
        };
    }
}

export default async function SpanishBlogPostPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const post = await getBlogPostBySlug(slug, "es");
    if (!post) return notFound();

    const posts = await getAllLocalizedBlogPosts();
    const alternates = getAvailableBlogAlternates(slug, posts);

    return (
        <BlogPostArticle
            post={post}
            slug={slug}
            language="es"
            alternatePath={alternates?.en}
        />
    );
}
