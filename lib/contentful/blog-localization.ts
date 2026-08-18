import type {
    BlogLanguage,
    BlogPostSummary,
} from "@/lib/contentful/contentful";

export const DEFAULT_BLOG_LANGUAGE: BlogLanguage = "en";

export function getBlogLanguage(post: { language?: BlogLanguage }): BlogLanguage {
    return post.language === "es" ? "es" : DEFAULT_BLOG_LANGUAGE;
}

export function getBlogPath(slug: string, language: BlogLanguage): string {
    return language === "es" ? `/es/blog/${slug}` : `/blog/${slug}`;
}

export function getAvailableBlogAlternates(
    slug: string,
    posts: BlogPostSummary[],
): Record<BlogLanguage, string> | undefined {
    const currentPost = posts.find((post) => post.slug === slug);
    if (!currentPost) return undefined;

    const currentLanguage = getBlogLanguage(currentPost);
    const englishPost = currentLanguage === "en"
        ? currentPost
        : posts.find(
            (post) =>
                getBlogLanguage(post) === "en" &&
                post.id === currentPost.translationOf?.sys?.id,
        );
    const spanishPost = currentLanguage === "es"
        ? currentPost
        : posts.find(
            (post) =>
                getBlogLanguage(post) === "es" &&
                post.translationOf?.sys?.id === currentPost.id,
        );

    if (!englishPost || !spanishPost) return undefined;

    return {
        en: getBlogPath(englishPost.slug, "en"),
        es: getBlogPath(spanishPost.slug, "es"),
    };
}
