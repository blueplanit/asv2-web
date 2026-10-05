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
const config = loadTypeScriptModule(path.join(root, "lib/marketing/customer-revenue-template.ts"), {});
const image = (props) => {
    const forwarded = { ...props };
    delete forwarded.unoptimized;
    return React.createElement("img", forwarded);
};
const { CustomerRevenueWorkbookPreview } = loadTypeScriptModule(path.join(root, "components/marketing/customer-revenue-workbook-preview.tsx"), {
    react: React,
    "react/jsx-runtime": runtime,
    "next/image": image,
    "@/lib/marketing/customer-revenue-template": config,
}, jsx);
const page = loadTypeScriptModule(path.join(root, "app/(marketing)/templates/stripe-customer-revenue/page.tsx"), {
    "react/jsx-runtime": runtime,
    "next/link": ({ children, ...props }) => React.createElement("a", props, children),
    "@/components/marketing/customer-revenue-workbook-preview": { CustomerRevenueWorkbookPreview },
    "@/lib/marketing/seo-metadata": loadTypeScriptModule(path.join(root, "lib/marketing/seo-metadata.ts"), {}),
    "@/lib/marketing/customer-revenue-template": config,
}, jsx);
const html = renderToStaticMarkup(React.createElement(page.default));

test("page has canonical metadata and workbook actions", () => {
    assert.equal(page.metadata.alternates.canonical, config.CUSTOMER_REVENUE_TEMPLATE_PATH);
    assert.match(page.metadata.title, /Stripe Customer Revenue Google Sheets Template/);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.ok(html.includes(config.CUSTOMER_REVENUE_COPY_URL));
    assert.ok(html.includes(config.CUSTOMER_REVENUE_VIEW_URL));
    assert.match(html, /href="#setup"[^>]*>Use your data<\/a>/);
    assert.match(html, /href="\/login"[^>]*>Start 14-day free trial/);
    assert.doesNotMatch(html, /noindex|<form\b|cash collected is billed revenue/);
});

test("setup and reporting basis match the workbook", () => {
    assert.match(html, /Copy to &gt; Existing spreadsheet/);
    assert.match(html, /finalized invoice subtotal less discounts/);
    assert.match(html, /not cash collected or revenue recognized/);
    assert.match(html, /monthly chart and invoice list update for that customer/);
});

test("FAQ structured data matches visible answers", () => {
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(schema["@type"], "FAQPage");
    assert.equal(schema.mainEntity.length, config.customerRevenueTemplateFaqs.length);
    const decode = (text) => text.replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
    for (const item of schema.mainEntity) {
        assert.ok(decode(html).includes(item.name));
        assert.ok(decode(html).includes(item.acceptedAnswer.text));
    }
});

test("both cropped screenshots and accessible tabs are present", () => {
    for (const [id, file, selected] of [
        ["ranking", "customer-ranking.jpg", true],
        ["monthly", "monthly-customer.jpg", false],
    ]) {
        const asset = fs.readFileSync(path.join(root, "public/templates/customer-revenue", file));
        assert.equal(asset.subarray(0, 3).toString("hex"), "ffd8ff");
        assert.match(html, new RegExp(`id="customer-revenue-tab-${id}" role="tab" aria-controls="customer-revenue-panel-${id}" aria-selected="${selected}"`));
        assert.match(html, new RegExp(`id="customer-revenue-panel-${id}" role="tabpanel" aria-labelledby="customer-revenue-tab-${id}"`));
    }
    assert.match(html, /Enlarge preview/);
});

test("page is discoverable from the sitemap and footer", () => {
    for (const file of ["app/sitemap.ts", "components/layout/site-footer.tsx"]) {
        assert.ok(fs.readFileSync(path.join(root, file), "utf8").includes(config.CUSTOMER_REVENUE_TEMPLATE_PATH));
    }
});

test("click and keyboard navigation update tabs and enlargement target", () => {
    let selected = 0;
    let focused = null;
    const refs = { current: [] };
    const preview = loadTypeScriptModule(path.join(root, "components/marketing/customer-revenue-workbook-preview.tsx"), {
        react: {
            useState: () => [selected, (next) => { selected = next; }],
            useRef: () => refs,
        },
        "react/jsx-runtime": runtime,
        "next/image": image,
        "@/lib/marketing/customer-revenue-template": config,
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
        walk(preview.CustomerRevenueWorkbookPreview());
        tabs.forEach((tab, index) => tab.props.ref({ focus: () => { focused = index; } }));
        return { tabs, enlarge };
    }
    tree().tabs[1].props.onClick();
    assert.equal(selected, 1);
    assert.match(tree().enlarge.props.href, /monthly-customer\.jpg$/);
    for (const [index, key, expected] of [[1, "ArrowRight", 0], [0, "ArrowLeft", 1], [1, "Home", 0], [0, "End", 1]]) {
        let prevented = false;
        tree().tabs[index].props.onKeyDown({ key, preventDefault: () => { prevented = true; } });
        assert.equal(selected, expected);
        assert.equal(focused, expected);
        assert.equal(prevented, true);
        assert.equal(tree().tabs[expected].props.tabIndex, 0);
    }
});
