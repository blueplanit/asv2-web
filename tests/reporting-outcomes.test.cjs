/* eslint-disable @typescript-eslint/no-require-imports -- Node tests are CommonJS. */
const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const { loadTypeScriptModule } = require("./helpers/load-typescript-module.cjs");
const { readFileSync } = require("node:fs");
const root = path.join(__dirname, "..");
const { getRefundExampleState } = loadTypeScriptModule(path.join(root, "lib/marketing/retroactive-refund-example.ts"), {});
const ts = require("typescript");
test("blog copy is rendered directly from Contentful without editorial injection", () => {
    const source = readFileSync(path.join(root, "components/blog/blog-post-article.tsx"), "utf8");
    assert.ok(source.includes("documentToReactComponents(bodyDoc, contentfulRichTextOptions)"));
    assert.ok(!source.includes("getReportingOutcomePlacement"));
    assert.ok(!source.includes("ReportingOutcomeLink"));
    assert.ok(!source.includes("bodyDoc.content.slice"));
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
    const outcome = { originPath: "/sample-sheet", destinationPath: "/templates/stripe-fees-and-refunds", placement: "retroactive-refund-example", outcome: "fees-and-refunds" };
    const link = ReportingOutcomeLink({ ...outcome, children: "Explore the Fees and Refunds template" });
    assert.equal(link.props.href, outcome.destinationPath);
    assert.equal(link.props.onClick(), undefined);
    const [event, properties] = captured.at(-1);
    assert.equal(event, "Reporting Outcome Clicked");
    assert.deepEqual(properties, {
        origin_path: outcome.originPath, destination_path: outcome.destinationPath,
        placement: outcome.placement, outcome: outcome.outcome, experiment_version: "reporting-outcomes-v1",
    });
    assert.ok(Object.values(properties).every(value => !value.includes("?") && !value.includes("@")));
});
