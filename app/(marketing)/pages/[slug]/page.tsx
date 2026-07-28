// app/(marketing)/pages/[slug]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPageBySlug } from "@/lib/contentful/contentful-queries";
import {
    documentToReactComponents,
} from "@contentful/rich-text-react-renderer";
import {
    contentfulRichTextOptions,
    type ContentfulRichTextDocument,
} from "@/lib/contentful/contentful-rich-text";
import { createMarketingMetadata } from "@/lib/marketing/seo-metadata";

const pageSeo: Record<string, { title: string; description: string }> = {
    about: {
        title: "About SyncStaq — Stripe to Google Sheets Sync",
        description:
            "SyncStaq began as an internal tool for our own Stripe reporting headaches. Learn who we are and why we built automated Stripe to Google Sheets sync.",
    },
    contact: {
        title: "Contact SyncStaq — Support and Sales Questions",
        description:
            "Get in touch with the SyncStaq team about Stripe to Google Sheets sync, billing questions, technical support, or anything else you need help with.",
    },
};

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const seo = pageSeo[slug];

    if (!seo) return {};

    return createMarketingMetadata({
        ...seo,
        path: `/pages/${slug}`,
    });
}

export const revalidate = 60;

export default async function CmsPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    // params is a Promise in Next 16 + React 19
    const { slug } = await params;

    const page = await getPageBySlug(slug);
    if (!page) return notFound();

    const bodyDoc = page.body as unknown as ContentfulRichTextDocument;

    return (
        <div className="bg-white text-slate-900 min-h-[100vh]">
            <div className="mx-auto max-w-3xl px-4 py-12 h-full">
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
