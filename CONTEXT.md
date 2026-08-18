# SyncStaq Web App

The Next.js web app for SyncStaq: it onboards a user, connects their Stripe and Google accounts, and continuously syncs Stripe data into a Google Sheet. This file is the shared glossary — use these terms exactly, in code and in conversation.

## Language

### Core entities

**Sync Config**:
The durable record binding one **Connected Account** to one **Workspace Spreadsheet**, plus its sync lifecycle (`syncStatus`, cursors, history window). Stored in DynamoDB as `USER#<userId>` / `SYNC#<spreadsheetId>`. This is the entity most invariants govern.
_Avoid_: "sync", "sync record", "config" (ambiguous).

**Active Sync Config**:
A **Sync Config** whose `syncStatus` is anything other than `retired`. There is **at most one per (User, Connected Account)** — see [ADR-0001](./docs/adr/0001-single-active-sync-config-per-stripe-account.md).
_Avoid_: "current config", "live config". Note "active" ≠ only `syncing`; it means non-retired.

**Workspace Spreadsheet**:
The Google Sheets file a **Sync Config** writes into. Contains many **Tabs**.
_Avoid_: "the sheet" (overloaded — see Flagged ambiguities), "workbook".

**Tab**:
An individual worksheet inside a **Workspace Spreadsheet** (e.g. the Working Sheet, or a per-Stripe-object data tab). Bound via the Sync Config's `stripeDataSyncMap`.
_Avoid_: "sheet", "page".

**Connected Account**:
A Stripe account the user has linked via Stripe Connect (`stripeAccountId`). Today a user connects **exactly one**, at onboarding, and cannot add or change it; multiple accounts per user is a planned later feature.
_Avoid_: "account" bare (collides with the app User), "Stripe account" is acceptable as an alias.

### Lifecycle

**Onboarding**:
The one-time flow that takes a new user from sign-up through connecting Stripe + Google to a first **Active Sync Config**. Once complete, a user cannot re-enter it (enforced server- and client-side).

**Backfill**:
The initial load that fills a **Workspace Spreadsheet** with the account's recent Stripe history and seeds the Sync Config's **Sync Cursors**, then flips `syncStatus` from `backfill_running` to `syncing`. Runs in the `asv2-serverless` Lambdas; the web app only *triggers* it.
_Avoid_: "import", "initial sync".

**Sync Cursor**:
The last Stripe event id processed for a given `(stripeAccountId, spreadsheetId)`, stored per spreadsheet (`SYNC_CURSOR#…` and `BALANCE_TRANSACTION_SYNC_CURSOR#…`). The scheduler resumes from it each tick.
_Avoid_: "checkpoint", "offset".

**Sheet Rotation**:
Replacing a user's **Active Sync Config** + **Workspace Spreadsheet** with a fresh pair (e.g. when the old sheet nears capacity). The old Sync Config becomes `retired` and a new one is created + backfilled — **atomically**, so the (User, Connected Account) never has zero or two active configs at once.
_Avoid_: "sheet swap", "migrate".

### Content

**Blog Post**:
A `blogPostASv2` entry. An English post renders at `/blog/<slug>`, a Spanish post at `/es/blog/<slug>`.

**Blog Language**:
The `language` field on a Blog Post, `en` or `es`. A missing value means English, so existing entries need no migration.

**Translation Link**:
The `translationOf` field on a Spanish Blog Post, naming its English source. It supplies the reciprocal `hreflang` and the language links. See [ADR-0004](./docs/adr/0004-spanish-blog-experiment.md).
_Avoid_: "translation pair" (no pairing is stored outside the entries).

**SEO Title**:
The optional `seoTitle` field on a Blog Post. A search title that differs from the on-page H1.

**CMS Page**:
A `pageASv2` entry, rendered at `/pages/<slug>`. Not a marketing route like `/pricing`, which is code.
_Avoid_: "page" bare (collides with a Next.js route).

**Copy Config**:
An `aSv2CopyAndConfig` entry, keyed by `pageKey`, supplying copy to a route that is otherwise code.

**Delivery Quota**:
The 100,000 monthly Contentful Delivery API calls shared by all three websites.
_Avoid_: "rate limit" (it is a monthly budget).

**Backstop Window**:
How long a cached Contentful read survives with no webhook. Insurance against a failed webhook, not a freshness setting. See [ADR-0003](./docs/adr/0003-contentful-delivery-quota.md).

## Relationships

- A **User** connects exactly one **Connected Account** today (multiple per user is a later feature).
- An **Active Sync Config** binds exactly one **Connected Account** to exactly one **Workspace Spreadsheet**.
- For each **(User, Connected Account)** there is **at most one Active Sync Config**; retired ones may accumulate.
- A **Workspace Spreadsheet** contains many **Tabs**.
- **Backfill** seeds a **Sync Config**'s **Sync Cursors**; the scheduler then advances them each tick.
- **Sheet Rotation** retires one **Sync Config** and creates its replacement in the same atomic write.

## Example dialogue

> **Dev:** "Once we let a user connect a second **Connected Account**, do we reuse their **Workspace Spreadsheet**?"
> **Domain expert:** "No — each account gets its own **Active Sync Config** and its own spreadsheet. That's why the one-active limit is scoped per account, not per user, even though today everyone has just one account."
> **Dev:** "And if their sheet fills up?"
> **Domain expert:** "That's a **Sheet Rotation**: the old **Sync Config** goes `retired`, a new one is created and **backfilled** so its **Sync Cursors** point at the new spreadsheet. Never two active at once."

## Flagged ambiguities

- **"account"** was used for both the app **User** and a Stripe **Connected Account** — resolved: distinct. "Account" unqualified is discouraged.
- **"sheet"** meant both the whole Google file and an individual worksheet — resolved: the file is a **Workspace Spreadsheet**, a worksheet is a **Tab**. `createWorkspaceSheetAndConfig` / `workspaceSheetTitle` predate this and mean the spreadsheet.
- **"active"** could read as `syncing`-only — resolved: **active = non-retired** for invariant purposes.
