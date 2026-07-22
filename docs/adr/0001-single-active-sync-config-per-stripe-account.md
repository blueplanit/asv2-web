# One active Sync Config per Stripe account

**Status:** accepted

For a given `(userId, stripeAccountId)`, at most one **Sync Config** may be non-`retired` at a time ("active"). Never two active configs for the same account. Retired configs may accumulate freely (they are the history left behind by [sheet rotation](../../CONTEXT.md)).

Today a user connects **exactly one** Stripe account, at onboarding, and cannot add or change it — so in practice a user has one active config, and per-user and per-account enforcement coincide. We scope the invariant **per `(userId, stripeAccountId)`** anyway because multiple Stripe accounts (each with its own active config and spreadsheet) is a planned later feature; scoping it per account now means that feature *relaxes* enforcement to match this rule rather than reversing a per-user decision.

We chose this as the simplest, bare-bones rule to ship an MVP fast, not because of an engine limitation. The sync plumbing is already keyed per spreadsheet (`SYNC_CURSOR#<stripeAccountId>#<spreadsheetId>`) and could likely support several active destinations per account, but there is no product or UI concept for that yet — so today a second active config for one account is **always a bug** (e.g. the onboarding re-entry duplicate), never a feature.

## Consequences

- **Enforced at write time, not reconciled after.** DynamoDB has no cross-item uniqueness, so the invariant is upheld by: onboarding re-entry guards (`hasCompletedOnboarding` / `hasAnyNonRetiredConfig` in `lib/app-state/`), a `409` on the create-sheet and sync-config update routes once onboarding is complete, and an atomic `TransactWriteCommand` for sheet rotation (`replaceSyncConfigAtomic`) that retires the old config and writes the new one together. Silent duplicates cause real corruption (double-writes, orphaned cursors), which is why we block them up front rather than clean up later.
- **"Active" means non-`retired`** — including `onboarding`, `paused`, and `error`. A half-finished or broken config still occupies the account's single slot.
- **Multiple Stripe accounts is a later feature.** Today's guards (`hasCompletedOnboarding` / `hasAnyNonRetiredConfig`) scan *all* of a user's configs, which is safe only because a user has one account. When multi-account lands, those checks must filter by `stripeAccountId` so a user can hold one active config per account. Write the superseding ADR then; do not silently widen the limit.
