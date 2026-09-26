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
const page = loadTypeScriptModule(path.join(root, "app/(marketing)/sample-sheet/page.tsx"), {
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

test("preserves metadata and uses the approved heading and introduction", () => {
    assert.equal(page.metadata.alternates.canonical, "/sample-sheet");
    assert.equal(page.metadata.title, "Sample Sheet: Stripe Data in Google Sheets | SyncStaq");
    assert.match(page.metadata.description, /Explore a public sample Google Sheet/);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, />SyncStaq Sample Sheet<\/h1>/);
    assert.match(html, /Explore the Stripe data tabs and reporting examples in a public Google Sheet\./);
    assert.match(html, /View-only example data\. No Stripe connection required\./);
});

test("embeds the correct public workbook with full-Sheet fallback links", () => {
    const workbook = "https://docs.google.com/spreadsheets/d/1f4A9fwCsRk8Hsu_OJ2NjwfbfAmup6BQFuvDpDwmc7ZE";
    assert.equal((html.match(/target="_blank" rel="noopener noreferrer"/g) || []).length, 2);
    assert.equal((html.match(/\/view\?usp=sharing/g) || []).length, 2);
    assert.ok(html.includes(`src="${workbook}/preview"`));
    assert.match(html, /title="SyncStaq public sample Google Sheet"/);
    assert.match(html, /hidden h-\[480px\] w-full border-0 min-\[701px\]:block/);
});

test("mobile preview is scrollable, labeled, and backed by an existing image", () => {
    assert.match(html, /tabindex="0" role="region" aria-label="Sample Charges data preview"/);
    assert.match(html, /max-h-80 overflow-auto/);
    assert.match(html, /min-\[701px\]:hidden/);
    assert.match(html, /width="1280" height="720"/);
    assert.match(html, /The sample contains example records, not your Stripe data\./);
    const asset = fs.readFileSync(path.join(root, "public/images/how-it-works/sample-charges.jpg"));
    assert.equal(asset.subarray(0, 3).toString("hex"), "ffd8ff");
});

test("keeps exploration guidance distinct from setup and automatic reporting claims", () => {
    assert.equal((html.match(/<h3\b/g) || []).length, 3);
    assert.match(html, /not reports SyncStaq generates for you/);
    assert.match(html, /href="\/pricing"/);
    assert.match(html, /href="\/how-it-works"/);
    assert.doesNotMatch(html, /\$48\.2k|\$46\.6k|<table\b|<details\b|six months|hourly/);
});
