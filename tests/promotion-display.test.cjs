const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { loadTypeScriptModule } = require("./helpers/load-typescript-module.cjs");

const modulePath = path.join(__dirname, "../lib/promotions/get-deliverable-discount.ts");

function loadIsOngoingDiscount() {
    return loadTypeScriptModule(modulePath, {
        "server-only": {},
        "node:crypto": require("node:crypto"),
        "@/lib/stripe/stripe-billing": { stripeBilling: {} },
        "./get-active-promotion": { getActivePromotion: async () => null },
        "@/lib/contentful/contentful": {},
    }).isOngoingDiscount;
}

// ADR-0005 decision 7: only a forever coupon may be shown as the ongoing per-interval
// rate. Stating "$15/month" for a once coupon is false from the second invoice.
test("only a forever coupon may be displayed as the ongoing rate", () => {
    const isOngoingDiscount = loadIsOngoingDiscount();

    assert.equal(isOngoingDiscount({ duration: "forever" }), true);
    assert.equal(isOngoingDiscount({ duration: "once" }), false);
    assert.equal(isOngoingDiscount({ duration: "repeating" }), false);
});
