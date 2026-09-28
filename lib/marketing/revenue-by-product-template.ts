export const REVENUE_TEMPLATE_PATH = "/templates/stripe-revenue-by-product";
export const REVENUE_WORKBOOK_URL =
    "https://docs.google.com/spreadsheets/d/1EQSqnXHxX2ZVgoGiShQstP6dG6etnDGxiu2p1iaFeEQ";
export const REVENUE_COPY_URL = `${REVENUE_WORKBOOK_URL}/copy`;
export const REVENUE_VIEW_URL = `${REVENUE_WORKBOOK_URL}/edit#gid=400001`;

export const revenueTemplateFaqs = [
    {
        question: "Does copying the template connect it to Stripe?",
        answer: "No. The template opens with example data. To use your own records, copy its reporting tab into your existing SyncStaq-created spreadsheet. SyncStaq supplies the data; the template supplies the report.",
    },
    {
        question: "What counts as billed revenue?",
        answer: "Synced invoice-line subtotals minus line discounts, grouped by the invoice's finalized month in UTC. Paid, open, and uncollectible invoices are included; draft and void invoices are excluded. Tax is not deducted again, and refunds and credits are not automatically allocated to products. This is billed revenue, not cash collected, recognized revenue, or MRR.",
    },
    {
        question: "Will the report change when my synced data changes?",
        answer: "The formulas reference your destination Sheet's invoice and line-item tabs. When those values change, the report recalculates from them. The source tabs must retain the standard SyncStaq names and headers.",
    },
    {
        question: "Does it combine different prices for the same product?",
        answer: "Yes. Lines are grouped by Product ID, so multiple prices for one product contribute to that product's total. Products with the same display name but different IDs remain separate.",
    },
    {
        question: "Why might a line be missing from the totals?",
        answer: "Draft and void invoices are excluded, as are lines with invalid amounts, missing invoice matches, or other source validation issues. The report flags invalid lines. It cannot include history that is absent from your synced tabs.",
    },
    {
        question: "Can I change the formulas and charts?",
        answer: "Yes, in your own copy. Keep the synced source tabs unchanged and edit the Revenue by Product tab. If you need more than 13 products or 20,000 rows, the chart series and supporting formula ranges need to be expanded together.",
    },
];
