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
| `app/api/billing/start-trial/route.ts` | **Idempotent for already-entitled users:** returns `200 { ok: true, alreadyActive: true, status }` instead of `409`. **`trialUsedAt` guard:** write-once flag via `recordTrialUsed: true` on activation; pre-create check uses `hasUsedTrial()` (`trialUsedAt` + legacy `subscriptionId \|\| subscriptionCustomerId`). **Race handling:** on `ConditionalCheckFailedException`, re-read profile → idempotent success if entitled, else `403`. All errors routed through `apiErrorResponse`. |
| `lib/dynamo/user-profile.ts` | `updateUserSubscriptionStatusToActive` accepts `recordTrialUsed`; sets `trialUsedAt` with `attribute_not_exists(trialUsedAt)` condition. |
| `components/onboarding/onboarding-wizard.tsx` | **Step 4 reorder:** trial must succeed before `saveSyncConfigSelection`; each step gates the next. `handleStartTrial` returns `false` (not `undefined`) on failure. Already-entitled users get `alreadyActive` success and proceed to backfill. |
| `app/api/update/sync-config/route.ts` | Error returns use `apiErrorResponse` (logged). |
| `app/api/google/create-sheet/route.ts` | Error returns use `apiErrorResponse` (logged). |
| `app/api/sync/init-backfill/route.ts` | Error returns use `apiErrorResponse`. **Additional (beyond original plan):** validates sync config exists (404), calls `assertConnectionsReadyForBackfill` before invoke (409). |

### `asv2-shared`

| File | Change |
|------|--------|
| `src/user-profile.ts` | Added optional `trialUsedAt?: string` (ISO, write-once when trial starts). |

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

## `trialUsedAt` (one trial per user)

**Why:** The old guard (`subscriptionId || subscriptionCustomerId`) inferred “used trial” from billing artifacts. A Stripe customer can exist without a trial (false positive). Status-based checks miss auto-canceled trials (`rawStatus` becomes `canceled`, not `trialing`).

**How:** On first successful trial creation, stamp `trialUsedAt` in the same conditional DynamoDB write as subscription activation. Guard reads `trialUsedAt` first; legacy users without the field still fall back to `subscriptionId || subscriptionCustomerId`.

**Duplicate-trial protection preserved:** Entitled users skip trial creation (idempotent). Non-entitled users with `trialUsedAt` or legacy billing artifacts get `403`. Concurrent double-submit blocked by DynamoDB condition on `trialUsedAt`.

---

## Deviations from the written plan

1. **`apiErrorResponse`** uses positional arguments `(route, status, message, extras?)`, not an options object.
2. **Legacy fallback** keeps both `subscriptionId` and `subscriptionCustomerId` (not `subscriptionId` alone).
3. **`init-backfill`** adds sync-config and connection guards not in the original plan.

---

## Test plan

- [ ] New user, no subscription: step 4 starts trial, backfill runs, `trialUsedAt` set on profile.
- [ ] User already entitled (subscription before onboarding): step 4 returns `alreadyActive`, proceeds to backfill without duplicate Stripe subscription.
- [ ] User who trialed and canceled (legacy, no `trialUsedAt`): blocked with `403 Trial already used`.
- [ ] Vercel logs show `[api-error]` entries for 4xx/5xx on onboarding routes (filter by path).
