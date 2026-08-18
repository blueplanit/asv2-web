# ADR-0005: Promotions are sourced from Stripe, not duplicated in Contentful

**Status:** Accepted
**Date:** 2026-08-18

## Context

We're adding sitewide promotional banners and discounted pricing driven from Contentful, without a redeploy per campaign, extending the pattern where a webhook plus `unstable_cache` deliver content changes in seconds (ADR-0003). The naive approach — a discount percentage and end date as Contentful fields — creates two editable copies of the same numbers. Contentful and Stripe can drift, silently mismatching the advertised price against the charged price.

## Decisions

### 1. Stripe is the source of truth for the discount and its deadline

A `promotionASv2` entry stores only banner copy and the ID of a Stripe Promotion Code. The discount amount, eligibility (`restrictions.first_time_transaction`), and a hidden defensive `expires_at` all live on the Stripe object. Checkout auto-applies it via `discounts: [{ promotion_code }]`, so the price shown pre-checkout and the price charged always come from the same read.

### 2. The promotion has no visitor-facing deadline

The campaign runs until someone unpublishes the entry — no countdown, no committed end date. Banner copy is evergreen ("limited-time," no date, no "ends soon"); implying a deadline that doesn't exist is a dark pattern.

### 3. Unpublishing ends redemption everywhere, not just visibility

The revalidate webhook already treats `unpublish` as a handled action. For a Promotion entry, it now also calls Stripe to set the Promotion Code's `active` to `false`. Without this, unpublishing only removes the banner — the code stays redeemable by anyone who already has it until the hidden `expires_at`. A failed Stripe call answers 503 so Contentful retries the whole webhook, matching how an unconfirmed content change is already handled.

### 4. Checkout determines the active promotion itself

`/api/billing/checkout` re-reads the currently-published Promotion entry server-side, rather than trusting a promotion code ID supplied by the client — a client-supplied ID could name any currently-valid Stripe code, not necessarily the one campaign that's actually live.

## Consequences

- While a Promotion is live, Stripe Checkout's manual "have a promo code?" field disappears (`discounts` and `allow_promotion_codes` are mutually exclusive on one session). A support-issued one-off code can't be combined with an active campaign.
- At most one Promotion entry may be published at a time; if two are published by mistake, the site shows none rather than guessing.
- The discount applies uniformly to both billing intervals — Stripe restricts coupons by Product, not by individual Price, so interval-specific promotions aren't reliably supported without confirming the monthly/yearly Prices sit under separate Products.
