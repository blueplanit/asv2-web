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
const config = loadTypeScriptModule(path.join(root, "lib/marketing/fees-and-refunds-template.ts"), {});
const image = (props) => {
    const forwarded = { ...props };
    delete forwarded.unoptimized;
    return React.createElement("img", forwarded);
};
const { FeesWorkbookPreview } = loadTypeScriptModule(path.join(root, "components/marketing/fees-workbook-preview.tsx"), {
    react: React,
    "react/jsx-runtime": runtime,
    "next/image": image,
    "@/lib/marketing/fees-and-refunds-template": config,
}, jsx);
const page = loadTypeScriptModule(path.join(root, "app/(marketing)/templates/stripe-fees-and-refunds/page.tsx"), {
    "react/jsx-runtime": runtime,
    "next/link": ({ children, ...props }) => React.createElement("a", props, children),
    "@/components/marketing/fees-workbook-preview": { FeesWorkbookPreview },
    "@/lib/marketing/seo-metadata": loadTypeScriptModule(path.join(root, "lib/marketing/seo-metadata.ts"), {}),
    "@/lib/marketing/fees-and-refunds-template": config,
}, jsx);
const html = renderToStaticMarkup(React.createElement(page.default));

test("server-rendered offer has canonical metadata and workbook links", () => {
    assert.equal(page.metadata.alternates.canonical, config.FEES_TEMPLATE_PATH);
    assert.match(page.metadata.title, /Stripe Fees and Refunds Google Sheets Template/);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.ok(html.includes(config.FEES_COPY_URL));
    assert.ok(html.includes(config.FEES_VIEW_URL));
    assert.match(html, /href="#setup"[^>]*>Use your data<\/a>/);
    assert.match(html, /href="\/login"[^>]*>Start 14-day free trial/);
    assert.doesNotMatch(html, /noindex|<form\b|real-time sync/);
});

test("copy steps and reporting caveats match the workbook", () => {
    assert.match(html, /Copy to &gt; Existing spreadsheet/);
    assert.match(html, /original charge month, not the month they were issued/);
    assert.match(html, /Totals can change when an older charge is refunded later/);
    assert.match(html, /does not account for disputes, other balance transactions, or payout timing/);
    assert.doesNotMatch(html, /refunds issued during each month|Stripe payout report/);
});

test("FAQ structured data matches visible answers", () => {
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(schema["@type"], "FAQPage");
    assert.equal(schema.mainEntity.length, config.feesTemplateFaqs.length);
    const decode = (text) => text.replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
    for (const item of schema.mainEntity) {
        assert.ok(decode(html).includes(item.name));
        assert.ok(decode(html).includes(item.acceptedAnswer.text));
    }
});

test("preview has all three assets and accessible tab-panel pairs", () => {
    for (const [id, file, selected] of [
        ["monthly", "monthly-overview.jpg", true],
        ["charts", "charts.jpg", false],
        ["refunds", "refunded-charges.jpg", false],
    ]) {
        const asset = fs.readFileSync(path.join(root, "public/templates/fees-and-refunds", file));
        assert.equal(asset.subarray(0, 3).toString("hex"), "ffd8ff");
        assert.match(html, new RegExp(`id="fees-tab-${id}" role="tab" aria-controls="fees-panel-${id}" aria-selected="${selected}"`));
        assert.match(html, new RegExp(`id="fees-panel-${id}" role="tabpanel" aria-labelledby="fees-tab-${id}"`));
    }
    assert.match(html, /Enlarge preview/);
});

test("page is linked in the sitemap and shared footer", () => {
    for (const file of ["app/sitemap.ts", "components/layout/site-footer.tsx"]) {
        assert.ok(fs.readFileSync(path.join(root, file), "utf8").includes(config.FEES_TEMPLATE_PATH));
    }
});

test("preview click and keyboard navigation update tabs and enlargement target", () => {
    let selected = 0;
    let focused = null;
    const refs = { current: [] };
    const preview = loadTypeScriptModule(path.join(root, "components/marketing/fees-workbook-preview.tsx"), {
        react: {
            useState: () => [selected, (next) => { selected = next; }],
            useRef: () => refs,
        },
        "react/jsx-runtime": runtime,
        "next/image": image,
        "@/lib/marketing/fees-and-refunds-template": config,
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
        walk(preview.FeesWorkbookPreview());
        tabs.forEach((tab, index) => tab.props.ref({ focus: () => { focused = index; } }));
        return { tabs, enlarge };
    }
    tree().tabs[1].props.onClick();
    assert.equal(selected, 1);
    assert.match(tree().enlarge.props.href, /charts\.jpg$/);
    tree().tabs[2].props.onClick();
    assert.match(tree().enlarge.props.href, /refunded-charges\.jpg$/);
    for (const [index, key, expected] of [[2, "ArrowRight", 0], [0, "ArrowLeft", 2], [2, "Home", 0], [0, "End", 2]]) {
        let prevented = false;
        tree().tabs[index].props.onKeyDown({ key, preventDefault: () => { prevented = true; } });
        assert.equal(selected, expected);
        assert.equal(focused, expected);
        assert.equal(prevented, true);
        assert.equal(tree().tabs[expected].props.tabIndex, 0);
    }
});
