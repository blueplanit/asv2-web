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

## Test plan

- [ ] New user, no subscription: step 4 starts trial, backfill runs, `billingStartedAt` set on profile.
- [ ] User already entitled (subscription before onboarding): step 4 returns `alreadyActive`, proceeds to backfill without duplicate Stripe subscription.
- [ ] User who trialed and canceled: blocked with `403 Trial already used` (`billingStartedAt` present).
- [ ] User who bought a paid subscription first, then canceled, then tries to trial: blocked with `403` (`billingStartedAt` was stamped on the paid activation).
- [ ] User whose customer was created but trial subscription creation failed (`subscriptionCustomerId` set, no `subscriptionId`/`billingStartedAt`): NOT blocked — can retry the trial.
- [ ] Paid checkout (webhook + `confirmCheckoutSessionAndActivateUser`): `billingStartedAt` stamped once, not overwritten on later subscription updates.
- [ ] Vercel logs show `[api-error]` entries for 4xx/5xx on onboarding routes (filter by path).

---

## Changes from PR Review: Preventing Multiple BackfillRuns

### The vulnerability this PR introduced

Fixing the Amy bug required making `start-trial` return `200` (not `409`) for already-entitled users, and reordering step 4 so trial success gates everything else. That fix was correct, but it removed an **accidental gate** that previously blocked duplicate backfills.

Before the fix, already-entitled users got a `409` from `start-trial`, which caused `handleStartTrial` to return `undefined` (falsy). The old wizard then checked `if (!trialOk || ...)` and bailed out before `startInitialBackfill`. This meant step-4 resubmission (page reload, two tabs) was accidentally blocked even though the logic was wrong.

After the fix, already-entitled users get `200 { alreadyActive: true }`, `handleStartTrial` returns `true`, and the wizard proceeds all the way to `startInitialBackfill`. With no other gate in place, two new bugs appeared:

1. **Reload after completion** — a user who refreshes `/onboarding?step=4` after backfill already completed would re-trigger the entire step 4 sequence, including a new `startInitialBackfill` invoke.
2. **Concurrent tabs** — two tabs open on step 4 clicking submit simultaneously would both invoke StartBackfill.

Neither bug was reachable on main. Both were introduced by this PR.

### Why `syncStatus: "backfill_running"` was not a reliable gate

The wizard itself writes `syncStatus: "backfill_running"` before calling `startInitialBackfill`. The Lambda then checks `syncStatus === "backfill_running"` as a prerequisite. This is circular: the wizard sets the condition the Lambda checks, so any code path that reaches step 4 and calls `saveSyncConfigSelection` first will always satisfy the Lambda's guard.

The real question the Lambda should ask is: "has an initial backfill already been created for this workspace?" — not "did the client flag that it is about to start one?"

### Fix: two independent layers

**Layer 1 — Web conditional write (CAS) on `syncStatus`**

The `onboarding → backfill_running` transition in `update/sync-config` is now a DynamoDB conditional write that only succeeds if the current `syncStatus` is `"onboarding"`. DynamoDB serializes conditional writes, so:

- Reload after completion: `syncStatus` is `"syncing"` → condition fails → `409` → wizard returns `"already_started"` sentinel → redirect to dashboard, no Lambda invoke.
- Two concurrent tabs: both read `"onboarding"`, but only one write can succeed atomically; the other gets `409` → same redirect path.

The optimistic write is preserved on the legitimate first run, so the dashboard's polling loop, "Backfilling" health badge, and intro modal all activate immediately as before.

**Layer 2 — Deterministic backfill run ID (Lambda)**

StartBackfill now uses `backfillRunId = "initial"` (a fixed string) instead of a random UUID for initial backfills. The DynamoDB key becomes `BACKFILL_RUN#<spreadsheetId>#initial`. The create condition is the existing `attribute_not_exists(pk) AND attribute_not_exists(sk)`.

If any `BACKFILL_RUN#<spreadsheetId>#initial` item already exists (status `"running"`, `"success"`, or `"failed"`), the create fails with `ConditionalCheckFailedException`, which the Lambda catches and returns as an idempotent `200`. This covers all invoke paths — UI, direct CLI invoke, manual ops trigger — without relying on the web layer.

This layer is independent of Layer 1 and serves as defense-in-depth for non-UI invocations.

### Trade-off: failed initial backfill becomes a permanent tombstone

With a deterministic ID, a run item in `status: "failed"` blocks any future initial backfill attempt the same way a `"running"` or `"success"` item does. A failed initial backfill cannot be retried from the UI (Layer 1 returns `409` because `syncStatus` is past `"onboarding"`) or from a direct Lambda invoke (Layer 2 returns `200` no-op because the run item exists).

Ops remediation for a stuck user requires two manual steps in DynamoDB:
1. Reset `SyncConfig.syncStatus` back to `"onboarding"`
2. Delete `BACKFILL_RUN#<spreadsheetId>#initial`

This is a deliberate choice. The alternative — allowing failed runs to be replaced (`allowReplaceFailed`) — introduces a window where stale SQS messages from the failed run can cross-contaminate the retry's progress counter (both share `backfillRunId: "initial"` and therefore the same `BackfillRunItem` row). The risk is small (only on partial SQS enqueue failure) but the failure mode is subtle, and the retry scenario is rare enough to handle via ops rather than automation.

See `asv2-serverless/docs/adr/001-initial-backfill-idempotency.md` for the full decision record.
