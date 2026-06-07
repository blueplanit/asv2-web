// lib/contentful/contentful-rich-text.tsx
import type { Options } from "@contentful/rich-text-react-renderer";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { BLOCKS, INLINES, type Document } from "@contentful/rich-text-types";

export type ContentfulRichTextDocument = Document;
const SITE_ORIGIN = "https://www.syncstaq.com";

export const contentfulRichTextOptions: Options = {
    renderNode: {
        [BLOCKS.HEADING_1]: (_, children) => (
            <h1 className="mt-8 text-3xl font-semibold tracking-tight">
                {children}
            </h1>
        ),
        [BLOCKS.HEADING_2]: (_, children) => (
            <h2 className="mt-12 text-2xl font-semibold tracking-tight text-slate-950">
                {children}
            </h2>
        ),
        [BLOCKS.HEADING_3]: (_, children) => (
            <h3 className="mt-8 text-xl font-semibold tracking-tight text-slate-950">
                {children}
            </h3>
        ),
        [BLOCKS.PARAGRAPH]: (_, children) => {
            return (
                <p className="mt-4 text-base leading-8 text-slate-700">
                    {children}
                </p>
            );
        },
        [BLOCKS.UL_LIST]: (_, children) => (
            // [&>li>p]:m-0 removes the margin from paragraphs inside list items
            // so bullet points align correctly with text
            <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-700 marker:text-slate-400 [&>li>p]:m-0">
                {children}
            </ul>
        ),
        [BLOCKS.OL_LIST]: (_, children) => (
            <ol className="mt-4 list-decimal space-y-2 pl-6 text-slate-700 marker:text-slate-400 [&>li>p]:m-0">
                {children}
            </ol>
        ),
        [BLOCKS.LIST_ITEM]: (_, children) => (
            <li className="pl-1 leading-8">{children}</li>
        ),
        [BLOCKS.QUOTE]: (_, children) => (
            <blockquote className="mt-3 border-l-2 border-slate-300 pl-4 italic text-slate-700">
                {children}
            </blockquote>
        ),

        [BLOCKS.EMBEDDED_ASSET]: (node) => {
            // Contentful assets data structure can vary (GraphQL vs REST)
            // This safely accesses the URL and Title
            const asset = node.data.target as any;
            const fields = asset?.fields;

            if (!fields?.file) return null;

            const file = fields.file;

            // Handle localized (object) vs non-localized (string) URL
            const rawUrl = typeof file.url === "string"
                ? file.url
                : file["en-US"]?.url;

            if (!rawUrl) return null;

            // Ensure protocol is present
            const url = rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;

            const alt = fields.description || fields.title || "Embedded Asset";

            return (
                <figure className="my-6 flex flex-col items-center">
                    <img
                        src={url}
                        alt={alt}
                        className="mx-auto rounded-md border border-slate-200"
                        loading="lazy"
                    />
                    {alt && (
                        <figcaption className="mt-2 text-xs text-slate-500 text-center">
                            {alt}
                        </figcaption>
                    )}
                </figure>
            );
        },

        [BLOCKS.EMBEDDED_ENTRY]: (node) => {
            const contentType = node.data.target?.sys?.contentType?.sys?.id;
            if (contentType === "ctaBlock") {
                const body = node.data.target?.fields?.ctaBodyText as Document | undefined;
                return (
                    <div className="mt-10 rounded-md border border-indigo-100 bg-indigo-50/70 px-5 py-4 text-base leading-7 text-slate-800 shadow-sm [&_a]:font-semibold [&_p]:m-0">
                        {body && documentToReactComponents(body, contentfulRichTextOptions)}
                    </div>
                );
            }
            return null;
        },

        [INLINES.HYPERLINK]: (node, children) => {
            const url = node.data.uri as string;

            if (url.includes("youtube.com/embed")) {
                return (
                    <div className="my-6 w-full">
                        <div className="aspect-video w-full">
                            <iframe
                                src={url}
                                title="YouTube video"
                                className="h-full w-full rounded-md border border-slate-200"
                                allowFullScreen
                            />
                        </div>
                    </div>
                );
            }

            const isExternal = /^https?:\/\//.test(url) && !url.startsWith(SITE_ORIGIN);
            return (
                <a
                    href={url}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    className="font-medium text-indigo-700 underline decoration-indigo-300 decoration-2 underline-offset-4 transition-colors hover:text-indigo-600 hover:decoration-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                >
                    {children}
                </a>
            );
        },
    },
};
