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
const page = loadTypeScriptModule(path.join(root, "app/(marketing)/stripe-csv-export-alternative/page.tsx"), {
    "react/jsx-runtime": require("react/jsx-runtime"),
    "next/link": ({ children, ...props }) => React.createElement("a", props, children),
    "next/image": (props) => {
        const forwarded = { ...props };
        delete forwarded.unoptimized;
        return React.createElement("img", forwarded);
    },
    "@/lib/marketing/seo-metadata": metadata,
}, { jsx: ts.JsxEmit.ReactJSX });
const html = renderToStaticMarkup(React.createElement(page.default));

test("preserves SEO metadata and renders the approved category heading", () => {
    assert.equal(page.metadata.alternates.canonical, "/stripe-csv-export-alternative");
    assert.equal(page.metadata.title, "Stripe CSV Export Alternative | SyncStaq");
    assert.match(page.metadata.description, /recurring Google Sheets reporting/);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, />Stripe CSV export alternative<\/h1>/);
});

test("comparison has bold semantic headers and six workflow rows", () => {
    assert.equal((html.match(/<th scope="col"/g) || []).length, 3);
    assert.equal((html.match(/<th scope="row"/g) || []).length, 6);
    assert.equal((html.match(/align-top font-bold/g) || []).length, 6);
    assert.match(html, /tabindex="0" role="region" aria-label="CSV exports compared with SyncStaq"/);
    assert.match(html, /min-w-\[710px\]/);
    assert.match(html, /href="#comparison"/);
    assert.match(html, /id="comparison"/);
});

test("CSV guide appears once below the hero; educational links and trial destination are retained", () => {
    assert.equal((html.match(/href="\/blog\/stripe-export-data-csv"/g) || []).length, 1);
    const hero = html.slice(0, html.indexOf("</section>"));
    assert.doesNotMatch(hero, /stripe-export-data-csv|Need a one-time export/);
    for (const slug of ["stripe-fees-report-google-sheets", "stripe-payout-reconciliation-google-sheets", "stripe-refund-reporting-google-sheets"]) {
        assert.ok(html.includes(`href="/blog/${slug}"`));
    }
    assert.match(html, /href="\/how-it-works"/);
    assert.equal((html.match(/href="\/pricing"/g) || []).length, 2);
    assert.equal((html.match(/href="\/sample-sheet"/g) || []).length, 2);
});

test("explains product boundaries and snapshot tradeoffs without inventing reports", () => {
    assert.match(html, /save a separate snapshot/);
    assert.match(html, /not an accounting system or an automatic report generator/);
    assert.match(html, /You still own the analysis/);
    assert.match(html, /six months of billing history/);
    assert.doesNotMatch(html, /real-time|marketplace|<ol\b/);
});

test("sample proof uses the existing public asset in a focusable scroll region", () => {
    assert.match(html, /tabindex="0" role="region" aria-label="Public example of synced Stripe records"/);
    assert.match(html, /max-h-\[230px\] overflow-auto/);
    assert.match(html, /width="1280" height="720"/);
    assert.match(html, /Public Sample Sheet with example data, not a connected customer account/);
    const asset = fs.readFileSync(path.join(root, "public/images/how-it-works/sample-charges.jpg"));
    assert.equal(asset.subarray(0, 3).toString("hex"), "ffd8ff");
});
