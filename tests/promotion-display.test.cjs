const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { loadTypeScriptModule } = require("./helpers/load-typescript-module.cjs");

const discountModulePath = path.join(__dirname, "../lib/promotions/get-deliverable-discount.ts");
const billingDisplayModulePath = path.join(__dirname, "../lib/pricing/get-billing-display.ts");

function loadDiscountModule() {
    return loadTypeScriptModule(discountModulePath, {
        "server-only": {},
        "node:crypto": require("node:crypto"),
        "@/lib/stripe/stripe-billing": { stripeBilling: {} },
        "./get-active-promotion": { getActivePromotion: async () => null },
        "@/lib/contentful/contentful": {},
    });
}

function loadGetBillingDisplay(coupon) {
    const discountModule = loadDiscountModule();
    const discount = coupon
        ? { promotion: { id: "entry_1" }, promotionCodeId: "promo_1", coupon }
        : null;

    return loadTypeScriptModule(billingDisplayModulePath, {
        "next/cache": { unstable_cache: (fn) => fn },
        "@/lib/stripe/stripe-billing": {
            BILLING_PRICES: { pro: { monthly: "price_monthly", yearly: "price_yearly" } },
            stripeBilling: {
                prices: {
                    retrieve: async (id) => ({
                        unit_amount: id === "price_monthly" ? 1900 : 19000,
                        currency: "usd",
                    }),
                },
            },
        },
        "@/lib/promotions/get-deliverable-discount": {
            ...discountModule,
            getDeliverableDiscount: async () => discount,
        },
    }).getBillingDisplay;
}

// ADR-0006: Stripe discounts every bill created inside the Discount Period, so the
// count is the bills that fall before the period ends. null means every bill.
test("counts the discounted bills for each coupon duration and interval", () => {
    const { discountedBillCount } = loadDiscountModule();
    const repeating = (months) => ({ duration: "repeating", duration_in_months: months });

    assert.equal(discountedBillCount({ duration: "forever" }, 1), null);
    assert.equal(discountedBillCount({ duration: "forever" }, 12), null);

    assert.equal(discountedBillCount({ duration: "once" }, 1), 1);
    assert.equal(discountedBillCount({ duration: "once" }, 12), 1);

    assert.equal(discountedBillCount(repeating(12), 1), 12);
    assert.equal(discountedBillCount(repeating(12), 12), 1);
    assert.equal(discountedBillCount(repeating(3), 12), 1);
    assert.equal(discountedBillCount(repeating(18), 12), 2);
    assert.equal(discountedBillCount(repeating(24), 12), 2);
});

test("an Ongoing Discount shows the struck-through price with no Discount Period", async () => {
    const getBillingDisplay = loadGetBillingDisplay({ duration: "forever", percent_off: 50 });
    const { billingDisplay } = await getBillingDisplay();

    assert.deepEqual(billingDisplay.monthly, {
        price: "$19",
        intervalLabel: "/month",
        discountedPrice: "$9.50",
        percentOff: 50,
        discountPeriod: null,
    });
});

test("a 12-month Introductory Discount names its Discount Period and the later price", async () => {
    const getBillingDisplay = loadGetBillingDisplay({
        duration: "repeating",
        duration_in_months: 12,
        percent_off: 50,
    });
    const { billingDisplay } = await getBillingDisplay();

    assert.deepEqual(billingDisplay.monthly, {
        price: "$19",
        intervalLabel: "/month",
        discountedPrice: "$9.50",
        percentOff: 50,
        discountPeriod: {
            terms: "for your first 12 months, then $19/month",
            short: "first 12 months",
        },
    });
    assert.deepEqual(billingDisplay.yearly.discountPeriod, {
        terms: "for your first year, then $190/year",
        short: "first year",
    });
});

test("a once Introductory Discount covers only the first bill", async () => {
    const getBillingDisplay = loadGetBillingDisplay({ duration: "once", percent_off: 50 });
    const { billingDisplay } = await getBillingDisplay();

    assert.equal(billingDisplay.monthly.discountPeriod.terms, "for your first month, then $19/month");
    assert.equal(billingDisplay.yearly.discountPeriod.terms, "for your first year, then $190/year");
});

test("an 18-month Introductory Discount covers two yearly bills", async () => {
    const getBillingDisplay = loadGetBillingDisplay({
        duration: "repeating",
        duration_in_months: 18,
        amount_off: 500,
    });
    const { billingDisplay } = await getBillingDisplay();

    assert.equal(billingDisplay.yearly.discountedPrice, "$185");
    assert.equal(billingDisplay.yearly.discountPeriod.terms, "for your first 2 years, then $190/year");
});

test("no Deliverable Discount shows the full price only", async () => {
    const getBillingDisplay = loadGetBillingDisplay(null);
    const { billingDisplay, promotionId } = await getBillingDisplay();

    assert.deepEqual(billingDisplay.yearly, {
        price: "$190",
        intervalLabel: "/year",
        discountedPrice: null,
        percentOff: null,
        discountPeriod: null,
    });
    assert.equal(promotionId, null);
});
