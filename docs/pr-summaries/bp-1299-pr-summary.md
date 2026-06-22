# PR — Onboarding connection guards

**Branch:** `bp-1299-permission-checks` → `bp-1231-onboard-survey`

---

## Summary

Fixes a bug where a user could complete onboarding without ever connecting a Stripe account. Three layers of enforcement are added: client-side step gating in the onboarding wizard, server-side connection guards on the two backfill endpoints, and corrected OAuth callback redirects so users always land on the right step when a connection fails or is cancelled.

---

## Changes

### Bug: Users could bypass Stripe/Google connection steps (client-side guard)

`components/onboarding/onboarding-wizard.tsx`

The wizard previously derived its visible step purely from the `?step=` URL param with no awareness of actual connection state. Users who cancelled the Stripe OAuth prompt were redirected back to step 2 and could proceed through onboarding with no Stripe account connected.

- Derives `hasStripe` / `hasGoogle` from `user.stripeConnections` / `user.googleConnections` (both already available in `UserState`).
- Computes `maxAllowedIndex`: step 1 max until Stripe is connected, step 2 max until Google is connected, step 3 once both are connected.
- Clamps the URL `?step=` param to `maxAllowedIndex` on every render. If the URL asks for a step beyond what connections allow, redirects to the correct step with a snackbar explanation.
- Guards `handlePrimaryAction`: steps 1 and 2 advance via `goToStepByIndex` when the connection is already satisfied (no redundant OAuth re-run); step 3 hard-blocks with an inline error if either connection is missing.
- Shows green "Connected" badges on steps 1 (Stripe business name) and 2 (Google email), and changes the CTA to "Continue" when a step is already satisfied.
- Adds `snackbarTitle` state so each snackbar scenario (Stripe error, Google error, account mismatch, step skip) shows a distinct title.

### Bug: OAuth error callbacks sent users to wrong steps

`app/api/stripe/callback/route.ts`, `app/api/google/callback/route.ts`

Previously all error and cancel paths used the same redirect target as the success path, so a cancelled Stripe connect landed the user on step 2 and a failed Google connect landed on step 3.

**Stripe callback:**

- Untrusted state (`!verified.ok`) → `/onboarding?step=1` (unchanged, payload unavailable).
- Cancel/error with trusted state → inspects `verified.payload.returnTo`: if it's an onboarding path (or absent), uses `/onboarding?step=1`; otherwise reuses the signed `returnTo` so a reconnect from the dashboard returns to `/dashboard?stripeError=...` rather than dumping the user into onboarding.
- Removes the unused `redirect` import from `next/navigation`.

**Google callback:**

- Splits `redirectFor` into `redirectForSuccess` (step 3 for `google-connect`) and `redirectForError` (step 2 for `google-connect`). All error branches — cancel, token exchange failure, missing tokens, scope denied, userinfo failure, account mismatch — now use `errorBase` instead of `base`, so a failed Google connect returns the user to step 2 instead of step 3.

### Bug: Stripe reconnect errors from the dashboard were silently swallowed

`components/dashboard/dashboard.tsx`, `components/account/account-page-client.tsx`

When a Stripe reconnect (initiated from the account page) failed or was cancelled, the `?stripeError=...` param in the redirect to `/dashboard` was ignored. Only `googleError=scope_denied` was handled.

- Adds a `stripeConnectError` state and a `useEffect` in `DashboardClient` that detects any `?stripeError` param, switches to the account view, sets the error state, and cleans the URL — mirroring the existing `googleError` handler.
- Passes `stripeConnectError` / `onDismissStripeConnectError` props into `AccountPageClient`.
- Renders an inline amber alert in the Stripe section of the account page (styled identically to the existing `scopeError` block), with a dismiss button. The "Reconnect Stripe" button is also shown whenever `stripeConnectError` is true, regardless of connection status.

### Bug: Server endpoints had no connection guard (direct API bypass possible)

`lib/app-state/connection-guards.ts` *(new)*, `app/api/update/sync-config/route.ts`, `app/api/sync/init-backfill/route.ts`

The client-side wizard guard can be bypassed by a direct API call or a stale browser tab. Neither endpoint verified connection state before mutating the sync config or firing the backfill Lambda.

- Adds `assertConnectionsReadyForBackfill(userId, config)` in `lib/app-state/connection-guards.ts`. Checks: (1) a `StripeConnection` with `status === "connected"` whose `stripeAccountId` matches the config; (2) at least one `GoogleConnection` with `status === "connected"`. Returns a typed `ConnectionGuardResult`.
- In `/api/update/sync-config`: runs the guard when `syncStatus === "backfill_running"`, returning `409` on failure.
- In `/api/sync/init-backfill`: loads the sync config (previously not loaded at all), runs the guard, returns `409` before invoking the Lambda on failure.

### Bug: Trial failure could still persist `backfill_running` status

`components/onboarding/onboarding-wizard.tsx`

`saveSyncConfigSelection` (which sets `syncStatus: "backfill_running"`) was called regardless of whether `handleStartTrial()` succeeded. A failed trial would leave the config in `backfill_running` with no active trial and no backfill triggered.

- Short-circuits after `trialOk` with an early return before calling `saveSyncConfigSelection`.

### Snackbar: add `error` variant

`components/ui/snackbar.tsx`

Adds an `error` variant (red `AlertCircle` icon, red bar) to cover use cases that warrant stronger visual severity than `warning`.

---

## Files changed

| File | Change |
|------|--------|
| `components/onboarding/onboarding-wizard.tsx` | Client step guard, connected badges, snackbar improvements, trial ordering fix |
| `app/api/stripe/callback/route.ts` | Preserve signed `returnTo` on error; onboarding paths still get step 1 |
| `app/api/google/callback/route.ts` | Split success/error redirect targets; all error paths return to step 2 |
| `app/api/sync/init-backfill/route.ts` | Load config and run connection guard before firing Lambda |
| `app/api/update/sync-config/route.ts` | Run connection guard on `backfill_running` transition |
| `lib/app-state/connection-guards.ts` | New — `assertConnectionsReadyForBackfill` shared helper |
| `components/dashboard/dashboard.tsx` | Handle `stripeError` param; pass error state to `AccountPageClient` |
| `components/account/account-page-client.tsx` | Inline Stripe error alert with dismiss; show reconnect button on error |
| `components/ui/snackbar.tsx` | Add `error` variant |

---

## Test plan

- [ ] Cancel Stripe OAuth during onboarding → lands on step 1 with snackbar; cannot advance to step 2 without connecting
- [ ] Cancel Google OAuth during onboarding → lands on step 2 with snackbar; cannot advance to step 3 without granting access
- [ ] Complete Stripe + Google connect → can proceed through all steps normally; "Continue" CTA shown on satisfied steps
- [ ] Manually navigate to `/onboarding?step=3` without connections → clamped back with snackbar
- [ ] Cancel Stripe reconnect from account page → returns to `/dashboard` account view with inline error (not onboarding)
- [ ] Start backfill via API without connected Stripe or Google → `409` from both `/api/update/sync-config` and `/api/sync/init-backfill`
- [ ] Simulate trial failure on step 3 → config does not transition to `backfill_running`
