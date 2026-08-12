import crypto from "crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { getEntryById } from "@/lib/contentful/contentful";
import {
    BLOG_INDEX_TAG,
    CONTENT_TYPES,
    CMS_PAGE_INDEX_TAG,
    SERVED_CONTENT_TYPES,
    contentTypeTag,
    copyKeyTag,
    slugTag,
} from "@/lib/contentful/content-routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET_HEADER = "x-revalidate-secret";
const TOPIC_HEADER = "x-contentful-topic";
const DEFAULT_LOCALE = "en-US";

// Topics that remove content from the site.
const REMOVAL_ACTIONS = ["unpublish", "delete", "archive"];
const HANDLED_ACTIONS = ["publish", ...REMOVAL_ACTIONS];

// The only Contentful entity that maps to content here.
// An Asset removal ends in the same action word. Acting on it would let one deleted
// image expire every cached post. See docs/adr/0003-contentful-delivery-quota.md.
const ENTRY_ENTITY = "Entry";

// How long to wait for the Delivery API to serve the change the webhook announced.
const CONFIRM_TIMEOUT_MS = 15000;
const CONFIRM_POLL_MS = 1000;

/**
 * On-Demand Revalidation for Contentful webhooks.
 *
 * This is how content normally reaches the site.
 * The Backstop Window only catches a webhook that failed.
 * This endpoint answers 503 when it cannot confirm a change.
 * Contentful then retries the delivery.
 *
 * It answers 200 for an entry another website owns, so Contentful does not mark the
 * webhook as failing.
 */
