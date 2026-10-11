import { BLOCKS, type Document, type Block, type Inline, type Text } from "@contentful/rich-text-types";

export type ReportingOutcome = {
    originPath: string;
    destinationPath: string;
    placement: string;
    outcome: string;
    heading: string;
    after: "table" | "section";
    lead: string;
    label: string;
    note: string;
};

export const REPORTING_OUTCOME_VERSION = "reporting-outcomes-v1";

export const reportingOutcomes: Record<string, ReportingOutcome> = {
    "stripe-revenue-by-product": {
        originPath: "/blog/stripe-revenue-by-product",
        destinationPath: "/templates/stripe-revenue-by-product",
        placement: "worked-product-table",
        outcome: "billed-revenue-by-product",
        heading: "Step 5: Produce a stable, repeatable table",
        after: "table",
        lead: "Try the ",
        label: "Revenue by Product template",
        note: " for billed revenue by product and finalized invoice month. It does not automatically allocate refunds or credits.",
    },
    "stripe-sales-commissions": {
        originPath: "/blog/stripe-sales-commissions",
        destinationPath: "/use-cases/stripe-commission-revenue-share",
        placement: "worked-commission-table",
        outcome: "commission-report",
        heading: "Step 5: Produce an auditable commission table",
        after: "table",
        lead: "Apply a charge-based policy in the ",
        label: "commission and revenue-share workbook",
        note: ". Set owner rates and fee/refund deductions; review differences from invoice-line or recognized-revenue policies before using it.",
    },
    "stripe-partner-revenue-share": {
        originPath: "/blog/stripe-partner-revenue-share",
        destinationPath: "/use-cases/stripe-commission-revenue-share",
        placement: "worked-partner-table",
        outcome: "partner-revenue-share",
        heading: "A worked example",
        after: "table",
        lead: "Use the ",
        label: "commission and revenue-share workbook",
        note: " to map owners, set share rates, and choose fee/refund deductions. It does not maintain a clawback ledger.",
    },
    "stripe-refund-reporting-google-sheets": {
        originPath: "/blog/stripe-refund-reporting-google-sheets",
        destinationPath: "/templates/stripe-fees-and-refunds",
        placement: "refunds-alongside-fees",
        outcome: "fees-and-refunds",
        heading: "Refunds alongside fees",
        after: "section",
        lead: "See the ",
        label: "Fees and Refunds template",
        note: " for cumulative refunds and charge fees by original charge month, not by refund date.",
    },
};

function nodeText(node: Block | Inline | Text): string {
    return node.nodeType === "text" ? node.value : node.content.map(nodeText).join("");
}

function alreadyLinked(node: Block | Inline | Text, path: string): boolean {
    if (node.nodeType === "hyperlink") {
        try {
            const url = new URL(node.data.uri, "https://www.syncstaq.com");
            if (["www.syncstaq.com", "syncstaq.com"].includes(url.hostname) && url.pathname.replace(/\/$/, "") === path) return true;
        } catch { /* Ignore malformed CMS links; rendering remains unchanged. */ }
    }
    return node.nodeType !== "text" && node.content.some(child => alreadyLinked(child, path));
}

// Missing/moved headings skip the insertion instead of appending an unrelated CTA.
export function getReportingOutcomePlacement(body: Document, slug: string, language: string) {
    if (language !== "en" || !Object.hasOwn(reportingOutcomes, slug)) return null;
    const outcome = reportingOutcomes[slug];
    if (alreadyLinked(body, outcome.destinationPath)) return null;
    const headingIndex = body.content.findIndex(node =>
        node.nodeType.startsWith("heading-") && nodeText(node).trim() === outcome.heading,
    );
    if (headingIndex < 0) return null;
    const headingLevel = Number(body.content[headingIndex].nodeType.slice(-1));
    let sectionEnd = body.content.findIndex((node, index) =>
        index > headingIndex && node.nodeType.startsWith("heading-") && Number(node.nodeType.slice(-1)) <= headingLevel,
    );
    if (sectionEnd < 0) sectionEnd = body.content.length;
    const afterIndex = outcome.after === "table"
        ? body.content.findIndex((node, index) => index > headingIndex && index < sectionEnd && node.nodeType === BLOCKS.TABLE)
        : sectionEnd - 1;
    return afterIndex > headingIndex ? { afterIndex, outcome } : null;
}
