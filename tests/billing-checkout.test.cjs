const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { loadTypeScriptModule } = require("./helpers/load-typescript-module.cjs");

const routePath = path.join(__dirname, "../app/api/billing/checkout/route.ts");

class MockNextResponse extends Response {
    static json(body, init) {
        return new MockNextResponse(JSON.stringify(body), {
            ...init,
            headers: { "content-type": "application/json", ...init?.headers },
        });
    }
}

function loadCheckoutRoute({ discount, profile, createSession, ensureCustomer }) {
    const dependencies = {
        "server-only": {},
        "next/server": { NextResponse: MockNextResponse },
        "next-auth": {
            getServerSession: async () => ({ user: { userId: "user-123" } }),
        },
        "@/app/api/auth/[...nextauth]/route": { authOptions: {} },
        "@/lib/stripe/stripe-billing": {
            BILLING_PRICES: { pro: { monthly: "price_monthly", yearly: "price_yearly" } },
            stripeBilling: { checkout: { sessions: { create: createSession } } },
        },
        "@/lib/dynamo/user-profile": {
            getUserProfile: async () => {
                if (profile instanceof Error) throw profile;
                return profile;
            },
        },
        "@/lib/dynamo/ensure-stripe-customer": {
            ensureStripeCustomerId: ensureCustomer,
        },
        "@/lib/promotions/get-deliverable-discount": {
            getDeliverableDiscount: async () => discount,
            deliverableDiscountVersion: (value) =>
                value ? `${value.promotion.id}:${value.promotionCodeId}` : null,
        },
    };
    return loadTypeScriptModule(routePath, dependencies).POST;
}

function checkoutRequest(expectedPromotionId, expectedPromotionVersion) {
    return new Request("https://example.com/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            planId: "pro",
            interval: "monthly",
            expectedPromotionId,
            expectedPromotionVersion:
                expectedPromotionVersion ?? `${expectedPromotionId}:promo_code_123`,
        }),
    });
}

const deliverableDiscount = {
    promotion: { id: "promotion-123" },
    promotionCodeId: "promo_code_123",
};

test("discounted checkout has no pre-checkout Customer or DynamoDB dependency", async () => {
    const createCalls = [];
    let ensureCalls = 0;
    const POST = loadCheckoutRoute({
        discount: deliverableDiscount,
        profile: { email: "buyer@example.com" },
        createSession: async (params) => {
            createCalls.push(params);
            return { url: "https://checkout.stripe.test/session" };
        },
        ensureCustomer: async () => {
            ensureCalls += 1;
            throw new Error("DynamoDB is temporarily unavailable");
        },
    });

    const response = await POST(checkoutRequest("promotion-123"));

    assert.equal(response.status, 200);
    assert.equal(ensureCalls, 0);
    assert.equal(createCalls[0].customer_email, "buyer@example.com");
    assert.deepEqual(createCalls[0].discounts, [{ promotion_code: "promo_code_123" }]);
});

test("an exhausted profile-read retry returns a recoverable checkout error", async () => {
    const POST = loadCheckoutRoute({
        discount: deliverableDiscount,
        profile: new Error("DynamoDB is temporarily unavailable"),
        createSession: async () => ({ url: "https://checkout.stripe.test/session" }),
        ensureCustomer: async () => "cus_unused",
    });

    const response = await POST(checkoutRequest("promotion-123"));
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(body.code, "checkout_unavailable");
});

test("a discounted-session failure never redirects to full-price checkout", async () => {
    const createCalls = [];
    const POST = loadCheckoutRoute({
        discount: deliverableDiscount,
        profile: { email: "buyer@example.com", subscriptionCustomerId: "cus_existing" },
        createSession: async (params) => {
            createCalls.push(params);
            if (createCalls.length === 1) throw new Error("Stripe is temporarily unavailable");
            return { url: "https://checkout.stripe.test/full-price" };
        },
        ensureCustomer: async () => "cus_existing",
    });

    const response = await POST(checkoutRequest("promotion-123"));
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(body.code, "checkout_unavailable");
    assert.equal(createCalls.length, 1);
});

test("an ended Promotion asks the customer to review the refreshed price", async () => {
    const createCalls = [];
    const POST = loadCheckoutRoute({
        discount: null,
        profile: { email: "buyer@example.com" },
        createSession: async (params) => {
            createCalls.push(params);
            return { url: "https://checkout.stripe.test/full-price" };
        },
        ensureCustomer: async () => "cus_unused",
    });

    const response = await POST(checkoutRequest("promotion-123"));
    const body = await response.json();

    assert.equal(response.status, 409);
    assert.equal(body.code, "price_changed");
    assert.equal(createCalls.length, 0);
});

test("a changed Promotion Code on the same entry still requires price review", async () => {
    const createCalls = [];
    const POST = loadCheckoutRoute({
        discount: { ...deliverableDiscount, promotionCodeId: "promo_code_replacement" },
        profile: { email: "buyer@example.com" },
        createSession: async (params) => {
            createCalls.push(params);
            return { url: "https://checkout.stripe.test/replacement-price" };
        },
        ensureCustomer: async () => "cus_unused",
    });

    const response = await POST(
        checkoutRequest("promotion-123", "promotion-123:promo_code_123"),
    );
    const body = await response.json();

    assert.equal(response.status, 409);
    assert.equal(body.code, "price_changed");
    assert.equal(createCalls.length, 0);
});

test("a missing stored Customer retries with email without dropping the Promotion", async () => {
    const createCalls = [];
    const POST = loadCheckoutRoute({
        discount: deliverableDiscount,
        profile: { email: "buyer@example.com", subscriptionCustomerId: "cus_deleted" },
        createSession: async (params) => {
            createCalls.push(params);
            if (createCalls.length === 1) {
                throw { code: "resource_missing", param: "customer" };
            }
            return { url: "https://checkout.stripe.test/session" };
        },
        ensureCustomer: async () => "cus_unused",
    });

    const response = await POST(checkoutRequest("promotion-123"));

    assert.equal(response.status, 200);
    assert.equal(createCalls.length, 2);
    assert.equal(createCalls[1].customer_email, "buyer@example.com");
    assert.deepEqual(createCalls[1].discounts, [{ promotion_code: "promo_code_123" }]);
});
