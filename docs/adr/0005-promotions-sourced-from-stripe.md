# ADR-0005: Promotions are sourced from Stripe, not duplicated in Contentful

**Status:** Accepted
**Date:** 2026-08-18

## Context

We're adding sitewide promotional banners and discounted pricing driven from Contentful, without a redeploy per Promotion, extending the pattern where a webhook plus `unstable_cache` deliver content changes in seconds (ADR-0003). The naive approach — a discount percentage and end date as Contentful fields — creates two editable copies of the same numbers. Contentful and Stripe can drift, silently mismatching the advertised price against the charged price.

## Decisions

### 1. Stripe is the source of truth for the discount and its bounds

A `promotionASv2` entry stores only banner copy and the ID of a Stripe Promotion Code. The discount amount, a hidden defensive `expires_at`, and a `max_redemptions` cap all live on the Stripe object. Checkout auto-applies it via `discounts: [{ promotion_code }]`, so the price shown pre-checkout and the price charged always come from the same read.

Set `max_redemptions` on every Promotion's Promotion Code. Absent a deliberate figure, use 100. It bounds a Promotion that nobody remembers to end.

### 2. The promotion has no visitor-facing deadline

The Promotion runs until someone unpublishes the entry — no countdown, no committed end date. Banner copy is evergreen ("limited-time," no date, no "ends soon"); implying a deadline that doesn't exist is a dark pattern.

### 3. Unpublishing ends the Promotion; deactivating the code stays manual

Unpublishing the entry removes the banner, restores the full price, and stops checkout applying anything. It does not touch Stripe. Whoever ends a Promotion also deactivates the Promotion Code in the Stripe dashboard. [docs/runbooks/promotions.md](../runbooks/promotions.md) carries the steps.

Automating it was specified and then dropped. Contentful sends a tombstone for `unpublish`: `sys` only, no `fields`, so the webhook never receives the `stripePromotionCodeId` it would need. Recovering it needs a Preview API token, a Content Management token, or the id persisted at publish time — a new credential or new state, plus two failure modes. A Promotion Code the entry names but Stripe cannot find would fail deactivation forever, and under a retry-until-success rule the cache tag would never expire, so a typo would leave the banner up permanently. Deactivation would also be one-way: republishing the same entry would restore the banner over a dead code.

What the automation would have closed is narrow. After unpublishing, nothing is applied automatically; the exposure is someone who learned the customer-facing code string typing it into Stripe's promo field, which `expires_at` and `max_redemptions` already bound. Starting a Promotion is already a deliberate two-system act — create the code in Stripe, name it in Contentful, publish. Ending it the same way is symmetric, and one dashboard click.

### 4. Checkout determines the Promotion itself

`/api/billing/checkout` re-reads the currently-published Promotion entry server-side, rather than trusting a Promotion Code ID supplied by the client. The client sends an opaque version for the Deliverable Discount it displayed only as an optimistic concurrency check. The version covers both the Contentful entry and its Stripe Promotion Code. If either changed, checkout stops and the pricing page refreshes instead of silently opening at a different price.

### 5. Anyone who reaches checkout during a Promotion is eligible

Promotion Codes carry no `restrictions.first_time_transaction`. Every visitor who reaches checkout while a Promotion is live gets the discount, including a user converting from a trial that started before the Promotion.

An earlier draft restricted Promotions to first-time customers. Stripe does not document whether a never-charged trial counts as a prior transaction, so that restriction risked silently refusing the discount to trial converters — the segment most likely to buy. A promise the banner makes and checkout declines is the failure this ADR exists to prevent, so eligibility is deliberately wide. A returning canceled customer also qualifies; that reads as win-back, not a leak. `max_redemptions` is what bounds the exposure.

### 6. Checkout never silently changes the advertised price

Two guards keep the price shown and the price charged aligned without creating a dead end:

`discounts` and `allow_promotion_codes` are mutually exclusive on one Checkout Session, so a live Promotion deletes the latter key. Setting it to `null` or `false` still trips Stripe's exclusivity error.

If creating a discounted session fails, checkout does not retry at full price. It returns a temporary error, keeps the visitor on `/pricing`, and lets them try again. If the Promotion changed since `/pricing` loaded, the page refreshes the displayed price and asks the visitor to review it before another attempt.

