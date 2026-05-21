# PR #43 — Stripe App Changes: Code Review Summary

**Branch:** `stripe-app-changes` → `main`
**Reviewed:** 2026-04-27
**Author:** tventures02

---

## Overview

This PR adds a Stripe app integration flow: a new `/stripe-app/start` page, two unauthenticated API endpoints (`/api/stripe-app/account-link`, `/api/stripe-app/sync-status`), and a new DynamoDB GSI lookup. It also refactors the login page to support a dynamic `callbackUrl`.

---

## Changes That Touch Existing Behavior

### 1. `app/(marketing)/login/page.tsx` — Authenticated redirect

**Before:** Authenticated users visiting `/login` were always redirected to `/dashboard` (hardcoded).

**After:** They are redirected to `callbackUrl` from query params, sanitized.

**Is base behavior preserved?**
- If no `callbackUrl` param → `sanitizeCallbackUrl` returns `/dashboard`. Same as before. ✓
- If `callbackUrl` is present → redirects accordingly.

**Is the sanitizer correct?** Yes, it covers the standard open-redirect vectors:
- Must start with `/`
- Must not start with `//` (protocol-relative URL)
- Must not contain `://`

**Verdict: The base case (no callbackUrl) is preserved. The new callbackUrl behavior is correctly guarded.**

---

### 2. `components/login-form.tsx` — `LoginForm` refactored with props

**Before:** Hardcoded `APP_NAME`, `"Sign in with Google"`, and `callbackUrl: "/dashboard"` inside `signIn()`.

**After:** All strings are prop-driven, with defaults matching the originals exactly.

**Is base behavior preserved?** Yes — calling `<LoginForm />` with no props produces identical output and behavior. ✓

---

### 3. `lib/schemas/stripe-connection.ts` — Schema extended

**Before:** Re-exported `StripeConnectionSchema` directly from shared package.

**After:** Locally extends it with `STRIPE_ACCOUNT_GSI_PK: z.string().optional()`.

Since it's `optional()`, existing items without the field parse without error. Any code consuming `StripeConnection` types is backward-compatible. ✓

---

### 4. `lib/stripe/stripe-connection.ts` — `putStripeConnection` now writes a new attribute

**Before:** Writes `{ type, userId, stripeAccountId, businessName, status, createdAt, updatedAt }` to DynamoDB.

**After:** Adds `STRIPE_ACCOUNT_GSI_PK: stripeAccountGsiPk(stripeAccountId)` to the same write.

**This is the most significant side effect.** It is correct for *new* connections, but:

- **Pre-existing `StripeConnection` items in DynamoDB do not have `STRIPE_ACCOUNT_GSI_PK`**, so they won't be indexed in the GSI.
- As a result, `listStripeConnectionsByAccountId` and `getSyncConfigsByStripeAccountId` will return empty results for any Stripe account linked *before* this deploy.
- This means the `/api/stripe-app/account-link` endpoint will return `hasStripeConnection: false` for existing users — a **silent incorrect result** that could misguide the Stripe app UI.

**Is it handled?** No. There is no data backfill, migration script, or fallback lookup. This is a gap that affects any user who connected Stripe before this PR ships.

> **Action required:** A one-time DynamoDB backfill that writes `STRIPE_ACCOUNT_GSI_PK` to all existing `StripeConnection` items is needed before or immediately after deploy.

---

## New Additions (No Base Behavior Impact)

- `app/(marketing)/stripe-app/start/page.tsx` — new route, no collision with existing routes. ✓
- `app/api/stripe-app/account-link/route.ts` — new route. ✓
- `app/api/stripe-app/sync-status/route.ts` — new route. ✓
- `lib/dynamo/sync-config.ts` — `getSyncConfigsByStripeAccountId` is additive; existing functions are untouched. ✓

---

## Additional Notes

- **CORS is fully open** — both new API routes reflect the request `Origin` header directly in `Access-Control-Allow-Origin`. Any website that knows a valid `acct_*` ID can call these endpoints. This appears intentional for Stripe app iframe context, but there is no origin allowlist.

- **Both new API routes are unauthenticated** — no session or API key check before querying DynamoDB. The `sync-status` route correctly strips sensitive fields (`spreadsheetId`, `userId`). The `account-link` route exposes whether a Stripe account ID has a linked connection (low sensitivity).

- **`getSyncConfigsByStripeAccountId` uses `begins_with` in `KeyConditionExpression`** — valid DynamoDB syntax for sort key prefix filtering. ✓

---

## Summary Table

| Area | Side Effect? | Handled? |
|---|---|---|
| Login page redirect (no callbackUrl) | No — preserves `/dashboard` | ✓ |
| LoginForm default appearance | No — defaults match originals | ✓ |
| StripeConnectionSchema parse compatibility | No — optional field is backward-safe | ✓ |
| `putStripeConnection` writes new GSI attribute | **Yes** — only new connections get indexed | **No — backfill required** |
| New routes / new functions | No base impact | ✓ |
