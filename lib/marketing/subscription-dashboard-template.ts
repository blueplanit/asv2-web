export const SUBSCRIPTION_DASHBOARD_TEMPLATE_PATH = "/templates/stripe-subscription-dashboard";
export const SUBSCRIPTION_DASHBOARD_WORKBOOK_URL =
    "https://docs.google.com/spreadsheets/d/1_vo_gJYF1DurfOfCjIeR1-efnAjxK3ON0oFbK6BY3KI";
export const SUBSCRIPTION_DASHBOARD_COPY_URL = `${SUBSCRIPTION_DASHBOARD_WORKBOOK_URL}/copy`;
export const SUBSCRIPTION_DASHBOARD_VIEW_URL = `${SUBSCRIPTION_DASHBOARD_WORKBOOK_URL}/edit`;

export const subscriptionStatuses = [
    {
        status: "trialing",
        meaning: "The customer is in a free trial. The subscription becomes active when the first payment succeeds.",
        action: "Nothing yet. Watch the trial end date.",
    },
    {
        status: "active",
        meaning: "The subscription is in good standing and the latest invoice is paid.",
        action: "None. This is the list of your paying subscribers.",
    },
    {
        status: "past_due",
        meaning: "The latest renewal payment failed. Stripe keeps retrying on your retry schedule.",
        action: "Contact the customer or ask them to update their card.",
    },
    {
        status: "unpaid",
        meaning: "Retries ran out and your settings keep the subscription open instead of canceling it. New invoices are created but not charged.",
        action: "Collect payment or cancel the subscription.",
    },
    {
        status: "incomplete",
        meaning: "The first payment failed or needs customer action. The customer has about 23 hours to complete it.",
        action: "Follow up quickly, before it expires.",
    },
    {
        status: "incomplete_expired",
        meaning: "The first payment was never completed in time. The subscription never started.",
        action: "None. The customer has to subscribe again.",
    },
    {
        status: "paused",
        meaning: "A trial ended without a payment method on file and your settings pause instead of cancel.",
        action: "Ask the customer to add a payment method.",
    },
    {
        status: "canceled",
        meaning: "The subscription has ended and cannot be reactivated.",
        action: "Review the cancellation reason for churn patterns.",
    },
];

export const subscriptionDashboardFaqs = [
    {
        question: "Does copying the template connect it to my Stripe data?",
        answer: "No. The template includes example data. Copy its Subscription Dashboard tab into your existing SyncStaq-created spreadsheet to use your synced subscription data.",
    },
    {
        question: "How is MRR calculated in the dashboard?",
        answer: "MRR is the plan price multiplied by quantity for every active and past due subscription, with yearly, weekly, and daily plans converted to a monthly amount. It uses list prices, so coupons and discounts are not subtracted, and it assumes a single currency.",
    },
    {
        question: "What is the difference between past_due and unpaid in Stripe?",
        answer: "A subscription is past_due when its latest renewal payment failed and Stripe is still retrying. It becomes unpaid when the retries are exhausted and your billing settings leave the subscription open instead of canceling it. Past due subscriptions are usually still recoverable, which is why the dashboard sorts them to the top.",
    },
    {
        question: "How do I see all active subscriptions in Stripe?",
        answer: "In the Stripe Dashboard, open Billing, then Subscriptions, and filter by the Active status. That shows one status at a time. This dashboard counts each status and lists active, past due, and canceled subscriptions together in one view.",
    },
    {
        question: "Can I use the template without SyncStaq?",
        answer: "Yes, if you maintain the data yourself. The dashboard reads from a tab named Subscriptions_raw and finds its columns by header name, so a manual Stripe CSV export works once its column headers are renamed to match the ones in the template. You will need to paste in a fresh export each time you want current numbers.",
    },
    {
        question: "How many subscriptions can the template handle?",
        answer: "The template reads the first 1,000 rows of the Subscriptions_raw tab. A subscription with several items takes one row per item.",
    },
];
