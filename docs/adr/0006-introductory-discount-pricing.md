# ADR-0006: An Introductory Discount shows its struck-through price with its Discount Period

**Status:** Accepted
**Date:** 2026-09-26
**Supersedes:** [ADR-0005](./0005-promotions-sourced-from-stripe.md) decision 7

## Context

ADR-0005 decision 7 showed a struck-through price only for an **Ongoing Discount** (a `forever` coupon). An **Introductory Discount** (a `once` or `repeating` coupon) applied at checkout, but `/pricing` showed the full price. "$9.50/month" alone is false after the **Discount Period** ends, so hiding it was the safe choice.

Marketing needs time-limited offers, such as 50% off the first 12 months. With decision 7, `/pricing` hides the discount the banner advertises. The fault was the missing end date, not the discounted price.

## Decision

`/pricing` shows the struck-through price and "Save X%" for every **Deliverable Discount**. For an Introductory Discount, a line under the price states the Discount Period and the later price: "for your first 12 months, then $19/month". The compact sticky bar states the short form: "first 12 months".

1. **Stripe supplies the period.** The page computes it from the coupon's `duration` and `duration_in_months`. Contentful stores no period, because a typed number can drift from the charged number. This follows ADR-0005 decision 1.
2. **The period is a count of bills at the chosen interval.** Stripe discounts every bill created before the Discount Period ends. A `once` coupon covers one bill. A `repeating` coupon covers `ceil(duration_in_months / interval months)` bills.
3. **The yearly display states what Stripe charges.** A period under 12 months still covers the whole first yearly bill, so the page states "first year". An 18-month period covers two yearly bills. The page never hides a discount that checkout applies. The runbook tells editors to use multiples of 12, because a short period costs more on yearly bills.
4. **The wording lives in code.** The sentence needs plural rules. A Contentful template with placeholders breaks easily.
5. **The badge does not change.** "Save X%" is the same for both discount kinds. The Discount Period line qualifies it.

## Considered options

- **Keep decision 7.** Rejected: the page then contradicts the banner and hides a real discount.
- **Supporting copy in Contentful.** Rejected: an editor can write "12 months" over a 6-month coupon.
- **No yearly strike-through for periods other than multiples of 12.** Rejected: the page then shows a full price that checkout does not charge.

## Consequences

- Checkout does not change. A coupon's `duration` cannot change after creation, so the Promotion version from ADR-0005 decision 4 still covers the displayed terms.
- Banner copy is not checked. For an Introductory Discount, the runbook requires the banner to name the Discount Period.
- Confirm the yearly boundary with Stripe test clocks: a 12-month period must leave the month-12 renewal at full price.
