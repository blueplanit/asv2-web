export const CUSTOMER_REVENUE_TEMPLATE_PATH = "/templates/stripe-customer-revenue";
export const CUSTOMER_REVENUE_WORKBOOK_URL =
    "https://docs.google.com/spreadsheets/d/1aLnIaoJDklE7T9U1nKtPM4ezfKQmyDiJ0HNccVtKS54";
export const CUSTOMER_REVENUE_COPY_URL = `${CUSTOMER_REVENUE_WORKBOOK_URL}/copy`;
export const CUSTOMER_REVENUE_VIEW_URL = `${CUSTOMER_REVENUE_WORKBOOK_URL}/edit#gid=400001`;

export const customerRevenueTemplateFaqs = [
    {
        question: "Does copying the template connect it to Stripe?",
        answer: "No. The workbook opens with example data. Copy its Working Sheet tab into your SyncStaq-created spreadsheet to use your synced invoices.",
    },
    {
        question: "Does billed revenue mean collected revenue?",
        answer: "No. The report includes paid, open, and uncollectible finalized invoices. It excludes draft and void invoices. It does not subtract refunds, fees, or credits.",
    },
    {
        question: "Why does the report use customer IDs?",
        answer: "Customer names can change or be shared. The report groups invoices by Stripe customer ID and displays the current customer name alongside it.",
    },
];
