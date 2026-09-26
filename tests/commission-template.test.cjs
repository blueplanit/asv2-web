const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");
const {
    loadTypeScriptModule,
} = require("./helpers/load-typescript-module.cjs");

const root = path.resolve(__dirname, "..");
const jsx = { jsx: ts.JsxEmit.ReactJSX };
const runtime = require("react/jsx-runtime");
const image = (props) => {
    const forwarded = { ...props };
    delete forwarded.unoptimized;
    return React.createElement("img", forwarded);
};
const { CommissionWorkbookPreview } = loadTypeScriptModule(
    path.join(root, "components/marketing/commission-workbook-preview.tsx"),
    { react: React, "react/jsx-runtime": runtime, "next/image": image },
    jsx,
);
const page = loadTypeScriptModule(
    path.join(
        root,
        "app/(marketing)/use-cases/stripe-commission-revenue-share/page.tsx",
    ),
    {
        "react/jsx-runtime": runtime,
        "next/link": ({ children, ...props }) =>
            React.createElement("a", props, children),
        "@/components/marketing/commission-workbook-preview": {
            CommissionWorkbookPreview,
        },
        "@/components/marketing/mailerlite-commission-form": {
            MailerLiteCommissionForm: () =>
                React.createElement("form", {
                    "data-existing-delivery-form": true,
                }),
        },
    },
    jsx,
);
const html = renderToStaticMarkup(React.createElement(page.default));

test("retains canonical route and template-specific search metadata", () => {
    assert.equal(
        page.metadata.alternates.canonical,
        "/use-cases/stripe-commission-revenue-share",
    );
    assert.match(page.metadata.title, /Free Stripe Commission/);
    assert.match(
        page.metadata.description,
        /owner rates, fee and refund settings/,
    );
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
});

test("primary offer links to the existing delivery form, separate from paid trial", () => {
    assert.match(html, /href="#get-template"[^>]*>Email me the free template/);
    assert.match(html, /id="get-template"/);
    assert.match(html, /data-existing-delivery-form="true"/);
    assert.match(html, /No SyncStaq subscription required/);
    assert.match(html, /href="\/login"[^>]*>Start a 14-day free trial/);
});

test("FAQ schema exactly matches the six rendered educational answers", () => {
    const schema = JSON.parse(
        html.match(
            /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
        )[1],
    );
    assert.equal(schema["@type"], "FAQPage");
    assert.equal(schema.mainEntity.length, 6);
    const decode = (value) =>
        value.replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
    const summaries = [
        ...html.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/g),
    ].map((match) => decode(match[1]));
    for (const item of schema.mainEntity) {
        assert.ok(summaries.includes(item.name));
        assert.ok(decode(html).includes(item.acceptedAnswer.text));
    }
});

test("actual JPEG assets and accessible tab/panel relationships are present", () => {
    for (const [id, file, selected] of [
        ["summary", "payout-summary.jpg", true],
        ["owners", "owners-rates.jpg", false],
        ["settings", "settings.jpg", false],
    ]) {
        const asset = fs.readFileSync(
            path.join(root, "public/templates/commission-tracker", file),
        );
        assert.equal(asset.subarray(0, 3).toString("hex"), "ffd8ff");
        assert.match(
            html,
            new RegExp(
                `id="workbook-tab-${id}" role="tab" aria-selected="${selected}" aria-controls="workbook-panel-${id}"`,
            ),
        );
        assert.match(
            html,
            new RegExp(
                `id="workbook-panel-${id}" role="tabpanel" aria-labelledby="workbook-tab-${id}"`,
            ),
        );
    }
    assert.equal(
        (html.match(/role="tabpanel"[^>]* hidden=""/g) || []).length,
        2,
    );
});

test("worked example has bold semantic headers and accurately scoped limitations", () => {
    assert.equal((html.match(/<th scope="col"/g) || []).length, 7);
    assert.match(html, /\$27\.28/);
    assert.match(html, /\$4\.09/);
    assert.match(html, /does not send money/);
    assert.match(
        html,
        /Effective-date and refund-policy labels are not automatic rules/,
    );
});

test("workbook tabs support clicks, wrapping arrow keys, and Home/End focus", () => {
    let selected = 0;
    let focused = -1;
    const refs = { current: [] };
    const preview = loadTypeScriptModule(
        path.join(root, "components/marketing/commission-workbook-preview.tsx"),
        {
            react: {
                useState: () => [
                    selected,
                    (next) => {
                        selected = next;
                    },
                ],
                useRef: () => refs,
            },
            "react/jsx-runtime": runtime,
            "next/image": image,
        },
        jsx,
    );
    function tabsFromTree() {
        const tabs = [];
        function walk(node) {
            if (!React.isValidElement(node)) return;
            if (node.props.role === "tab") tabs.push(node);
            React.Children.forEach(node.props.children, walk);
        }
        walk(preview.CommissionWorkbookPreview());
        tabs.forEach((tab, index) =>
            tab.props.ref({
                focus: () => {
                    focused = index;
                },
            }),
        );
        return tabs;
    }
    let tabs = tabsFromTree();
    tabs[1].props.onClick();
    assert.equal(selected, 1);
    tabs = tabsFromTree();
    assert.equal(tabs[1].props["aria-selected"], true);
    assert.equal(tabs[1].props.tabIndex, 0);
    const keys = [
        [1, "End", 2],
        [2, "ArrowRight", 0],
        [0, "ArrowLeft", 2],
        [2, "Home", 0],
    ];
    for (const [index, key, expected] of keys) {
        let prevented = false;
        tabsFromTree()[index].props.onKeyDown({
            key,
            preventDefault: () => {
                prevented = true;
            },
        });
        assert.equal(selected, expected);
        assert.equal(focused, expected);
        assert.equal(prevented, true);
    }
});
