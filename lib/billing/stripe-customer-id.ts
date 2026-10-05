import type Stripe from "stripe";

type StripeCustomerReference =
    | Stripe.Checkout.Session["customer"]
    | Stripe.Subscription["customer"];

export function requireStripeCustomerId(customer: StripeCustomerReference): string {
    if (typeof customer === "string") {
        if (customer) return customer;
        throw new Error("Stripe Customer ID is missing");
    }
    if (customer && typeof customer.id === "string" && customer.id) return customer.id;
    throw new Error("Stripe Customer ID is missing");
}
