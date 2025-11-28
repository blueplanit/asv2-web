// lib/contentful-rich-text.tsx
import type { Options } from "@contentful/rich-text-react-renderer";
import {
    BLOCKS,
    INLINES,
    type Document,
} from "@contentful/rich-text-types";
import React from "react";

export type ContentfulRichTextDocument = Document;

export const contentfulRichTextOptions: Options = {
    renderNode: {
        [BLOCKS.HEADING_1]: (_, children) => (
            <h1 className="mt-8 text-3xl font-semibold tracking-tight">
                {children}
            </h1>
        ),
        [BLOCKS.HEADING_2]: (_, children) => (
            <h2 className="mt-8 text-2xl font-semibold tracking-tight">
                {children}
            </h2>
        ),
        [BLOCKS.HEADING_3]: (_, children) => (
            <h3 className="mt-6 text-xl font-semibold tracking-tight">
                {children}
            </h3>
        ),
        [BLOCKS.PARAGRAPH]: (_, children) => (
            <p className="mt-3 leading-7 text-slate-700">{children}</p>
        ),
        [BLOCKS.UL_LIST]: (_, children) => (
            // [&>li>p]:m-0 removes the margin from paragraphs inside list items
            // so bullet points align correctly with text
            <ul className="mt-3 list-disc pl-6 [&>li>p]:m-0">
                {children}
            </ul>
        ),
        [BLOCKS.OL_LIST]: (_, children) => (
            <ol className="mt-3 list-decimal pl-6 [&>li>p]:m-0">
                {children}
            </ol>
        ),
        [BLOCKS.LIST_ITEM]: (_, children) => (
            <li className="pl-1">{children}</li>
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

            const isExternal = /^https?:\/\//.test(url);
            return (
                <a
                    href={url}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    className="underline decoration-slate-400 hover:decoration-slate-600"
                >
                    {children}
                </a>
            );
        },

    },
};