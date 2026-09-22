const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { loadTypeScriptModule } = require("./helpers/load-typescript-module.cjs");

const modulePath = path.join(__dirname, "../lib/contentful/content-routes.ts");
const routePath = path.join(__dirname, "../app/api/revalidate/route.ts");

class MockNextResponse extends Response {
    static json(body, init) {
        return new MockNextResponse(JSON.stringify(body), {
            ...init,
            headers: { "content-type": "application/json", ...init?.headers },
        });
    }
}

function loadContentRoutes() {
    return loadTypeScriptModule(modulePath, {});
}

function loadRevalidationRoute(tagCalls, pathCalls) {
    return loadTypeScriptModule(routePath, {
        crypto: require("node:crypto"),
        "next/cache": {
            revalidateTag: (...args) => tagCalls.push(args),
            revalidatePath: (...args) => pathCalls.push(args),
        },
        "next/server": { NextResponse: MockNextResponse },
        "@/lib/contentful/contentful": {
            getEntryById: async () => ({
                sys: { updatedAt: "2026-09-21T12:00:00.000Z" },
            }),
        },
        "@/lib/contentful/content-routes": loadContentRoutes(),
    }).POST;
}

function blogPublishRequest() {
    return new Request("https://www.syncstaq.com/api/revalidate", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-contentful-topic": "ContentManagement.Entry.publish",
            "x-revalidate-secret": "test-secret",
        },
        body: JSON.stringify({
            sys: {
                id: "entry-123",
                updatedAt: "2026-09-21T12:00:00.000Z",
                contentType: { sys: { id: "blogPostASv2" } },
            },
            fields: { slug: { "en-US": "new-post" } },
        }),
    });
}

test("a blog publish expires the listing, sitemap, and localized post routes", () => {
    const { CONTENT_TYPES, contentPaths } = loadContentRoutes();

    assert.deepEqual(contentPaths(CONTENT_TYPES.BLOG_POST, "new-post", null), [
        "/blog",
        "/sitemap.xml",
        "/blog/new-post",
        "/es/blog/new-post",
    ]);
});

test("a blog tombstone still expires the listing and sitemap without a slug", () => {
    const { CONTENT_TYPES, contentPaths } = loadContentRoutes();

    assert.deepEqual(contentPaths(CONTENT_TYPES.BLOG_POST, null, null), [
        "/blog",
        "/sitemap.xml",
    ]);
});

test("the webhook sends every affected blog path to Next revalidation", async () => {
    const tagCalls = [];
    const pathCalls = [];
    const previousSecret = process.env.CONTENTFUL_WEBHOOK_SECRET;
    process.env.CONTENTFUL_WEBHOOK_SECRET = "test-secret";

    try {
        const POST = loadRevalidationRoute(tagCalls, pathCalls);
        const response = await POST(blogPublishRequest());
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.deepEqual(pathCalls, [
            ["/blog"],
            ["/sitemap.xml"],
            ["/blog/new-post"],
            ["/es/blog/new-post"],
        ]);
        assert.deepEqual(body.paths, pathCalls.map(([pathValue]) => pathValue));
        assert.equal(tagCalls.length, 2);
    } finally {
        if (previousSecret === undefined) delete process.env.CONTENTFUL_WEBHOOK_SECRET;
        else process.env.CONTENTFUL_WEBHOOK_SECRET = previousSecret;
    }
});
