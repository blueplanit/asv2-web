# ADR-0005: Promotions are sourced from Stripe, not duplicated in Contentful

**Status:** Accepted
**Date:** 2026-08-18

## Context

We're adding sitewide promotional banners and discounted pricing driven from Contentful, without a redeploy per campaign, extending the pattern where a webhook plus `unstable_cache` deliver content changes in seconds (ADR-0003). The naive approach — a discount percentage and end date as Contentful fields — creates two editable copies of the same numbers. Contentful and Stripe can drift, silently mismatching the advertised price against the charged price.

## Decisions

### 1. Stripe is the source of truth for the discount and its bounds

A `promotionASv2` entry stores only banner copy and the ID of a Stripe Promotion Code. The discount amount, a hidden defensive `expires_at`, and a `max_redemptions` cap all live on the Stripe object. Checkout auto-applies it via `discounts: [{ promotion_code }]`, so the price shown pre-checkout and the price charged always come from the same read.

Set `max_redemptions` on every campaign's Promotion Code. Absent a deliberate figure, use 100. It bounds a campaign that nobody remembers to end.

### 2. The promotion has no visitor-facing deadline

The campaign runs until someone unpublishes the entry — no countdown, no committed end date. Banner copy is evergreen ("limited-time," no date, no "ends soon"); implying a deadline that doesn't exist is a dark pattern.

### 3. Unpublishing ends the campaign; deactivating the code stays manual

Unpublishing the entry removes the banner, restores the full price, and stops checkout applying anything. It does not touch Stripe. Whoever ends a campaign also deactivates the Promotion Code in the Stripe dashboard. [docs/runbooks/promotions.md](../runbooks/promotions.md) carries the steps.

Automating it was specified and then dropped. Contentful sends a tombstone for `unpublish`: `sys` only, no `fields`, so the webhook never receives the `stripePromotionCodeId` it would need. Recovering it needs a Preview API token, a Content Management token, or the id persisted at publish time — a new credential or new state, plus two failure modes. A Promotion Code the entry names but Stripe cannot find would fail deactivation forever, and under a retry-until-success rule the cache tag would never expire, so a typo would leave the banner up permanently. Deactivation would also be one-way: republishing the same entry would restore the banner over a dead code.

What the automation would have closed is narrow. After unpublishing, nothing is applied automatically; the exposure is someone who learned the customer-facing code string typing it into Stripe's promo field, which `expires_at` and `max_redemptions` already bound. Starting a campaign is already a deliberate two-system act — create the code in Stripe, name it in Contentful, publish. Ending it the same way is symmetric, and one dashboard click.

### 4. Checkout determines the active promotion itself

`/api/billing/checkout` re-reads the currently-published Promotion entry server-side, rather than trusting a promotion code ID supplied by the client — a client-supplied ID could name any currently-valid Stripe code, not necessarily the one campaign that's actually live.

### 5. Anyone who reaches checkout during a campaign is eligible

Promotion Codes carry no `restrictions.first_time_transaction`. Every visitor who reaches checkout while a Promotion is live gets the discount, including a user converting from a trial that started before the campaign.

An earlier draft restricted campaigns to first-time customers. Stripe does not document whether a never-charged trial counts as a prior transaction, so that restriction risked silently refusing the discount to trial converters — the segment most likely to buy. A promise the banner makes and checkout declines is the failure this ADR exists to prevent, so eligibility is deliberately wide. A returning canceled customer also qualifies; that reads as win-back, not a leak. `max_redemptions` is what bounds the exposure.

### 6. A discount never breaks the checkout button

Two guards, because the price shown and the price charged must not diverge into a dead end:

`discounts` and `allow_promotion_codes` are mutually exclusive on one Checkout Session, so a live campaign deletes the latter key. Setting it to `null` or `false` still trips Stripe's exclusivity error.

If creating the discounted session throws, checkout retries once without the discount and logs at error level. Stripe documents throw-shaped errors for inapplicable codes but not whether they fire at session creation. A wrong guess would break the Subscribe button mid-campaign, so the retry covers the cases the docs leave open. The error log matters: reaching it means the banner is advertising a discount the customer will not receive.

A discounted session also resolves a real Stripe Customer via `ensureStripeCustomerId` rather than passing `customer_email`, so eligibility evaluates against a known customer. Only a discounted session does. Outside a campaign the older `customer_email` path stands, so checkout is unchanged there and an abandoned checkout leaves no Customer record behind.

### 7. Only a `forever` coupon gets a struck-through price

`/pricing` shows a discounted per-interval price only when the coupon's `duration` is `forever`. A `once` or `repeating` coupon still runs the campaign and still applies at checkout, but the page shows the full price.

A `once` coupon on a monthly plan discounts the first month alone. Rendering "$15/month" for it states an ongoing rate that is false from month two. That is the same deception as a countdown to a deadline that does not exist, which decision 2 already rejects.

## Consequences

- While a Promotion is live, Stripe Checkout's manual "have a promo code?" field disappears (`discounts` and `allow_promotion_codes` are mutually exclusive on one session). A support-issued one-off code can't be combined with an active campaign.
- At most one Promotion entry may be published at a time; if two are published by mistake, the site shows none rather than guessing.
- The discount applies uniformly to both billing intervals — Stripe restricts coupons by Product, not by individual Price, so interval-specific promotions aren't reliably supported without confirming the monthly/yearly Prices sit under separate Products.
- A Promotion Code that exhausts `max_redemptions` goes permanently inactive while its Contentful entry stays published. The banner keeps advertising the discount until someone unpublishes it. The error log from decision 6 is the only signal.
- Eligibility is wide by design (decision 5), so a campaign discounts trial converters and returning customers alongside new ones. Model campaign cost against every visitor who can reach checkout, not against new signups.
- **A stored `subscriptionCustomerId` that Stripe cannot resolve fails checkout with a 500, and the retry cannot recover it.** `customerParams` is built once, before the retry, so both attempts send the same customer. The retry only drops the discount. Deleting a customer in Stripe therefore breaks that one user's checkout permanently and silently, and any environment running a test key against live-mode ids breaks every checkout — which is what a Vercel preview against the production table would do. Widening the retry to also drop the customer was considered and rejected: the catch is deliberately broad, so a transient Stripe error would then mint a duplicate Customer for a user whose own is fine, trading a rare failure for a commoner one. Fixing it properly means inspecting the error for a missing *customer* specifically. The exposure predates Promotions, because `customer` was already sent whenever a stored id existed.
- Stripe Checkout displays the Promotion Code's customer-facing code to every visitor who checks out during a campaign. Deactivating the code when ending a campaign (decision 3) is therefore load-bearing, not a formality: everyone who bought during the campaign knows the string.
