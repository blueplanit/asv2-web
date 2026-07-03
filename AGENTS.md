# AGENTS.md

Working guide for AI agents (and humans) in this repo. Read this first, then [CONTEXT.md](./CONTEXT.md) for domain language and [docs/adr/](./docs/adr/) for decisions that are non-obvious from the code.

## What this is

`asv2-web` — the SyncStaq Next.js (App Router) web app. It onboards users, links Stripe (Connect) + Google accounts, and triggers/monitors the sync of Stripe data into Google Sheets. The actual sync/backfill work runs in a **separate repo**, `asv2-serverless` (Lambdas), at `../asv2-serverless`. Shared schemas live in the `@blueplanit/asv2-shared` npm package.

## Commands

```bash
npm run dev      # local dev server (localhost:3000)
npm run build    # production build (also the fastest full type-check)
npm run lint     # eslint
npx tsc --noEmit # type-check without building
```

There is no test runner configured. Verify changes with `tsc` + `build`, and manually where behavior matters.

## Layout

- `app/` — routes. `app/(app)/` authed app, `app/(marketing)/` public, `app/api/` route handlers.
- `components/` — React components grouped by area (`onboarding/`, `dashboard/`, `workspaces/`, `ui/`).
- `lib/` — non-UI logic. Notable: `lib/dynamo/` (DynamoDB access), `lib/app-state/` (user/onboarding state + guards), `lib/google/`, `lib/stripe/`, `lib/sync/` (backfill triggers).
- `lib/schemas/sync-config.ts` — re-exports the `SyncConfig` schema from `@blueplanit/asv2-shared`; the source of truth for the item shape lives in that package.

## Domain invariants to respect

- **One active Sync Config per (user, Stripe account).** See [ADR-0001](./docs/adr/0001-single-active-sync-config-per-stripe-account.md). Never create a second non-`retired` config for the same account; use `hasCompletedOnboarding` / `hasAnyNonRetiredConfig` guards and `replaceSyncConfigAtomic` for rotation.
- **Onboarding is one-way.** A user who has completed onboarding must never re-enter it (back button, refresh, direct endpoint hits). Guards live in `lib/app-state/` and the onboarding routes/components.
- **The web app triggers backfill; it does not run it.** Sync/backfill/cursor logic is in `asv2-serverless`. Cursor seeding and the `backfill_running → syncing` flip happen there.

## Conventions

- **Server-only modules** that touch DynamoDB/AWS import `"server-only"`. Do not import them into client components — share pure logic via files like `lib/app-state/onboarding-status.ts` instead.
- **Comments:** prefer single-line, occasionally two. Simple, concise language. Explain *why*, not *what*.
- **Commit messages:** concise but sufficiently descriptive.
- Match the surrounding code's style, naming, and idioms rather than importing new patterns.

## Related repos

- `../asv2-serverless` — Lambdas (backfill, scheduler/master, sheet writer, recovery).
- `@blueplanit/asv2-shared` — shared Zod schemas and DynamoDB key builders.