export async function POST(request: Request) {
    if (!isAuthorised(request)) {
        return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    const body = await readBody(request);
    if (!body) {
        return NextResponse.json({ error: "Request body is not JSON." }, { status: 400 });
    }

    const topic = request.headers.get(TOPIC_HEADER) || "";
    if (!topic) {
        return NextResponse.json({ error: `Missing ${TOPIC_HEADER} header.` }, { status: 400 });
    }

    // A topic reads ContentManagement.<entity>.<action>, e.g. ContentManagement.Entry.publish.
    const topicParts = topic.split(".");
    const action = topicParts.pop() || "";
    const entity = topicParts.pop() || "";

    if (entity !== ENTRY_ENTITY) {
        return ignored(`Ignoring "${entity || "unknown"}" topic. This site routes entries only.`);
    }

    if (!HANDLED_ACTIONS.includes(action)) {
        return ignored(`Ignoring topic action "${action}".`);
    }

    const contentType = body?.sys?.contentType?.sys?.id ?? null;
    if (!contentType) {
        return ignored("Payload has no sys.contentType.sys.id.");
    }

    // Check the content type first. An entry another website owns then costs no Contentful call.
    if (!SERVED_CONTENT_TYPES.includes(contentType)) {
        return ignored(`No route for content type "${contentType}". Another website owns it.`);
    }

    // Answer 503, not 200. A 200 would stop the retry, and an unconfirmed removal would
    // then keep the old content for the whole Backstop Window.
    const entryId = body?.sys?.id;
    if (!entryId) {
        return unconfirmed("The payload carries no sys.id, so no entry can be confirmed.");
    }

    const isRemoval = REMOVAL_ACTIONS.includes(action);

    try {
        if (isRemoval) {
            const state = await waitForRemoval(entryId);
            if (state === "timed-out") return unconfirmed(timedOutReason(action));
        } else {
            // A publish payload without a timestamp names no version to wait for. The
            // Delivery API serves the old version throughout the lag, so presence proves
            // nothing. Answer 503 rather than confirm on presence alone.
            const updatedAt = body?.sys?.updatedAt ?? null;
            if (!updatedAt) {
                return unconfirmed(
                    "The payload carries no sys.updatedAt, so no version can be confirmed.",
                );
            }

            const state = await waitForVersion(entryId, updatedAt);
            if (state === "timed-out") return unconfirmed(timedOutReason(action));
        }
    } catch (err) {
        console.error("Revalidation could not confirm the change:", err);
        return NextResponse.json({ error: "Unable to confirm the change" }, { status: 500 });
    }

    const tags = tagsFor(contentType, readField(body?.fields?.slug), readField(body?.fields?.pageKey));

    try {
        // Next 16 requires the profile argument. "max" is the value its own deprecation
        // notice names for a route handler; updateTag is Server Actions only.
        for (const tag of tags) revalidateTag(tag, "max");
    } catch (err) {
        console.error("Revalidation failed:", err);
        return NextResponse.json({ error: "Unable to expire the cache tags" }, { status: 500 });
    }

    return NextResponse.json({ revalidated: tags.length, confirmed: true, tags });
}

/**
 * Names the cache tags one change expires.
 *
 * A payload naming a single entry expires that entry alone. A payload without a slug or
 * pageKey names no entry, so it expires every cached read of the content type instead.
 * A removal payload sometimes carries no fields, which is the case that needs the wider tag.
 */
function tagsFor(
    contentType: string,
    slug: string | null,
    pageKey: string | null,
): string[] {
    // Copy Config entries carry no slug. They are keyed by pageKey.
    if (contentType === CONTENT_TYPES.COPY_CONFIG) {
        return pageKey ? [copyKeyTag(pageKey)] : [contentTypeTag(contentType)];
    }

    if (!slug) return [contentTypeTag(contentType)];

    // A new, renamed, or removed entry changes the listing as well as the entry itself.
    // The listing is also the slug guard, so it must expire for a new slug to resolve.
    const indexTag = INDEX_TAGS[contentType];

    return indexTag ? [slugTag(contentType, slug), indexTag] : [slugTag(contentType, slug)];
}

// The listing tag each slugged content type owns.
const INDEX_TAGS: Record<string, string> = {
    [CONTENT_TYPES.BLOG_POST]: BLOG_INDEX_TAG,
    [CONTENT_TYPES.CMS_PAGE]: CMS_PAGE_INDEX_TAG,
};

type ConfirmState = "confirmed" | "timed-out";

/**
 * Polls the Delivery API until `isServed` accepts what it serves.
 *
 * Contentful accepts a publish before its Delivery API serves the new version.
 * A visitor arriving inside that lag refills the cache from the old version.
 * That visit also starts a fresh Backstop Window.
 * One publish would then pin stale content for a week.
 */
async function pollDeliveryApi(
    entryId: string,
    isServed: (entry: Awaited<ReturnType<typeof getEntryById>>) => boolean,
): Promise<ConfirmState> {
    const deadline = Date.now() + CONFIRM_TIMEOUT_MS;

    for (;;) {
        if (isServed(await getEntryById(entryId))) return "confirmed";

        if (Date.now() >= deadline) return "timed-out";
        await sleep(CONFIRM_POLL_MS);
    }
}

// Waits until the Delivery API stops serving the entry.
const waitForRemoval = (entryId: string) =>
    pollDeliveryApi(entryId, (entry) => !entry);

// Waits until the Delivery API serves a version no older than the webhook announced.
const waitForVersion = (entryId: string, expectedUpdatedAt: string) =>
    pollDeliveryApi(entryId, (entry) =>
        Boolean(entry && isAtLeastAsNew(entry.sys?.updatedAt, expectedUpdatedAt)),
    );

// True when the served version is no older than the version the webhook announced.
// A missing timestamp on either side confirms nothing.
function isAtLeastAsNew(servedUpdatedAt: string | undefined, expected: string | null) {
    if (!expected || !servedUpdatedAt) return false;
    return new Date(servedUpdatedAt).getTime() >= new Date(expected).getTime();
}

function timedOutReason(action: string) {
    return `The Contentful Delivery API did not serve this ${action} within ${CONFIRM_TIMEOUT_MS / 1000} seconds.`;
}

// Reports a change this site does not render. Contentful must not retry it.
function ignored(reason: string) {
    return NextResponse.json({ revalidated: false, reason }, { status: 200 });
}

// Answers without touching the cache, because the change never arrived. Leaving the cache
// alone lets the running Backstop Window expire on time, and the 503 lets Contentful retry.
function unconfirmed(reason: string) {
    console.error(`Revalidation not confirmed: ${reason}`);

    return NextResponse.json(
        {
            revalidated: false,
            confirmed: false,
            reason: `${reason} The cache is unchanged on purpose. Retry this delivery.`,
        },
        { status: 503 },
    );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Compares the shared secret in constant time. Both sides are hashed first, so the digests
// always have the same length. Comparing raw values would leak the expected length.
function isAuthorised(request: Request) {
    const expected = process.env.CONTENTFUL_WEBHOOK_SECRET;
    const supplied = request.headers.get(SECRET_HEADER);

    if (!expected || !supplied) return false;

    return crypto.timingSafeEqual(sha256(expected), sha256(supplied));
}

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest();

// Reads the body as text and parses here, so a malformed body becomes a 400, not a throw.
async function readBody(request: Request) {
    try {
        const text = await request.text();
        if (!text) return null;
        return JSON.parse(text);
    } catch {
        return null;
    }
}

// Contentful sends field values keyed by locale. A webhook transformation can send a plain
// value instead, so handle both shapes.
function readField(field: any): string | null {
    if (field === null || field === undefined) return null;
    if (typeof field === "string") return field;
    return field[DEFAULT_LOCALE] ?? null;
}
