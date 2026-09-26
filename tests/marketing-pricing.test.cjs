const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { loadTypeScriptModule } = require("./helpers/load-typescript-module.cjs");

const compiler = { jsx: require("typescript").JsxEmit.ReactJSX };
const jsx = require("react/jsx-runtime");
const pricing = {
    offerAmounts: { monthly: { amount: 15, currency: "USD" }, yearly: { amount: 150, currency: "USD" } },
    billingDisplay: {
        monthly: { price: "$19", intervalLabel: "/month", discountedPrice: "$15", percentOff: 21 },
        yearly: { price: "$190", intervalLabel: "/year", discountedPrice: "$150", percentOff: 21 },
    },
    promotionId: "promotion",
    promotionVersion: "version",
};
const copy = {
    hero: { title: "Pricing", freeTrialText: "Free trial", freeTrialLinkHref: "/login", secondaryText: "Cancel anytime" },
    toggle: { monthlyLabel: "Monthly", yearlyLabel: "Annual", yearlySavingsTag: "Save" },
    plan: { name: "Pro", description: "Stripe data in Sheets", bullets: [], trustSignals: [] },
    included: { title: "Included", bullets: [], faqTitle: "FAQ", faqs: [] },
    snackbar: { title: "Signed in", description: "Continue" },
    ctaLabels: { signedInIdle: "Checkout", signedOutIdle: "Sign in", signedInLoading: "Starting", signedOutLoading: "Signing in" },
};

function loadClient(status = "unauthenticated") {
    return loadTypeScriptModule(path.join(__dirname, "../components/pricing/pricing-client.tsx"), {
        react: React,
        "react/jsx-runtime": jsx,
        "next-auth/react": { useSession: () => ({ status }), signIn: () => {} },
        "next/navigation": { useSearchParams: () => new URLSearchParams() },
        "@/components/ui/snackbar": { Snackbar: () => null },
        "@heroicons/react/20/solid": { ChevronDownIcon: () => null },
        "@/lib/analytics/amplitude-client": { trackAmplitudeEvent: () => {}, trackAmplitudeError: () => {} },
        "@/lib/analytics/event-names": { EVENT_NAMES: {} },
    }, compiler).PricingClient;
}

test("server HTML contains current monthly and annual prices, including ongoing discounts", () => {
    const html = renderToStaticMarkup(React.createElement(loadClient(), { copy, initialPricing: pricing }));
    assert.match(html, /Monthly: \$15\/month/);
    assert.match(html, /Annual: \$150\/year, billed annually/);
    assert.doesNotMatch(html, /Loading\.\.\./);
});

test("signed-in checkout stays disabled until the browser confirms current pricing", () => {
    const html = renderToStaticMarkup(React.createElement(loadClient("authenticated"), { copy, initialPricing: pricing }));
    assert.match(html, /<button[^>]*disabled=""[^>]*>Checkout<\/button>/);
});

test("failed server price lookup shows loading instead of an invented price", () => {
    const html = renderToStaticMarkup(React.createElement(loadClient(), { copy, initialPricing: null }));
    assert.match(html, /Loading\.\.\./);
    assert.doesNotMatch(html, /\$19|\$190/);
});

test("site entities share canonical IDs and JSON-LD escapes script-breaking text", () => {
    const { SiteStructuredData, StructuredData, AppStructuredData } = loadTypeScriptModule(
        path.join(__dirname, "../components/marketing/structured-data.tsx"),
        { "react/jsx-runtime": jsx, "@/lib/constants": { APP_NAME: "SyncStaq", SITE_URL: "https://www.syncstaq.com" } }, compiler,
    );
    const html = renderToStaticMarkup(React.createElement(SiteStructuredData));
    const graph = JSON.parse(html.match(/<script[^>]*>(.*?)<\/script>/)[1])["@graph"];
    assert.equal(graph[1].publisher["@id"], graph[0]["@id"]);
    assert.equal(graph[1].url, "https://www.syncstaq.com");
    const app = renderToStaticMarkup(React.createElement(AppStructuredData, { pricing: null }));
    assert.doesNotMatch(app, /aggregateRating|review|offers/);
    const pricedApp = renderToStaticMarkup(React.createElement(AppStructuredData, { pricing }));
    const offers = JSON.parse(pricedApp.match(/<script[^>]*>(.*?)<\/script>/)[1]).offers;
    assert.deepEqual(offers.map((offer) => offer.price), [15, 150]);
    assert.deepEqual(offers.map((offer) => offer.priceSpecification.billingDuration), ["P1M", "P1Y"]);
    const escaped = renderToStaticMarkup(React.createElement(StructuredData, { data: { name: "</script><script>bad</script>" } }));
    assert.match(escaped, /\\u003c\/script>/);
    assert.equal((escaped.match(/<script/g) ?? []).length, 1);
});

test("machine-readable offers use the same Stripe amounts and ongoing discount rules as visible prices", async () => {
    for (const duration of ["forever", "once", "repeating"]) {
        const { getBillingDisplay } = loadTypeScriptModule(
            path.join(__dirname, "../lib/pricing/get-billing-display.ts"),
            {
                "next/cache": { unstable_cache: (fn) => fn },
                "@/lib/stripe/stripe-billing": {
                    BILLING_PRICES: { pro: { monthly: "monthly", yearly: "yearly" } },
                    stripeBilling: { prices: { retrieve: async (id) => ({ unit_amount: id === "monthly" ? 1900 : 19000, currency: "usd" }) } },
                },
                "@/lib/promotions/get-deliverable-discount": {
                    getDeliverableDiscount: async () => ({ promotion: { id: "promotion" }, coupon: { duration, percent_off: 20 } }),
                    isOngoingDiscount: (coupon) => coupon.duration === "forever",
                    deliverableDiscountVersion: () => "version",
                },
            },
        );
        const result = await getBillingDisplay();
        assert.equal(result.offerAmounts.monthly.amount, duration === "forever" ? 15.2 : 19);
        assert.equal(result.offerAmounts.yearly.amount, duration === "forever" ? 152 : 190);
        assert.equal(result.offerAmounts.monthly.currency, "USD");
        assert.equal(result.billingDisplay.monthly.discountedPrice, duration === "forever" ? "$15.20" : null);
    }
});

test("pricing page reads the existing price source per request and tolerates a server lookup failure", async () => {
    for (const fails of [false, true]) {
        let reads = 0;
        const page = loadTypeScriptModule(path.join(__dirname, "../app/(marketing)/pricing/page.tsx"), {
            "react/jsx-runtime": jsx,
            "@/components/pricing/pricing-client": { PricingClient: loadClient() },
            "@/lib/pricing/pricing-config": { getPricingCopy: async () => copy },
            "@/lib/marketing/seo-metadata": { createMarketingMetadata: (data) => data },
            "@/components/marketing/structured-data": { AppStructuredData: () => null },
            "@/lib/pricing/get-billing-display": { getBillingDisplay: async () => {
                reads++;
                if (fails) throw new Error("unavailable");
                return pricing;
            } },
        }, compiler);
        assert.equal(page.dynamic, "force-dynamic");
        const html = renderToStaticMarkup(await page.default());
        assert.equal(reads, 1);
        assert.equal(html.includes("Monthly: $15/month"), !fails);
        assert.equal(html.includes("Loading..."), fails);
    }
});
