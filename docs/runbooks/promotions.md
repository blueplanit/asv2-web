# Runbook: running a Promotion

How to start, end, and replace a **Promotion**. See [CONTEXT.md](../../CONTEXT.md) for the terms and [ADR-0005](../adr/0005-promotions-sourced-from-stripe.md) for why the design works this way.

A Promotion spans two systems. Stripe holds the discount. Contentful holds the banner copy and names the Stripe object. Both must be right, and the order matters.

## Before you start

You need dashboard access to Stripe and to the Contentful space.

Stripe is the source of truth for the discount amount. Contentful never stores a percentage. Publishing a Contentful entry is the only thing that starts a campaign.

## Start a Promotion

Do Stripe first. You need the Promotion Code ID before you can fill in Contentful.

### 1. Create the Coupon in Stripe

Set the discount amount.

Set **duration** to `forever`. A `once` or `repeating` coupon still applies at checkout, but `/pricing` then shows the full price with no strikethrough. This is deliberate: "$15/month" is false from month two if the coupon only covers the first month.

### 2. Create the Promotion Code in Stripe

Attach it to that Coupon.

Set `max_redemptions`. Use 100 unless you have a reason for another figure. It bounds a campaign nobody remembers to end.

Do **not** restrict it to first-time customers. Trial converters get the discount, and that restriction may silently refuse them.

Set an `expires_at` well past your intended end date, for example 90 days. It is a backstop, never shown to visitors.

### 3. Copy the Promotion Code ID

You need the ID (`promo_…`), not the customer-facing code (`SUMMER20`).

```bash
curl -s "https://api.stripe.com/v1/promotion_codes?limit=10" -u "$STRIPE_SECRET_KEY:" \
  | python3 -c "import json,sys; [print(p['id'], '|', p['code'], '| active:', p['active']) for p in json.load(sys.stdin)['data']]"
```

### 4. Create a new Contentful entry

Content type `promotionASv2`. **Always create a new entry. Never reuse an old one** — see [Why a new entry every time](#why-a-new-entry-every-time).

| Field | Value |
| --- | --- |
| `stripePromotionCodeId` | the `promo_…` ID from step 3 |
| `bannerHeadline` | the banner copy |
| `ctaLabel` | the link text |
| `ctaHref` | usually `/pricing` |
| `showInProduction` | check it for a live campaign |

Write evergreen copy. Name the discount and call it limited-time. Do not state a deadline or imply one with "ends soon". No deadline exists, so claiming one deceives the visitor.

### 5. Confirm no other entry is published, then publish

Two published entries make the site show **no** Promotion at all. That is a deliberate fail-safe against an editorial mistake, and it is silent.

### 6. Check the site

The banner appears on public marketing pages within seconds. `/pricing` shows the original price struck through, the discounted price, and the percent off. Checkout applies the discount with no code entry.

## End a Promotion

Both steps. The first alone leaves the discount redeemable.

### 1. Unpublish the Contentful entry

The banner goes, the full price returns, and checkout stops applying the discount. This takes seconds.

### 2. Deactivate the Promotion Code in Stripe

The site does not do this for you. Nothing in the app touches Stripe when you unpublish.

This matters more than it looks. Stripe Checkout shows the customer-facing code to everyone who buys during a campaign, and the "have a promo code?" box returns once the campaign ends. Anyone who bought during the campaign can type the code and still redeem it.

## Replace one Promotion with another

1. Unpublish the old entry.
2. Deactivate the old Promotion Code in Stripe.
3. Create the new Coupon and Promotion Code.
4. Create a **new** Contentful entry.
5. Publish it.

Keep the old entry as an unpublished draft. It records what ran.

## Why a new entry every time

A visitor who dismisses the banner has that dismissal stored against the entry's ID. Reuse the entry and the ID does not change, so **everyone who dismissed the last campaign never sees the new one**. Your most frequent visitors are the ones you lose, and nothing reports it.

## When something looks wrong

| Symptom | Cause |
| --- | --- |
| Nothing appears at all | Two entries are published, or a required field is empty, or the entry is unpublished |
| Banner appears, price not struck through | The Coupon's `duration` is not `forever`. Checkout still discounts |
| Banner appears, checkout charges full price | The Promotion Code is inactive, expired, or out of redemptions. Server logs carry the reason |
| Banner appears in a preview deployment only | `showInProduction` is unchecked |
| Banner will not appear for you | You dismissed it. Clear `promotion-banner-dismissed-id` from browser storage |

A Promotion Code that runs out of redemptions goes permanently inactive while the entry stays published. The banner keeps advertising a discount nobody can get. Unpublish the entry.
