# ADR-0002: Amplitude funnel instrumentation

**Status:** Accepted
**Date:** 2026-08-05

## Context

The app had ~35 Amplitude events, but the funnel could not be read end to end
and the conversion rate to paid was not computable:

- **No purchase event existed at all.** The last client event was
  `Checkout Session Created`, fired just before the user leaves for Stripe.
  Trial-to-paid conversion happens 14 days later inside the Stripe webhook,
  with no browser attached.
- **No signup event**, so the funnel had no top.
- Marketing pages emitted nothing except blog and pricing.
- `Stripe Connect Failed` and `Google Connect Failed` existed, but **neither
  success was tracked** — the two highest-friction onboarding steps had failure
  telemetry and no denominator.
- Event names encoded step numbers, which had already drifted: the project
  contains `Onboarding Step 4 …` events that no code emits.

## Decisions

### 1. Conversion is the first successful payment

Not trial start. Trial start measures intent to try; the goal is willingness to
pay. This forces server-side emission, because the money moment has no browser.

### 2. `user_id` is the bare `userId`

Previously `${emailPrefix}-${userId}`, which the webhook and Lambdas cannot
reproduce without loading the profile, and which embeds PII in the identity key.
Email moves to a user property.

Amplitude cannot merge two user ids after the fact ("if you create a new user ID
for an existing user, Amplitude recognizes them as different unique users"), so
`scripts/remap-amplitude-user-ids.ts` performs a one-time `/usermap` remap.

### 3. Scope is `asv2-web` only

`Backfill Completed` fires from the dashboard poller, so it under-counts users
who close the tab during backfill. Fixing that means emitting from
`asv2-serverless`. **Accepted as a known bias** rather than widening scope. The
activation step is skewed; the conversion step is not.

### 4. Browser SDK 2 with autocapture

`amplitude-js` is in maintenance. `@amplitude/analytics-browser` v2 autocaptures
page views and attribution, which supplies the top of the funnel without a
tracker on every marketing route. All call sites go through
`trackAmplitudeEvent`, so the migration touched one file.

Browser SDK 2 automatically migrates cookies from `amplitude-js` >= 6.0.0
(we were on 8.21.10), so returning anonymous visitors keep their device id.

### 5. Acquisition channel is derived from the landing route

`/stripe-app/start` and `/google-add-on/start` imply their channel by
construction — no `?src=` param, no Stripe app manifest change, no second repo.
Stamped with `setOnce`, so first touch wins.

### 6. No `firstPaidAt` guard — this is deliberate

**Do not add one.** Stripe's state machine already guarantees at-most-once:

| Transition | Fires? | Why |
|---|---|---|
| `created` + `active` | yes | Paid checkout, no auth step |
| `trialing -> active` | yes | Trial converted; `trialing` is never re-entered |
| `incomplete -> active` | yes | 3DS cleared |
| `past_due -> active` | **no** | Dunning recovery, not a conversion |
| renewal | **no** | Status stays `active`; nothing transitions |

`canceled` is terminal, so a win-back always creates a *new* subscription
object and cannot re-fire the old one's transition.

A user who churns and re-subscribes does fire the event twice. That is correct:
Amplitude funnels count unique users ("a single user can only appear in the
chart once"), so the conversion rate is unaffected, while revenue correctly
counts both payments.

Adding a durable guard would buy nothing for the funnel and would *lose*
win-back revenue from LTV.

### 7. Semantic event names, not step numbers

Step numbers break whenever onboarding is reordered, and already had. Names now
follow `CONTEXT.md` vocabulary (`Workspace Spreadsheet Created`, not
`Onboarding Step 3 Completed: Create sheet`). Pre-cutover history is not
comparable; at ~279 events/month there was little to protect.

## Consequences

- `AMPLITUDE_API_KEY` **must be set server-side** (separate from
  `NEXT_PUBLIC_AMPLITUDE_API_KEY`). Without it, `Signed Up` and
  `Subscription Paid` silently no-op.
- Events are suppressed when `isDevEnvironment()` is true, so local runs do not
  pollute the funnel with fake conversions.
- Sending reserved revenue fields means refunds/churn should eventually emit
  negative revenue, or LTV will drift high.
- Old step-numbered events remain in Amplitude's event list and should be
  hidden there.

## Funnel

```
[Amplitude] Page Viewed   (autocapture)
  -> Sign In Started
  -> Signed Up                 (server: auth callback, create branch only)
  -> Stripe Connect Started
  -> Stripe Connected
  -> Google Connect Started
  -> Google Connected              (server: google callback)
  -> Workspace Spreadsheet Created (server: google callback, auto path)
  -> Trial Started
  -> Backfill Completed        (client-biased; see decision 3)
  -> Checkout Started
  -> Subscription Paid         (server: Stripe webhook)
```

Segment by the `acquisition_channel` user property.

### Why these two are emitted server-side

An ordered funnel compares timestamps. A server event is stamped during the
OAuth callback; a client event cannot be stamped until the browser has followed
the redirect and mounted the page, seconds later. Emitting one step on the
server and the next on the client therefore inverts them.

`Google Connected` and `Workspace Spreadsheet Created` are adjacent steps on the
same request, so both are emitted from the Google callback. Do not move either
back to the wizard.

### Order comes from captured timestamps, not call order

Both events carry an explicit `time`, captured when the thing they measure
actually happened. Ordering therefore does not depend on when the events are
sent, which is what lets the callback do all its real work first and emit once
at the end.

An earlier revision kept them ordered by *awaiting* `Google Connected` before
creating the spreadsheet. That put a network call on the OAuth critical path:
a slow Amplitude could exhaust the request budget and leave the user with a
persisted connection, no spreadsheet, and no `sheetError` redirect — analytics
breaking onboarding. Sheet-creation failure is now flagged rather than returned
early, so the single emit point still runs and cannot be skipped.

Keep this shape: capture times inline, send once, after the work.
