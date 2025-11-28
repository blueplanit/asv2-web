// app/blog/page.tsx
import Link from "next/link";
import { getAllBlogPosts } from "@/lib/contentful-queries";

export const revalidate = 60;

// Optional helper to resolve Contentful asset -> URL
function getCoverImageUrl(post: any): string | null {
    const asset = post.coverImage as any;
    if (!asset || !asset.fields) return null;
    const file = asset.fields.file;
    if (!file) return null;

    const rawUrl =
        typeof file.url === "string"
            ? file.url
            : file["en-US"]?.url;

    if (!rawUrl) return null;
    return rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;
}

export default async function BlogIndexPage() {
    const posts = await getAllBlogPosts();

    if (!posts?.length) {
        return (
            <div className="mx-auto max-w-4xl px-4 py-16">
                <h1 className="text-3xl font-semibold tracking-tight">Blog</h1>
                <p className="mt-3 text-sm text-slate-500">
                    No posts published yet. Check back soon.
                </p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl px-4 py-14">
            {/* Header */}
            <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Blog
                    </p>
                    <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                        Updates & insights
                    </h1>
                    <p className="mt-2 max-w-xl text-sm text-slate-500">
                        Deep dives on Stripe → Sheets sync, infra architecture, and product
                        decisions behind AutoSync V2.
                    </p>
                </div>
                <div className="text-xs text-slate-400">
                    {posts.length} {posts.length === 1 ? "post" : "posts"}
                </div>
            </header>

            {/* Featured + other posts as cards */}
            <section className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {posts.map((post, index) => {
                    const img = getCoverImageUrl(post);
                    const isFeatured = index === 0;

                    return (
                        <article
                            key={post.slug}
                            className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md ${isFeatured ? "md:col-span-2 lg:col-span-2" : ""
                                }`}
                        >
                            <Link href={`/blog/${post.slug}`} className="flex flex-1 flex-col">
                                {img && (
                                    <div
                                        className={`relative w-full overflow-hidden bg-slate-100 ${isFeatured ? "h-56 sm:h-64" : "h-40"
                                            }`}
                                    >
                                        <img
                                            src={img}
                                            alt={post.title}
                                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                                        />
                                    </div>
                                )}

                                <div className="flex flex-1 flex-col px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                                        {post.publishDate && (
                                            <span>
                                                {new Date(post.publishDate).toLocaleDateString("en-US", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                })}
                                            </span>
                                        )}
                                        {post.authorName && (
                                            <>
                                                <span aria-hidden="true">·</span>
                                                <span>{post.authorName}</span>
                                            </>
                                        )}
                                    </div>

                                    <h2
                                        className={`mt-2 font-semibold text-slate-900 ${isFeatured ? "text-lg sm:text-xl" : "text-sm"
                                            }`}
                                    >
                                        {post.title}
                                    </h2>

                                    {post.excerpt && (
                                        <p
                                            className={`mt-2 text-slate-600 ${isFeatured ? "text-sm line-clamp-4" : "text-xs line-clamp-3"
                                                }`}
                                        >
                                            {post.excerpt}
                                        </p>
                                    )}

                                    {Array.isArray(post.tags) && post.tags.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {post.tags.slice(0, isFeatured ? 4 : 3).map((tag: string) => (
                                                <span
                                                    key={tag}
                                                    className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Link>
                        </article>
                    );
                })}
            </section>
        </div>
    );
}
