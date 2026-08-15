import type {
    BlogLanguage,
    BlogPostSummary,
} from "@/lib/contentful/contentful";

export const DEFAULT_BLOG_LANGUAGE: BlogLanguage = "en";

const TRANSLATION_PAIRS = [
    {
        en: "stripe-export-google-sheets-automatically",
        es: "exportar-datos-stripe-google-sheets",
    },
] as const;

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
    const pair = TRANSLATION_PAIRS.find(
        (candidate) => candidate.en === slug || candidate.es === slug,
    );

    if (!pair) return undefined;

    const hasEnglish = posts.some(
        (post) =>
            getBlogLanguage(post) === "en" &&
            post.slug === pair.en,
    );
    const hasSpanish = posts.some(
        (post) =>
            getBlogLanguage(post) === "es" &&
            post.slug === pair.es,
    );

    if (!hasEnglish || !hasSpanish) return undefined;

    return {
        en: getBlogPath(pair.en, "en"),
        es: getBlogPath(pair.es, "es"),
    };
}
