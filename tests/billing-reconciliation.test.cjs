const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const { loadTypeScriptModule } = require("./helpers/load-typescript-module.cjs");

const projectRoot = path.join(__dirname, "..");

class MockNextResponse extends Response {
    static json(body, init) {
        return new MockNextResponse(JSON.stringify(body), {
            ...init,
            headers: { "content-type": "application/json", ...init?.headers },
        });
    }
}

function subscriptionFixture(status = "active", customer = "cus_checkout", metadata) {
    return {
        id: "sub_paid",
        created: 200,
        customer,
        status,
        cancel_at_period_end: false,
        cancel_at: null,
        metadata: metadata ?? {
            userId: "user-123",
            priceId: "price_monthly",
            subscription_stage: "paid",
        },
        items: {
            data: [{ price: { id: "price_monthly", unit_amount: 1900, currency: "usd" } }],
        },
    };
}

function loadWebhookRoute({
    updateActive,
    updateInactive = async () => {},
    getProfile,
    eventType = "customer.subscription.created",
    subscriptionStatus = "active",
    customer = "cus_checkout",
    metadata,
    retrieveSubscription,
    canBecomeCurrent = async () => true,
    cancelPreviousTrial = async () => {},
}) {
    const subscription = subscriptionFixture(subscriptionStatus, customer, metadata);
    return loadTypeScriptModule(
        path.join(projectRoot, "app/api/stripe/webhook/route.ts"),
        {
            "server-only": {},
            "next/server": { NextResponse: MockNextResponse },
            "@/lib/stripe/stripe-billing": {
                stripeBilling: {
                    webhooks: {
                        constructEvent: () => ({
                            id: "evt_subscription_created",
                            type: eventType,
                            data: { object: subscription },
                        }),
                    },
                    subscriptions: {
                        retrieve: retrieveSubscription ?? (async () => subscription),
                        cancel: async () => subscription,
                    },
                },
            },
            "@/lib/dynamo/user-profile": {
                getUserProfile: getProfile,
                updateUserSubscriptionStatusToActive: updateActive,
                updateUserSubscriptionStatusToInactive: updateInactive,
            },
            "@/lib/billing/billing-plan-map": {
                mapStripePriceToPlan: () => ({ planId: "pro", interval: "monthly" }),
            },
            "@/lib/billing/billing-period": { getSubscriptionPeriodEnd: () => 1_800_000_000 },
            "@/lib/app-state/subscription-entitlement": {
                isStripeSubscriptionEntitled: (status) => status === "active",
                isStripeSubscriptionNonEntitledTerminal: (status) => status === "canceled",
            },
            "@/lib/utils": { isDevEnvironment: () => false },
            "@/lib/analytics/server-events": { trackServerEvent: async () => {} },
            "@/lib/analytics/event-names": { EVENT_NAMES: { SUBSCRIPTION_PAID: "paid" } },
            "@/lib/billing/reconcile-subscription": {
                reconcileActiveSubscription: updateActive,
                reconcileInactiveSubscription: async (userId, accountRole, rawStatus, subscriptionId) =>
                    updateInactive(userId, accountRole, rawStatus, subscriptionId),
            },
            "@/lib/billing/stripe-customer-id": {
                requireStripeCustomerId: (customer) =>
                    typeof customer === "string" ? customer : customer?.id,
            },
            "@/lib/billing/subscription-order": {
                canBecomeCurrentSubscription: canBecomeCurrent,
            },
            "@/lib/billing/cancel-previous-trial-subscription": {
                cancelPreviousTrialSubscription: cancelPreviousTrial,
            },
        },
    ).POST;
}

function webhookRequest() {
    return new Request("https://example.com/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "test-signature" },
        body: "{}",
    });
}

test("webhook returns 500 when DynamoDB cannot persist the Stripe state", async () => {
    const POST = loadWebhookRoute({
        updateActive: async () => {
            throw new Error("DynamoDB is temporarily unavailable");
        },
        getProfile: async () => ({ accountRole: "user", subscriptionId: null }),
    });

    const response = await POST(webhookRequest());

    assert.equal(response.status, 500);
});

test("a subscription with no userId is accepted rather than retried forever", async () => {
    let writes = 0;
    const POST = loadWebhookRoute({
        updateActive: async () => {
            writes += 1;
        },
        getProfile: async () => ({ accountRole: "user", subscriptionId: null }),
        metadata: {},
    });

    const response = await POST(webhookRequest());

    assert.equal(response.status, 200);
    assert.equal(writes, 0);
});

