import { APP_NAME } from "@/lib/constants";
import type { BlogPostFields } from "@/lib/contentful/contentful";

export function getCoverImageUrl(post: BlogPostFields): string | undefined {
    const file = post.coverImage?.fields?.file;
    const rawUrl = typeof file?.url === "string" ? file.url : file?.["en-US"]?.url;

    if (!rawUrl) return undefined;
    return rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;
}

export function getBrandedMetadataTitle(title: string): string {
    const trimmedTitle = title.trim();

    if (/\|\s*SyncStaq(?:\s+Blog)?$/i.test(trimmedTitle)) {
        return trimmedTitle.replace(/\|\s*SyncStaq\s+Blog$/i, `| ${APP_NAME}`);
    }

    return `${trimmedTitle} | ${APP_NAME}`;
}
