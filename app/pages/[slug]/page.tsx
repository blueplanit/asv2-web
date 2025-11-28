// app/pages/[slug]/page.tsx
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/contentful-queries";
import {
    documentToReactComponents,
} from "@contentful/rich-text-react-renderer";
import { contentfulRichTextOptions, type ContentfulRichTextDocument } from "@/lib/contentful-rich-text";
export const revalidate = 60;

export default async function CmsPage({
    params,
}: {
    params: { slug: string };
}) {
    const page = await getPageBySlug(params.slug);
    if (!page) return notFound();

    const bodyDoc = page.body as unknown as ContentfulRichTextDocument; // body is Rich text field

    return (
        <div className="bg-white text-slate-900">
            <div className="mx-auto max-w-3xl px-4 py-12">
                <h1 className="text-3xl font-semibold tracking-tight">
                    {page.title}
                </h1>

                <div className="mt-6 text-sm leading-relaxed">
                    {documentToReactComponents(bodyDoc, contentfulRichTextOptions)}
                </div>
            </div>
        </div>
    );
}
