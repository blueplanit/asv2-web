import type {
    BlogLanguage,
    BlogPostSummary,
} from "@/lib/contentful/contentful";

const DEFAULT_BLOG_LANGUAGE: BlogLanguage = "en";

export function getBlogLanguage(post: { language?: BlogLanguage }): BlogLanguage {
    return post.language === "es" ? "es" : DEFAULT_BLOG_LANGUAGE;
}

export function getBlogPath(slug: string, language: BlogLanguage): string {
    return language === "es" ? `/es/blog/${slug}` : `/blog/${slug}`;
}

// Takes the post rather than its slug. One slug can exist once per language, so a slug
// alone cannot name a single entry.
export function getAvailableBlogAlternates(
    currentPost: BlogPostSummary,
    posts: BlogPostSummary[],
): Record<BlogLanguage, string> | undefined {
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
