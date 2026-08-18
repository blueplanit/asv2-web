import { APP_NAME } from "@/lib/constants";
import type { BlogPostFields } from "@/lib/contentful/contentful";

// Takes only the field it reads, so a summary and a full post both fit.
export function getCoverImageUrl(post: Pick<BlogPostFields, "coverImage">): string | undefined {
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