test("a missing profile is accepted rather than retried forever", async () => {
    let writes = 0;
    const POST = loadWebhookRoute({
        updateActive: async () => {
            writes += 1;
        },
        getProfile: async () => undefined,
    });

    const response = await POST(webhookRequest());

    assert.equal(response.status, 200);
    assert.equal(writes, 0);
});

test("webhook persists the complete entitled Stripe state", async () => {
    let written;
    const POST = loadWebhookRoute({
        updateActive: async (userId, params, previousSubscriptionId) => {
            written = { userId, params, previousSubscriptionId };
        },
        getProfile: async () => ({ accountRole: "user", subscriptionId: null }),
    });

    const response = await POST(webhookRequest());

    assert.equal(response.status, 200);
    assert.deepEqual(written, {
        userId: "user-123",
        previousSubscriptionId: null,
        params: {
            subscriptionId: "sub_paid",
            stripeCustomerId: "cus_checkout",
            planId: "pro",
            interval: "monthly",
            currentPeriodEnd: 1_800_000_000,
            rawStatus: "active",
        },
    });
});

test("webhook extracts the ID from an expanded Stripe Customer", async () => {
    let writtenCustomerId;
    const POST = loadWebhookRoute({
        updateActive: async (_userId, params) => {
            writtenCustomerId = params.stripeCustomerId;
        },
        getProfile: async () => ({ accountRole: "user", subscriptionId: null }),
        customer: { id: "cus_expanded" },
    });

    const response = await POST(webhookRequest());

    assert.equal(response.status, 200);
    assert.equal(writtenCustomerId, "cus_expanded");
});

test("deleted-subscription webhook returns 500 when inactivation cannot persist", async () => {
    const POST = loadWebhookRoute({
        updateActive: async () => {},
        updateInactive: async () => {
            throw new Error("DynamoDB is temporarily unavailable");
        },
        getProfile: async () => ({
            accountRole: "user",
            subscriptionId: "sub_paid",
        }),
        eventType: "customer.subscription.deleted",
        subscriptionStatus: "canceled",
    });

    const response = await POST(webhookRequest());

    assert.equal(response.status, 500);
});

test("a delayed older paid webhook cannot replace the current subscription", async () => {
    let writes = 0;
    let cancellations = 0;
    const POST = loadWebhookRoute({
        updateActive: async () => {
            writes += 1;
        },
        getProfile: async () => ({
            accountRole: "user",
            subscriptionId: "sub_newer",
        }),
        canBecomeCurrent: async () => false,
        cancelPreviousTrial: async () => {
            cancellations += 1;
        },
    });

    const response = await POST(webhookRequest());

    assert.equal(response.status, 200);
    assert.equal(writes, 0);
    assert.equal(cancellations, 0);
});

test("a delayed webhook reconciles the subscription's current Stripe state", async () => {
    let activeWrites = 0;
    let inactiveWrites = 0;
    const POST = loadWebhookRoute({
        updateActive: async () => {
            activeWrites += 1;
        },
        updateInactive: async () => {
            inactiveWrites += 1;
        },
        getProfile: async () => ({
            accountRole: "user",
            subscriptionId: "sub_paid",
        }),
        subscriptionStatus: "active",
        retrieveSubscription: async () => subscriptionFixture("canceled"),
    });

    const response = await POST(webhookRequest());

    assert.equal(response.status, 200);
    assert.equal(activeWrites, 0);
    assert.equal(inactiveWrites, 1);
});

function loadBillingConfirmation({
    updateActive,
    profile = { subscriptionId: null },
    subscription = subscriptionFixture(),
    canBecomeCurrent = async () => true,
    cancelPreviousTrial = async () => {},
}) {
    return loadTypeScriptModule(
        path.join(projectRoot, "lib/billing/billing-confirm.ts"),
        {
            "server-only": {},
            "@/lib/stripe/stripe-billing": {
                stripeBilling: {
                    checkout: {
                        sessions: {
                            retrieve: async () => ({
                                mode: "subscription",
                                status: "complete",
                                payment_status: "paid",
                                customer: "cus_checkout",
                                subscription,
                                metadata: { userId: "user-123", priceId: "price_monthly" },
                                line_items: { data: [] },
                            }),
                        },
                    },
                    subscriptions: { cancel: async () => {} },
                },
            },
            "@/lib/dynamo/user-profile": {
                getUserProfile: async () => profile,
                updateUserSubscriptionStatusToActive: updateActive,
            },
            "@/lib/billing/reconcile-subscription": {
                reconcileActiveSubscription: updateActive,
            },
            "@/lib/billing/stripe-customer-id": {
                requireStripeCustomerId: (customer) =>
                    typeof customer === "string" ? customer : customer?.id,
            },
            "@/lib/billing/subscription-order": {
                canBecomeCurrentSubscription: canBecomeCurrent,
            },
            "@/lib/billing/cancel-previous-trial-subscription": {
                cancelPreviousTrialSubscription: cancelPreviousTrial,
            },
            "./billing-plan-map": {
                mapStripePriceToPlan: () => ({ planId: "pro", interval: "monthly" }),
            },
            "./billing-period": { getSubscriptionPeriodEnd: () => 1_800_000_000 },
            "@/lib/app-state/subscription-entitlement": {
                isStripeSubscriptionEntitled: () => true,
                isUserProfileEntitled: () => true,
            },
        },
    ).confirmCheckoutSessionAndActivateUser;
}

