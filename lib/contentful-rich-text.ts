// lib/contentful-rich-text.ts
import type { Options } from "@contentful/rich-text-react-renderer";
import {
    BLOCKS,
    INLINES,
    type Document,
} from "@contentful/rich-text-types";

export type ContentfulRichTextDocument = Document;

export const contentfulRichTextOptions: Options = {
    renderNode: {
        [BLOCKS.HEADING_1]: (_, children) => (
            <h1 className="mt-8 text-3xl font-semibold tracking-tight">{children}</h1>
        ), 
    },
};
