/* eslint-disable @typescript-eslint/no-require-imports -- Node tests are CommonJS. */
const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const { loadTypeScriptModule } = require("./helpers/load-typescript-module.cjs");
const { BLOCKS } = require("@contentful/rich-text-types");
const root = path.join(__dirname, "..");
const { reportingOutcomes, getReportingOutcomePlacement } = loadTypeScriptModule(path.join(root, "lib/marketing/reporting-outcomes.ts"), { "@contentful/rich-text-types": { BLOCKS } });
const { getRefundExampleState } = loadTypeScriptModule(path.join(root, "lib/marketing/retroactive-refund-example.ts"), {});
const ts = require("typescript");
const text = value => ({ nodeType: "text", value, marks: [], data: {} });
const node = (nodeType, value = "") => ({ nodeType, data: {}, content: [text(value)] });
const doc = content => ({ nodeType: "document", data: {}, content });

test("all four articles insert only in the matching worked-example section", () => {
    for (const [slug, cta] of Object.entries(reportingOutcomes)) {
        const body = doc([node("paragraph", "Intro"), node("heading-2", cta.heading), node("paragraph", "Example"), node("table"), node("heading-2", "Next section")]);
        const before = JSON.stringify(body);
        assert.equal(getReportingOutcomePlacement(body, slug, "en").afterIndex, 3);
        assert.equal(JSON.stringify(body), before);
        assert.equal(getReportingOutcomePlacement(body, slug, "es"), null);
    }
});

test("refund CTA follows the fees subsection, not the earlier export table", () => {
    const body = doc([node("table"), node("heading-2", "Analysis"), node("heading-3", "Refunds alongside fees"), node("paragraph", "Fees"), node("heading-3", "Investigations")]);
    assert.equal(getReportingOutcomePlacement(body, "stripe-refund-reporting-google-sheets", "en").afterIndex, 3);
});

test("missing or moved anchors skip rather than inserting elsewhere", () => {
    const body = doc([node("heading-2", "Step 5: Produce a stable, repeatable table"), node("paragraph"), node("heading-2", "Other"), node("table")]);
    assert.equal(getReportingOutcomePlacement(body, "stripe-revenue-by-product", "en"), null);
    assert.equal(getReportingOutcomePlacement(doc([]), "stripe-revenue-by-product", "en"), null);
    assert.equal(getReportingOutcomePlacement(body, "unrelated-article", "en"), null);
    assert.equal(getReportingOutcomePlacement(body, "constructor", "en"), null);
    assert.equal(getReportingOutcomePlacement(body, "__proto__", "en"), null);
});

test("existing contextual destination suppresses duplicates, including www and query variants", () => {
    for (const uri of ["/templates/stripe-revenue-by-product", "https://syncstaq.com/templates/stripe-revenue-by-product/?utm_source=blog", "https://www.syncstaq.com/templates/stripe-revenue-by-product"]) {
        const body = doc([node("heading-2", "Step 5: Produce a stable, repeatable table"), node("table"), { nodeType: "paragraph", data: {}, content: [{ nodeType: "hyperlink", data: { uri }, content: [text("Existing link")] }] }]);
        assert.equal(getReportingOutcomePlacement(body, "stripe-revenue-by-product", "en"), null);
    }
});

test("illustration keeps the Sheet unchanged until the hourly-update step", () => {
    const before = getRefundExampleState(0), pending = getRefundExampleState(1), after = getRefundExampleState(2);
    assert.equal(before.stripeRefundCents, 2000);
    assert.equal(pending.stripeRefundCents, 2500);
    assert.equal(pending.sheetRefundCents, before.sheetRefundCents);
    assert.equal(pending.reportAfterFeesCents, 2728);
    assert.equal(after.sheetRefundCents, 2500);
    assert.equal(after.reportAfterFeesCents, 2228);
    assert.equal(after.annualRefundCents, 11900);
    assert.equal(after.annualAfterFeesCents, 88418);
    assert.equal(after.annualAfterFeesCents - before.annualAfterFeesCents, -500);
});

test("CTA tracking uses only static context and leaves normal link navigation intact", () => {
    const captured = [];
    const { ReportingOutcomeLink } = loadTypeScriptModule(path.join(root, "components/analytics/reporting-outcome-link.tsx"), {
        "react/jsx-runtime": require("react/jsx-runtime"),
        "next/link": () => null,
        "@/lib/analytics/amplitude-client": { trackAmplitudeEvent: (...args) => { captured.push(args); } },
        "@/lib/marketing/reporting-outcomes": { REPORTING_OUTCOME_VERSION: "reporting-outcomes-v1" },
    }, { jsx: ts.JsxEmit.ReactJSX });
    for (const outcome of Object.values(reportingOutcomes)) {
        const link = ReportingOutcomeLink({ ...outcome, children: outcome.label });
        assert.equal(link.props.href, outcome.destinationPath);
        assert.equal(link.props.onClick(), undefined);
        const [event, properties] = captured.at(-1);
        assert.equal(event, "Reporting Outcome Clicked");
        assert.deepEqual(properties, {
            origin_path: outcome.originPath, destination_path: outcome.destinationPath,
            placement: outcome.placement, outcome: outcome.outcome, experiment_version: "reporting-outcomes-v1",
        });
        assert.ok(Object.values(properties).every(value => !value.includes("?") && !value.includes("@")));
    }
});