test("success confirmation rejects when DynamoDB cannot persist the Stripe state", async () => {
    const confirm = loadBillingConfirmation({
        updateActive: async () => {
            throw new Error("DynamoDB is temporarily unavailable");
        },
    });

    await assert.rejects(
        confirm("cs_complete", "user-123"),
        /DynamoDB is temporarily unavailable/,
    );
});

test("an old checkout success URL cannot replace or cancel the current subscription", async () => {
    let writes = 0;
    let cancellations = 0;
    const confirm = loadBillingConfirmation({
        updateActive: async () => {
            writes += 1;
        },
        profile: {
            subscriptionId: "sub_newer",
            subscriptionStatus: "active",
        },
        canBecomeCurrent: async () => false,
        cancelPreviousTrial: async () => {
            cancellations += 1;
        },
    });

    const activated = await confirm("cs_old", "user-123");

    assert.equal(activated, true);
    assert.equal(writes, 0);
    assert.equal(cancellations, 0);
});

function loadSubscriptionOrder(retrieve) {
    return loadTypeScriptModule(
        path.join(projectRoot, "lib/billing/subscription-order.ts"),
        {
            "server-only": {},
            "@/lib/stripe/stripe-billing": {
                stripeBilling: { subscriptions: { retrieve } },
            },
        },
    ).canBecomeCurrentSubscription;
}

test("a newer or explicitly replacing Stripe subscription can become current", async () => {
    const current = { ...subscriptionFixture(), id: "sub_current", created: 200 };
    const canBecomeCurrent = loadSubscriptionOrder(async () => current);

    assert.equal(
        await canBecomeCurrent({ ...subscriptionFixture(), id: "sub_older", created: 199 }, current.id),
        false,
    );
    assert.equal(
        await canBecomeCurrent({ ...subscriptionFixture(), id: "sub_same_second", created: 200 }, current.id),
        false,
    );
    assert.equal(
        await canBecomeCurrent({ ...subscriptionFixture(), id: "sub_newer", created: 201 }, current.id),
        true,
    );

    assert.equal(
        await canBecomeCurrent(
            {
                ...subscriptionFixture(),
                id: "sub_same_second_paid",
                created: 200,
                metadata: {
                    ...subscriptionFixture().metadata,
                    replacesSubscriptionId: current.id,
                },
            },
            current.id,
        ),
        true,
    );
});

function loadReconcilers({ updateActive = async () => {}, updateInactive = async () => {}, getProfile }) {
    return loadTypeScriptModule(
        path.join(projectRoot, "lib/billing/reconcile-subscription.ts"),
        {
            "server-only": {},
            "@/lib/dynamo/user-profile": {
                getUserProfile: getProfile,
                updateUserSubscriptionStatusToActive: updateActive,
                updateUserSubscriptionStatusToInactive: updateInactive,
            },
        },
    );
}

function loadReconciler({ updateActive, getProfile }) {
    return loadReconcilers({ updateActive, getProfile }).reconcileActiveSubscription;
}

const completeSubscriptionState = {
    subscriptionId: "sub_paid",
    stripeCustomerId: "cus_checkout",
    planId: "pro",
    interval: "monthly",
    currentPeriodEnd: 1_800_000_000,
    rawStatus: "active",
};

