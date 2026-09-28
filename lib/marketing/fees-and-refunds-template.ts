export const FEES_TEMPLATE_PATH = "/templates/stripe-fees-and-refunds";
export const FEES_WORKBOOK_URL =
    "https://docs.google.com/spreadsheets/d/1XKENYojbr5wyxxMxvkmhEQTHrjYzuvPKXbKEuea1yCY";
export const FEES_COPY_URL = `${FEES_WORKBOOK_URL}/copy`;
export const FEES_VIEW_URL = `${FEES_WORKBOOK_URL}/edit#gid=400001`;

export const feesTemplateFaqs = [
    {
        question: "Does copying the template connect it to my Stripe data?",
        answer: "No. The template includes example data. Copy its reporting tab into your existing SyncStaq-created spreadsheet to use your synced charge data.",
    },
    {
        question: "Does the report show refunds issued each month?",
        answer: "No. It shows the amount refunded to date on charges created in each month. A later refund changes that original charge month's total.",
    },
    {
        question: "Is 'After fees & refunds' my Stripe payout?",
        answer: "No. It subtracts the charge's cumulative refunds and charge fee from its amount. It does not account for disputes, other balance transactions, or payout timing.",
    },
];
