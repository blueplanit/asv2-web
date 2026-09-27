const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");
const { loadTypeScriptModule } = require("./helpers/load-typescript-module.cjs");

const root = path.resolve(__dirname, "..");
const jsx = { jsx: ts.JsxEmit.ReactJSX };
const runtime = require("react/jsx-runtime");
const config = loadTypeScriptModule(path.join(root, "lib/marketing/revenue-by-product-template.ts"), {});
const { RevenueWorkbookPreview } = loadTypeScriptModule(path.join(root, "components/marketing/revenue-workbook-preview.tsx"), {
    react: React,
    "react/jsx-runtime": runtime,
    "next/image": (props) => {
        const forwarded = { ...props };
        delete forwarded.unoptimized;
        return React.createElement("img", forwarded);
    },
    "@/lib/marketing/revenue-by-product-template": config,
}, jsx);
const page = loadTypeScriptModule(path.join(root, "app/(marketing)/templates/stripe-revenue-by-product/page.tsx"), {
    "react/jsx-runtime": runtime,
    "next/link": ({ children, ...props }) => React.createElement("a", props, children),
    "@/components/marketing/revenue-workbook-preview": { RevenueWorkbookPreview },
    "@/lib/marketing/seo-metadata": loadTypeScriptModule(path.join(root, "lib/marketing/seo-metadata.ts"), {}),
    "@/lib/marketing/revenue-by-product-template": config,
}, jsx);
const html = renderToStaticMarkup(React.createElement(page.default));

test("approved offer is server rendered with canonical metadata and native copy links", () => {
    assert.equal(page.metadata.alternates.canonical, "/templates/stripe-revenue-by-product");
    assert.match(page.metadata.title, /Stripe Revenue by Product Google Sheets Template/);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, /Compare monthly billed revenue by product/);
    assert.match(html, /href="#setup"[^>]*>Use your data<\/a>/);
    assert.ok(html.includes(config.REVENUE_COPY_URL));
    assert.ok(html.includes(config.REVENUE_VIEW_URL));
    assert.doesNotMatch(html, /One reporting tab\. Three ways|Free template\. Example data included|Copy the entire tab|Use your own data|noindex|<form\b/);
    assert.match(html, /href="\/login"[^>]*>Start a 14-day free trial/);
});

test("setup preserves source tabs and renames only the copied reporting tab", () => {
    assert.match(html, /id="setup"/);
    assert.equal((html.match(/<li\b/g) || []).length, 4);
    assert.match(html, /Copy to &gt; Existing spreadsheet/);
    assert.match(html, /Copy of Working Sheet/);
    assert.match(html, /Leave your original Working Sheet and synced data tabs unchanged/);
    assert.doesNotMatch(html, /IMPORTRANGE|Paste your API key/);
});

test("FAQ JSON-LD uses exactly the visible educational answers", () => {
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(schema["@type"], "FAQPage");
    assert.equal(schema.mainEntity.length, config.revenueTemplateFaqs.length);
    const decode = (text) => text.replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
    const summaries = [...html.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/g)].map((match) => decode(match[1]));
    for (const item of schema.mainEntity) {
        assert.ok(summaries.includes(item.name));
        assert.ok(decode(html).includes(item.acceptedAnswer.text));
    }
    assert.match(html, /refunds and credits are not automatically allocated/);
    assert.match(html, /not cash collected, recognized revenue, or MRR/);
    assert.doesNotMatch(html, /<details open=""[^>]*><summary[^>]*>What counts/);
});

test("preview assets and accessible tab-panel pairs are present", () => {
    for (const [id, file, selected] of [
        ["monthly", "monthly-product-table.jpg", true],
        ["trend", "revenue-chart.jpg", false],
        ["product", "monthly-breakdown.jpg", false],
    ]) {
        const asset = fs.readFileSync(path.join(root, "public/templates/revenue-by-product", file));
        assert.equal(asset.subarray(0, 3).toString("hex"), "ffd8ff");
        assert.match(html, new RegExp(`id="revenue-tab-${id}" role="tab" aria-controls="revenue-panel-${id}" aria-selected="${selected}"`));
        assert.match(html, new RegExp(`id="revenue-panel-${id}" role="tabpanel" aria-labelledby="revenue-tab-${id}"`));
    }
    assert.match(html, /Enlarge preview/);
    assert.match(html, /Preview shown with example data/);
});

test("page is discoverable through the sitemap and shared footer", () => {
    for (const file of ["app/sitemap.ts", "components/layout/site-footer.tsx"]) {
        assert.ok(fs.readFileSync(path.join(root, file), "utf8").includes(config.REVENUE_TEMPLATE_PATH));
    }
});

test("preview clicks and keyboard navigation update selection, focus, and enlargement target", () => {
    let selected = 0;
    let focused = null;
    const refs = { current: [] };
    const preview = loadTypeScriptModule(path.join(root, "components/marketing/revenue-workbook-preview.tsx"), {
        react: {
            useState: () => [selected, (next) => { selected = next; }],
            useRef: () => refs,
        },
        "react/jsx-runtime": runtime,
        "next/image": (props) => React.createElement("img", props),
        "@/lib/marketing/revenue-by-product-template": config,
    }, jsx);
    function tree() {
        const tabs = [];
        let enlarge;
        function walk(node) {
            if (!React.isValidElement(node)) return;
            if (node.props.role === "tab") tabs.push(node);
            if (node.type === "a" && node.props.children === "Enlarge preview") enlarge = node;
            React.Children.forEach(node.props.children, walk);
        }
        walk(preview.RevenueWorkbookPreview());
        tabs.forEach((tab, index) => tab.props.ref({ focus: () => { focused = index; } }));
        return { tabs, enlarge };
    }
    tree().tabs[1].props.onClick();
    assert.equal(selected, 1);
    assert.match(tree().enlarge.props.href, /revenue-chart\.jpg$/);
    tree().tabs[2].props.onClick();
    assert.match(tree().enlarge.props.href, /monthly-breakdown\.jpg$/);
    for (const [index, key, expected] of [[2, "ArrowRight", 0], [0, "ArrowLeft", 2], [2, "Home", 0], [0, "End", 2]]) {
        let prevented = false;
        tree().tabs[index].props.onKeyDown({ key, preventDefault: () => { prevented = true; } });
        assert.equal(selected, expected);
        assert.equal(focused, expected);
        assert.equal(prevented, true);
        assert.equal(tree().tabs[expected].props.tabIndex, 0);
    }
});
