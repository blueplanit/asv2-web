# PR Summary — Onboarding entitlement & logging fix

**Repos:** `asv2-web`, `asv2-shared`  
**Area:** Onboarding step 4, billing start-trial, API error logging

---

## Bug

A user (amy) completed onboarding in **prod** but her workspace was stuck at `syncStatus: backfill_running` with empty sheets and no `BACKFILL_RUN#` DynamoDB record — meaning the StartBackfill Lambda never ran.

**Root cause:** She had already purchased a subscription **before** finishing onboarding. At step 4, the wizard calls `POST /api/billing/start-trial`, which hit `isUserProfileEntitled(profile)` and returned **`409 "Subscription already active"`**.

The onboarding wizard had a sequencing bug:

1. `handleStartTrial()` ran first but returned falsy on 409.
2. **`saveSyncConfigSelection()` still ran**, writing `syncStatus: backfill_running` to DynamoDB.
3. The guard `if (!trialOk || !saveConfigOk) return` bailed out **before** `startInitialBackfill()` could invoke the Lambda.

Result: DynamoDB showed a healthy entitled profile and a sync config in `backfill_running`, but no backfill was ever started.

This was **not** an IAM or Lambda invoke failure in prod (the web app user already had `lambda:InvokeFunction` on `revops-prod-start-backfill`). The invoke was never attempted.

---

## How we debugged it

1. **DynamoDB export (`test.csv`)** — Confirmed timeline: PROFILE subscription active at `21:10:05Z`, SyncConfig flipped to `backfill_running` at `21:12:48Z`, 7 enabled sheet tabs all at `rowCount: 0`, **no `BACKFILL_RUN#` item**. StartBackfill always creates a backfill run before enqueuing work, so the Lambda never executed.

2. **Code trace** — Mapped onboarding step 4 in `onboarding-wizard.tsx`: trial → save config → init backfill. Found that config persistence was not gated on trial success.

3. **Prod IAM policy review** — Confirmed `lambda:InvokeFunction` on `revops-prod-start-backfill` was already granted; ruled out AccessDenied as the cause for this user.

4. **CloudTrail Event history** — Management events only (`CreateLogStream` for other Lambdas); no `Invoke` data events (Lambda invokes are data events and require a trail with data event logging). No StartBackfill log stream around the incident window corroborated “never ran.”

5. **Vercel runtime logs** — User identified the **`409 "Subscription already active"`** response from `start-trial`, matching the entitled profile + wizard ordering bug.

---

## Changes made

### `asv2-web`

| File | Change |
|------|--------|
| `lib/api/api-error-response.ts` | **New.** Shared helper: `console.warn` for 4xx, `console.error` for 5xx, returns plain-text `NextResponse`. Makes API error bodies traceable in Vercel runtime logs (status/path logged; body text still only visible if logged explicitly). |
| `app/api/billing/start-trial/route.ts` | **Idempotent for already-entitled users:** returns `200 { ok: true, alreadyActive: true, status }` instead of `409`. **Trial-eligibility guard:** pre-create check uses `hasBillingHistory()` = `billingStartedAt \|\| subscriptionId` (legacy fallback). `subscriptionCustomerId` is intentionally **no longer** a blocking signal. **Race handling:** on `ConditionalCheckFailedException`, re-read profile → idempotent success if entitled, else `403`. All errors routed through `apiErrorResponse`. |
| `lib/dynamo/user-profile.ts` | `updateUserSubscriptionStatusToActive` now **always** stamps `billingStartedAt = if_not_exists(billingStartedAt, :now)` on every activation (no per-caller flag). Removed `recordTrialUsed` param and the `attribute_not_exists(trialUsedAt)` condition. Because all activation paths funnel through this function, `billingStartedAt` is recorded for **trial and paid** subscriptions alike. |
| `components/onboarding/onboarding-wizard.tsx` | **Step 4 reorder:** trial must succeed before `saveSyncConfigSelection`; each step gates the next. `handleStartTrial` returns `false` (not `undefined`) on failure. Already-entitled users get `alreadyActive` success and proceed to backfill. |
| `app/api/update/sync-config/route.ts` | Error returns use `apiErrorResponse` (logged). |
| `app/api/google/create-sheet/route.ts` | Error returns use `apiErrorResponse` (logged). |
| `app/api/sync/init-backfill/route.ts` | Error returns use `apiErrorResponse`. **Additional (beyond original plan):** validates sync config exists (404), calls `assertConnectionsReadyForBackfill` before invoke (409). |

