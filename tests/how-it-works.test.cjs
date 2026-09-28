const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");
const { loadTypeScriptModule } = require("./helpers/load-typescript-module.cjs");

const root = path.resolve(__dirname, "..");
const metadata = loadTypeScriptModule(path.join(root, "lib/marketing/seo-metadata.ts"), {});
const page = loadTypeScriptModule(
    path.join(root, "app/(marketing)/how-it-works/page.tsx"),
    {
        "react/jsx-runtime": require("react/jsx-runtime"),
        "next/link": ({ children, ...props }) => React.createElement("a", props, children),
        "next/image": (props) => {
            const forwarded = { ...props };
            delete forwarded.unoptimized;
            return React.createElement("img", forwarded);
        },
        "@/lib/marketing/seo-metadata": metadata,
    },
    { jsx: ts.JsxEmit.ReactJSX },
);
const html = renderToStaticMarkup(React.createElement(page.default));

test("keeps the canonical route and renders one descriptive H1", () => {
    assert.equal(page.metadata.alternates.canonical, "/how-it-works");
    assert.match(page.metadata.title, /Stripe Data in Google Sheets/);
    assert.match(page.metadata.description, /six months.*hourly/);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.doesNotMatch(JSON.stringify(page.metadata), /noindex/);
});

test("setup steps use approved labels without redundant notes", () => {
    assert.match(html, /<ol\b/);
    for (const number of [1, 2, 3]) assert.ok(html.includes(`${number})</div>`));
    assert.match(html, /Connect your accounts\. SyncStaq creates your Sheet and keeps Stripe data updated\./);
    for (const removed of [
        "Your Stripe records stay unchanged.",
        "Use a Sheet created through SyncStaq.",
        "Scheduled updates, not real-time sync.",
    ]) assert.ok(!html.includes(removed));
});

test("uses the approved public sample asset and corrected caption", () => {
    assert.match(html, /1f4A9fwCsRk8Hsu_OJ2NjwfbfAmup6BQFuvDpDwmc7ZE\/view/);
    assert.match(html, /rel="noopener noreferrer"/);
    assert.match(html, /Public Sample Sheet with example data/);
    assert.doesNotMatch(html, /Actual public/);
    const asset = fs.readFileSync(path.join(root, "public/images/how-it-works/sample-charges.jpg"));
    assert.equal(asset.subarray(0, 3).toString("hex"), "ffd8ff");
    assert.match(html, /width="1280" height="720"/);
});

test("data table has bold semantic headers, six rows, and a focusable scroll region", () => {
    assert.equal((html.match(/<th scope="col"/g) || []).length, 3);
    assert.equal((html.match(/<th scope="row"/g) || []).length, 6);
    assert.match(html, /role="region" aria-label="Included Stripe data"/);
    assert.match(html, /overflow-x-auto/);
    assert.match(html, /min-\[701px\]:border-l/);
    assert.match(html, /min-\[701px\]:border-t-0/);
});

test("preserves trial destination and adds useful reporting and sample links", () => {
    assert.equal((html.match(/href="\/pricing"/g) || []).length, 2);
    assert.match(html, /href="#your-sheet"/);
    assert.match(html, /id="your-sheet"/);
    for (const href of [
        "/sample-sheet",
        "/stripe-google-sheets-integration",
        "/blog/stripe-revenue-by-product",
        "/blog/stripe-payout-reconciliation-google-sheets",
        "/use-cases/stripe-commission-revenue-share",
    ]) assert.ok(html.includes(`href="${href}"`));
});

test("six native FAQs retain factual limits without hiding content behind client rendering", () => {
    assert.equal((html.match(/<details\b/g) || []).length, 6);
    assert.equal((html.match(/<details[^>]* open=""/g) || []).length, 1);
    assert.match(html, /not a real-time stream/);
    assert.match(html, /does not replace your accounting system/);
    assert.match(html, /Stripe events together with object retrieval/);
});