Checkout passes a stored Stripe Customer when one exists and otherwise passes `customer_email`. Subscription-mode Checkout creates the Customer itself, so starting checkout needs no Customer creation or DynamoDB write. A missing stored Customer is retried with `customer_email` only when Stripe identifies the `customer` parameter as the missing resource; the Promotion Code remains on that retry.

Stripe sometimes refuses a Promotion Code for the customer rather than the request, for example a code held to first-time buyers. Retrying repeats that rejection, so checkout answers `promotion_not_applicable` and `/pricing` names the reason and quotes the full price. The visitor may then start checkout again with the discount dropped. That choice is explicit, so it does not breach the rule above. Decision 5 still holds: the eligibility restriction that causes this is one we do not set, and this path exists for a Promotion Code configured against that rule.

An expectation the client sends as null means the page displayed no Promotion. A Promotion starting after that load is therefore still a change, and checkout stops even though the new price is lower. Only an expectation the client omits entirely is unchecked, which keeps an older client bundle working.

That null only carries meaning because the checkout button waits for the pricing read while a visitor is signed in, and only a signed-in click reaches checkout. A failed read leaves the page on its fallback price, which displays no Promotion, so null stays the honest expectation and a live Promotion still stops checkout.

The guard covers the Promotion, not the list price. The fallback price is hardcoded and is not bound to Stripe, so a list price that moved away from it would go unchecked.

The subscription webhook is the primary path that writes Stripe's Customer, subscription, plan, interval, period end, and status into the User profile. The billing success page independently reconciles the same state. A DynamoDB failure returns a webhook error so Stripe retries; a conditional failure counts as success only after a read proves that the complete intended state is already stored. The success page reports activation only after reconciliation succeeds.

### 7. Only a `forever` coupon gets a struck-through price

`/pricing` shows a discounted per-interval price only when the coupon's `duration` is `forever`. A `once` or `repeating` coupon still runs the Promotion and still applies at checkout, but the page shows the full price.

A `once` coupon on a monthly plan discounts the first month alone. Rendering "$15/month" for it states an ongoing rate that is false from month two. That is the same deception as a countdown to a deadline that does not exist, which decision 2 already rejects.

### 8. An existing paying subscriber does not see the banner

The banner advertises a discount on a subscription the visitor already pays for, so it is noise for them. `/api/billing/subscription-status` answers whether the signed-in visitor is an active paid subscriber, and the banner hides itself for one.

A trialing user is not a paying subscriber and still sees it. Decision 5 makes trial converters eligible, and they are the segment most likely to buy.

Marketing pages stay static (ADR-0003 decision 5), so this cannot be decided server-side. The browser caches the last answer and a pre-paint script applies it, which keeps the banner in the server-rendered HTML for everyone else. A subscriber's first visit on a new browser still shows the banner briefly.

`/pricing` is deliberately not filtered the same way. Hiding the discounted price there would need the same client-side check on the page where price credibility matters most, and the resulting late price change is worse than showing a subscriber a price they are not shopping for.

## Consequences

- While a Promotion is live, Stripe Checkout's manual "have a promo code?" field disappears (`discounts` and `allow_promotion_codes` are mutually exclusive on one session). A support-issued one-off code can't be combined with an active Promotion.
- At most one Promotion entry may be published at a time; if two are published by mistake, the site shows none rather than guessing.
- The discount applies uniformly to both billing intervals — Stripe restricts coupons by Product, not by individual Price, so interval-specific promotions aren't reliably supported without confirming the monthly/yearly Prices sit under separate Products.
- A Promotion Code that exhausts `max_redemptions` goes permanently inactive while its Contentful entry stays published. The banner remains until someone unpublishes it, but checkout will not silently replace a previously displayed promotional price.
- Eligibility is wide by design (decision 5), so a Promotion discounts trial converters and returning customers alongside new ones. Model Promotion cost against every visitor who can reach checkout, not against new signups.
- A stored `subscriptionCustomerId` that Stripe cannot resolve is replaced only after Stripe returns `resource_missing` for the `customer` parameter. Transient Stripe failures never mint a replacement Customer.
- Stripe Checkout displays the Promotion Code's customer-facing code to every visitor who checks out during a Promotion. Deactivating the code when ending a Promotion (decision 3) is therefore load-bearing, not a formality: everyone who bought during the Promotion knows the string.