### `asv2-shared`

| File | Change |
|------|--------|
| `src/user-profile.ts` | Added optional `billingStartedAt?: string` (ISO, write-once timestamp of the user's first subscription of any kind — trial or paid). Replaces the earlier `trialUsedAt`. |

---

## New onboarding step 4 flow

```
handleStartTrial()
  ├─ fail (403/500) → stop, nothing persisted
  └─ ok or alreadyActive
       → saveSyncConfigSelection()  [sets backfill_running]
            ├─ fail → stop
            └─ ok → startInitialBackfill()  [Invoke StartBackfill Lambda]
                      ├─ fail → stop (status may remain backfill_running — see follow-ups)
                      └─ ok → redirect /dashboard?backfill_started=1
```

---

## `billingStartedAt` (one free trial per user)

**Business rule:** A user gets at most one free trial. If they have *ever* had a subscription — a prior trial **or** a paid subscription bought before trialing — they are not eligible for a new free trial.

**Why renamed from `trialUsedAt`:** The flag is set on paid subscriptions too, so a name implying "trial only" was misleading. `billingStartedAt` describes what it actually records: the start of the user's first subscription of any kind.

**Why not infer from existing fields:** The old guard (`subscriptionId || subscriptionCustomerId`) inferred history from billing artifacts:
- `subscriptionCustomerId` only means a Stripe customer exists. `ensureStripeCustomerId()` writes it *before* a subscription is created, so a trial setup that fails after customer creation would leave a customer id and **permanently, wrongly block** a legitimate first trial. `subscriptionCustomerId` is now dropped from the guard.
- Status-based checks (e.g. `subscriptionRawStatus === "trialing"`) miss auto-canceled trials (`missing_payment_method: "cancel"` leaves `rawStatus: "canceled"`).

**How it's set:** `updateUserSubscriptionStatusToActive` always writes `billingStartedAt = if_not_exists(billingStartedAt, :now)`. Every activation path funnels through this one function — `start-trial` (trial), the Stripe webhook `customer.subscription.created/updated` (paid / first sub), and `confirmCheckoutSessionAndActivateUser` (paid checkout) — so the timestamp is recorded once, on the first subscription, regardless of path, and is never overwritten or cleared. No per-caller flag is needed.

**How it's read:** `hasBillingHistory(profile) = !!(billingStartedAt || subscriptionId)`. `subscriptionId` is the legacy fallback for users who subscribed before `billingStartedAt` existed.

**Duplicate-trial protection preserved:** Entitled users skip trial creation (idempotent success). Non-entitled users with prior billing history get `403`. Concurrent double-submit is still blocked by the existing `attribute_not_exists(subscriptionId)` concurrency guard on the activation write (for first-time subscribers, `expectedCurrentSubscriptionId` is `null`).

---

## Deviations from the written plan

1. **`apiErrorResponse`** uses positional arguments `(route, status, message, extras?)`, not an options object.
2. **Flag renamed and broadened:** the plan's `trialUsedAt` (set only on trial) became `billingStartedAt`, set write-once on **any** first subscription (trial or paid). The trial guard drops `subscriptionCustomerId` and now uses `billingStartedAt || subscriptionId`.
3. **`init-backfill`** adds sync-config and connection guards not in the original plan.

---

## Test plan

- [ ] New user, no subscription: step 4 starts trial, backfill runs, `billingStartedAt` set on profile.
- [ ] User already entitled (subscription before onboarding): step 4 returns `alreadyActive`, proceeds to backfill without duplicate Stripe subscription.
- [ ] User who trialed and canceled: blocked with `403 Trial already used` (`billingStartedAt` present).
- [ ] User who bought a paid subscription first, then canceled, then tries to trial: blocked with `403` (`billingStartedAt` was stamped on the paid activation).
- [ ] User whose customer was created but trial subscription creation failed (`subscriptionCustomerId` set, no `subscriptionId`/`billingStartedAt`): NOT blocked — can retry the trial.
- [ ] Paid checkout (webhook + `confirmCheckoutSessionAndActivateUser`): `billingStartedAt` stamped once, not overwritten on later subscription updates.
- [ ] Vercel logs show `[api-error]` entries for 4xx/5xx on onboarding routes (filter by path).
