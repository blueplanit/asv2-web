// app/blog/[slug]/page.tsx
import { notFound } from "next/navigation";
import {
    getAllBlogPostSlugs,
    getBlogPostBySlug,
} from "@/lib/contentful-queries";
import {
    documentToReactComponents,
} from "@contentful/rich-text-react-renderer";
import {
    type Document,
} from "@contentful/rich-text-types";
import {
    contentfulRichTextOptions,
    type ContentfulRichTextDocument,
  } from "@/lib/contentful-rich-text";

export const revalidate = 60;
export async function generateStaticParams() {
    const slugs = await getAllBlogPostSlugs();
    return slugs.map((slug) => ({ slug }));
}

export default async function BlogPostPage({
    params,
}: {
    params: { slug: string };
}) {
    const post = await getBlogPostBySlug(params.slug);
    if (!post) return notFound();

    const bodyDoc = post.body as unknown as Document;

    return (
        <article className="mx-auto max-w-3xl px-4 py-12">
            <header>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Blog
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                    {post.title}
                </h1>
                <p className="mt-2 text-xs text-slate-500">
                    {post.publishDate &&
                        new Date(post.publishDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                        })}{" "}
                    {post.authorName && <> · {post.authorName}</>}
                </p>
            </header>

            <div className="mt-8 text-sm leading-relaxed">
                {documentToReactComponents(bodyDoc, contentfulRichTextOptions)}
            </div>
        </article>
    );
}
