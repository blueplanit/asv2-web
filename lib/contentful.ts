// lib/contentful.ts
import { createClient, Entry, EntrySkeletonType } from "contentful";

const space = process.env.CONTENTFUL_SPACE_ID!;
const accessToken = process.env.CONTENTFUL_CDA_TOKEN!;
const environment = process.env.CONTENTFUL_ENVIRONMENT || "master";

export const contentfulClient = createClient({
    space,
    accessToken,
    environment,
});

export type BlogPostFields = {
    showInProduction?: boolean;
    title: string;
    slug: string;
    excerpt?: string;
    body: any;
    publishDate: string;
    authorName?: string;
    coverImage?: any;
    tags?: string[];
};

export type PageFields = {
    title: string;
    slug: string;
    body: any;
    layoutVariant?: "default" | "centered" | "two-column";
    theme?: "light" | "dark" | "brand";
};

export type BlogPostEntry = Entry<EntrySkeletonType & { fields: BlogPostFields }>;
export type PageEntry = Entry<EntrySkeletonType & { fields: PageFields }>;
