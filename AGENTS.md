# AGENTS.md

Working guide for AI agents (and humans) in this repo. [CONTEXT.md](./CONTEXT.md) has domain language, [docs/adr/](./docs/adr/) compiles decisions that are non-obvious from the code, and [docs/runbooks/](./docs/runbooks/) holds procedures a person carries out by hand.

## What this is

`asv2-web` — the SyncStaq Next.js (App Router) web app. It onboards users, links Stripe (Connect) + Google accounts, and triggers/monitors the sync of Stripe data into Google Sheets. The actual sync/backfill work runs in a **separate repo**, `asv2-serverless` (Lambdas), at `../asv2-serverless`. Shared schemas live in the `@blueplanit/asv2-shared` npm package.


## Layout

- `app/` — routes. `app/(app)/` authed app, `app/(marketing)/` public, `app/api/` route handlers.
- `components/` — React components grouped by area (`onboarding/`, `dashboard/`, `workspaces/`, `ui/`).
- `lib/` — non-UI logic. Notable: `lib/dynamo/` (DynamoDB access), `lib/app-state/` (user/onboarding state + guards), `lib/google/`, `lib/stripe/`, `lib/sync/` (backfill triggers).
- `lib/schemas/sync-config.ts` — re-exports the `SyncConfig` schema from `@blueplanit/asv2-shared`; the source of truth for the item shape lives in that package.

## Conventions

- **Server-only modules** that touch DynamoDB/AWS import `"server-only"`. Do not import them into client components — share pure logic via files like `lib/app-state/onboarding-status.ts` instead.
- **Comments:** prefer single-line, occasionally two. Simple, concise language. Explain *why*, not *what*.
- **Commit messages:** concise but sufficiently descriptive.
- Match the surrounding code's style, naming, and idioms rather than importing new patterns.

## Related repos

- `../asv2-serverless` — Lambdas (backfill, scheduler/master, sheet writer, recovery).
- `@blueplanit/asv2-shared` — shared Zod schemas and DynamoDB key builders.
