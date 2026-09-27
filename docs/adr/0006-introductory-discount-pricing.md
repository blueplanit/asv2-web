# ADR-0006: An Introductory Discount shows its struck-through price with its Discount Period

**Status:** Accepted
**Date:** 2026-09-26
**Supersedes:** [ADR-0005](./0005-promotions-sourced-from-stripe.md) decision 7

## Context

ADR-0005 decision 7 showed a struck-through price only for an **Ongoing Discount** (a `forever` coupon). Checkout applied an **Introductory Discount** (a `once` or `repeating` coupon), but `/pricing` showed the full price. "$9.50/month" alone is false after the **Discount Period** ends. Hiding the Introductory Discount was the safe choice.

Marketing needs Introductory Discounts, such as 50% off the first 12 months. Under decision 7, `/pricing` hides the discount that the banner advertises. The missing end date was the fault, not the discounted price.

## Decision

`/pricing` shows the struck-through price and "Save X%" for every **Deliverable Discount**. For an Introductory Discount, a line under the price states the Discount Period and the later price: "for your first 12 months, then $19/month". The compact sticky bar states the short form: "first 12 months".

1. **Stripe supplies the Discount Period.** The page computes the Discount Period from the coupon's `duration` and `duration_in_months`. Contentful stores no Discount Period. A typed number can drift from the charged number. This follows ADR-0005 decision 1.
2. **The Discount Period is a count of bills at the chosen interval.** Stripe discounts every bill created before the Discount Period ends. A `once` coupon covers one bill. A `repeating` coupon covers `ceil(duration_in_months / interval months)` bills.
3. **The yearly display states what Stripe charges.** A Discount Period under 12 months covers the whole first yearly bill. The page therefore states "first year". An 18-month Discount Period covers two yearly bills. The page never hides a discount that checkout applies. The runbook tells editors to use multiples of 12. A short Discount Period costs more on yearly bills.
4. **The wording lives in code.** The sentence needs plural rules. A Contentful template with placeholders breaks easily.
5. **The badge does not change.** "Save X%" is the same for an Ongoing Discount and an Introductory Discount. The Discount Period line qualifies the badge.

## Considered options

- **Keep decision 7.** Rejected: the page contradicts the banner and hides a real discount.
- **Supporting copy in Contentful.** Rejected: an editor can write "12 months" over a 6-month coupon.
- **No yearly struck-through price unless the Discount Period is a multiple of 12.** Rejected: the page shows a full price that checkout does not charge.

## Consequences

- Checkout does not change. Stripe does not let anyone change a coupon's `duration` after creation. The Promotion version from ADR-0005 decision 4 therefore still covers the displayed Discount Period.
- The site does not check banner copy. For an Introductory Discount, the runbook requires the banner to name the Discount Period.
- Confirm the yearly boundary with Stripe test clocks. A 12-month Discount Period must leave the month-12 renewal at full price.
