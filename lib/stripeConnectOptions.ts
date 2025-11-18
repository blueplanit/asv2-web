// lib/stripeKitOptions.ts
import Stripe from "stripe";
import { store, ConnectKitStore } from "./storeMemory";
import { makeState } from "./oauthState";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
const clientId = process.env.STRIPE_CLIENT_ID!;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const appUrl = process.env.NEXTAUTH_URL!; // http://localhost:3000 in dev

// Stripe must redirect to a URL you've registered in the dashboard:
const redirectUri = `${appUrl}/api/stripe/callback`;

export interface ConnectOptions {
    stripeSecretKey: string;
    clientId: string;
    redirectUri: string;
    webhookSecret: string;
    scope: "read_only" | "read_write";
    store: ConnectKitStore;

    // called when we receive Stripe webhook events
    onEvent: (evt: Stripe.Event, accountId: string) => Promise<void>;

    // anti-CSRF state helpers for OAuth
    makeState: () => Promise<string>;
    verifyState: (state: string | null) => Promise<boolean>;
}

// demo impl: hard-coded state and a fake logged-in user
export const kitOptions: ConnectOptions = {
    stripeSecretKey,
    clientId,
    redirectUri,
    webhookSecret,
    scope: "read_only",
    store,

    onEvent: async (evt, accountId) => {
        // This is where you'd update analytics DB, usage metrics, etc.
        console.log("Webhook:", evt.type, "for", accountId);
    },

    makeState: () => makeState(
        "demo-user-123",
    ),


    verifyState: async (state) => {
        return state === "nonce-demo";
    },
};
