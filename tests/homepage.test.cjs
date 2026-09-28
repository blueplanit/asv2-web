const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");
const { loadTypeScriptModule } = require("./helpers/load-typescript-module.cjs");

const root = path.resolve(__dirname, "..");
const dependencies = {
    "react/jsx-runtime": require("react/jsx-runtime"),
    "next/link": ({ children, ...props }) => React.createElement("a", props, children),
    "next/image": (props) => {
        const forwarded = { ...props };
        delete forwarded.unoptimized;
        return React.createElement("img", forwarded);
    },
};
const load = (file, mocks) => loadTypeScriptModule(path.join(root, file), mocks, { jsx: ts.JsxEmit.ReactJSX });
const hero = load("components/marketing/hero.tsx", dependencies);
const finalCta = load("components/marketing/final-cta-section.tsx", dependencies);
let copyReads = 0;
const page = load("app/(marketing)/page.tsx", {
    "react/jsx-runtime": dependencies["react/jsx-runtime"],
    "@/components/marketing/hero": hero,
    "@/components/marketing/final-cta-section": finalCta,
    "@/components/marketing/structured-data": { SiteStructuredData: () => null },
    "@/lib/marketing/marketing-config": {
        getMarketingCopy: async () => {
            copyReads += 1;
            return {
                hero: {
                    title: "", title1: "Your Stripe data,", title2: "already in Google Sheets.",
                    subtitle: "Previous CMS subtitle", primaryCtaLabel: "Get started",
                    primaryCtaHref: "/login", highlights: ["CMS highlight one", "CMS highlight two"],
                },
            };
        },
    },
});
const rendered = page.default().then((element) => renderToStaticMarkup(element));

test("preserves canonical, static cache policy, and CMS title read", async () => {
    const html = await rendered;
    assert.equal(page.metadata.alternates.canonical, "/");
    assert.equal(page.dynamic, "force-static");
    assert.equal(page.revalidate, 604800);
    assert.equal(copyReads, 1);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, /Your Stripe data,/);
    assert.match(html, /already in Google Sheets\./);
});

test("renders approved copy and trial links despite older CMS wording", async () => {
    const html = await rendered;
    assert.match(html, /Stop rebuilding reports from CSV exports/);
    assert.doesNotMatch(html, /Previous CMS subtitle/);
    assert.equal((html.match(/href="\/pricing"/g) || []).length, 2);
    assert.equal((html.match(/Start 14-day free trial/g) || []).length, 2);
});

test("renders the hero highlights from the landing Copy Config", async () => {
    const html = await rendered;
    assert.match(html, /CMS highlight one/);
    assert.match(html, /CMS highlight two/);
    assert.doesNotMatch(html, /Six months of history/);
});

test("uses the real sample screenshot in a labeled keyboard-scrollable region", async () => {
    const html = await rendered;
    assert.match(html, /tabindex="0" role="region" aria-label="Example Stripe charge records"/);
    assert.match(html, /max-h-\[300px\] overflow-auto/);
    assert.match(html, /\/images\/how-it-works\/sample-charges.jpg/);
    assert.match(html, /width="1280" height="720"/);
    const image = fs.readFileSync(path.join(root, "public/images/how-it-works/sample-charges.jpg"));
    assert.equal(image.subarray(0, 3).toString("hex"), "ffd8ff");
    assert.match(html, /Public Sample Sheet with example data/);
});

test("keeps short workflow reasons without setup steps or acquisition-channel sections", async () => {
    const html = await rendered;
    assert.equal((html.match(/<h3\b/g) || []).length, 3);
    assert.equal((html.match(/<section\b/g) || []).length, 4);
    assert.match(html, /Recurring revenue reports/);
    assert.match(html, /Fees, refunds, and payout review/);
    assert.match(html, /Your labels and calculations/);
    assert.match(html, /href="\/sample-sheet"/);
    assert.match(html, /href="\/how-it-works"/);
    assert.doesNotMatch(html, /marketplace|Explore the integrations|<ol\b|Connect once|SyncStaq Demo/);
});