test("conditional failure succeeds only when the complete state is already stored", async () => {
    const reconcile = loadReconciler({
        updateActive: async () => {
            throw { name: "ConditionalCheckFailedException" };
        },
        getProfile: async () => ({
            subscriptionStatus: "active",
            subscriptionId: "sub_paid",
            subscriptionCustomerId: "cus_checkout",
            subscriptionPlanId: "pro",
            subscriptionInterval: "monthly",
            subscriptionCurrentPeriodEnd: new Date(1_800_000_000 * 1000).toISOString(),
            subscriptionRawStatus: "active",
        }),
    });

    await reconcile("user-123", completeSubscriptionState, null);
});

test("conditional failure remains an error when stored Stripe state differs", async () => {
    const reconcile = loadReconciler({
        updateActive: async () => {
            throw { name: "ConditionalCheckFailedException" };
        },
        getProfile: async () => ({
            subscriptionStatus: "active",
            subscriptionId: "sub_paid",
            subscriptionCustomerId: "cus_different",
        }),
    });

    await assert.rejects(
        reconcile("user-123", completeSubscriptionState, null),
        (err) => err?.name === "ConditionalCheckFailedException",
    );
});

test("a superseded cancellation is dropped rather than revoking a newer subscription", async () => {
    const { reconcileInactiveSubscription } = loadReconcilers({
        updateInactive: async () => {
            throw { name: "ConditionalCheckFailedException" };
        },
        // A newer subscription became current between the read and the write.
        getProfile: async () => ({ subscriptionId: "sub_newer" }),
    });

    await reconcileInactiveSubscription("user-123", "user", "canceled", "sub_paid");
});

test("a cancellation that should have applied stays an error", async () => {
    const { reconcileInactiveSubscription } = loadReconcilers({
        updateInactive: async () => {
            throw { name: "ConditionalCheckFailedException" };
        },
        getProfile: async () => ({ subscriptionId: "sub_paid" }),
    });

    await assert.rejects(
        reconcileInactiveSubscription("user-123", "user", "canceled", "sub_paid"),
        (err) => err?.name === "ConditionalCheckFailedException",
    );
});

test("a missing profile remains an error after conditional inactivation fails", async () => {
    const { reconcileInactiveSubscription } = loadReconcilers({
        updateInactive: async () => {
            throw { name: "ConditionalCheckFailedException" };
        },
        getProfile: async () => null,
    });

    await assert.rejects(
        reconcileInactiveSubscription(
            "user-123",
            "user",
            "canceled",
            "sub_paid",
        ),
        (err) => err?.name === "ConditionalCheckFailedException",
    );
});

function textContent(node) {
    if (node == null || typeof node === "boolean") return "";
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(textContent).join(" ");
    return textContent(node.props?.children);
}

class MockInvalidCheckoutSessionError extends Error {
    constructor(message) {
        super(message);
        this.name = "InvalidCheckoutSessionError";
    }
}

function loadSuccessPage(confirm) {
    const jsx = (type, props) => ({ type, props });
    return loadTypeScriptModule(
        path.join(projectRoot, "app/(app)/billing/success/page.tsx"),
        {
            "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: Symbol("Fragment") },
            "next-auth": {
                getServerSession: async () => ({ user: { userId: "user-123" } }),
            },
            "next/navigation": { redirect: () => { throw new Error("Unexpected redirect"); } },
            "@/app/api/auth/[...nextauth]/route": { authOptions: {} },
            "@/lib/billing/billing-confirm": {
                confirmCheckoutSessionAndActivateUser: confirm,
                InvalidCheckoutSessionError: MockInvalidCheckoutSessionError,
            },
            "@/components/billing/activation-pending-retry": {
                ActivationPendingRetry: () => null,
            },
        },
        { jsx: ts.JsxEmit.ReactJSX },
    ).default;
}

test("success page never claims activation when confirmation fails", async () => {
    const page = loadSuccessPage(async () => {
        throw new Error("DynamoDB is temporarily unavailable");
    });

    const rendered = await page({
        searchParams: Promise.resolve({ session_id: "cs_complete" }),
    });
    const text = textContent(rendered);

    assert.match(text, /confirming your checkout/i);
    assert.doesNotMatch(text, /Subscription activated/i);
});

test("an unusable checkout session stops polling and reports itself invalid", async () => {
    const page = loadSuccessPage(async () => {
        throw new MockInvalidCheckoutSessionError("Checkout session does not belong to this user");
    });

    const rendered = await page({
        searchParams: Promise.resolve({ session_id: "cs_other_user" }),
    });
    const text = textContent(rendered);

    assert.match(text, /couldn't verify this checkout/i);
    assert.doesNotMatch(text, /confirming your checkout/i);
    assert.doesNotMatch(text, /Subscription activated/i);
});
