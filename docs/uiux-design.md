# Stripe → Google Sheets Sync UI/UX Design (Next.js + NextAuth + Vercel + Tailwind + shadcn/ui)

## Core mental model
- **One workspace = one Stripe account mirrored into one Google Sheet.** Every screen reinforces the pairing: Stripe account, Google Sheet link, sync status.
- **System-managed raw data + user workspace:** Protected `*_raw` tabs per Stripe object, an editable `Working` tab, and a `README` tab explaining guardrails and overwrite behavior.

## Information architecture
- **Onboarding wizard (5 steps, progress indicator fixed at top):** Primary happy path for first-time visitors.
- **Dashboard:** Cards per workspace showing connection states, sync health, last sync, quick actions, and history table.
- **Sidebar (persistent):** Account avatar/name, sign out, settings, links to docs/support, and a control-center section (sync settings, reconnection flows, danger/reset controls).
- **Status surfaces:** Global banner for incidents, per-workspace health badges (Healthy/Delayed/Error/Needs attention), and inline error toasts.

## Onboarding wizard UX
- **Step 1 – Create account (Google sign-in via NextAuth):**
  - Call to action: “Continue with Google.”
  - Copy clarifies: only basic profile/email, no drive access yet.
  - After success, show step complete with checkmark.
- **Step 2 – Connect Stripe (Stripe Connect OAuth):**
  - Button: “Connect Stripe account.”
  - After OAuth, display selected business name, account ID, and status pill “Connected.”
  - Offer “Switch account” secondary action.
- **Step 3 – Connect Google Sheets (Google OAuth with `drive.file` + `spreadsheets` scopes):**
  - Explicit permission text: “We only create and manage sheets we generate. Existing files are not accessed.”
  - Show email of the granted Google identity and a “Reconnect” link if token refresh fails.
- **Step 4 – Create spreadsheet:**
  - Auto-name: `Stripe Sync – {Business}`.
  - Preview of sheet structure: cards for each tab (Invoices_raw, Charges_raw, Customers_raw, Payouts_raw, Working, README) with badges showing “Protected” or “Editable.”
  - Copy warning that raw tabs are overwritten on every sync and should remain untouched.
- **Step 5 – Configure sync:**
  - Toggles/chips per Stripe object (Invoices, Charges, Customers, Payouts, Refunds, Balance transactions) and optional history depth (e.g., 90/180/365 days or “All available”).
  - Primary button: “Start backfill & sync.”
  - Immediately transitions into status view with animated progress, last checkpoint time, and link “Open sheet.”

### Empty/error handling during onboarding
- If Stripe/Google connection fails, show inline error with retry and support link.
- Persist partial progress; wizard re-opens at the first incomplete step after re-authentication.
- Graceful cancel/back navigation that preserves state but warns about unsaved selections.

## Post-onboarding dashboard
- **Workspace card content:**
  - Title: business name + sheet name; secondary link: “Open sheet.”
  - Connection pills: Stripe (Connected/Expired), Google (Connected/Re-auth needed).
  - Health badge: Healthy/Delayed/Error.
  - Last sync timestamp (“Up to date as of 2:42 PM UTC”).
  - Primary CTA: “Sync now.” When pressed, switch to “Sync requested…” with spinner and disable repeat clicks until job acknowledged.
  - Secondary actions: “View history,” “Edit sync settings,” “Reconnect.”
- **Sync history table:** timestamp, trigger (auto/manual/backfill), objects included, duration, rows written, status, error tooltip.
- **Banner states:**
  - Delayed: “Sync running slower than expected. Last successful run 18m ago.”
  - Error: “We couldn’t update your sheet. Reconnect Google to continue.”
  - Maintenance: “Stripe service incident detected; we’ll retry automatically.”

## Interaction with background sync model
- UI reflects three phases: **Initial backfill**, **Active sync**, **Degraded/Errored**.
- Status polling endpoint (e.g., `/api/workspaces/:id/status`) returns per-object checkpoints, row counts, and health summaries; UI polls more frequently during backfill, then every few minutes.
- “Sync now” enqueues a job and immediately updates UI to `Requested`. Job completion updates last sync time and health badge.
- For large backfills, show incremental counters per object (e.g., “Invoices: 2,341 of 9,200”).

## Trust, clarity, and speed
- Always show which identities are connected: Google email + Stripe business name.
- Permission copy when requesting scopes; confirm that only app-created sheets are accessed.
- Warn before destructive actions (e.g., “Reset workspace” deletes sheet references but does not delete Stripe data).
- Minimal configuration: defaults to syncing core objects and 180-day history.
- Surfaces reconciliation: show per-object freshness and checksum parity (when backend provides signals) to assure data integrity.

## UI primitives (Tailwind + shadcn/ui)
- **Layout:** App shell with sidebar (`<Sheet>` for mobile), top-level header for breadcrumbs and banners.
- **Components:**
  - Stepper/progress bar (5 steps) with icons and completion states.
  - Cards for workspace summaries; `Badge` for statuses; `Alert` for warnings/errors; `Table` for sync history; `Tabs` for settings sections.
  - `Button` variants for primary/secondary/ghost; loading states use spinners.
  - `Tooltip` on permissions and statuses; `Dialog` for confirmation (reset/reconnect); `Toast` for transient success/failure.
- **Theming:** Light/dark support via `next-themes`; consistent spacing and typographic scale for readability.

## AuthN/AuthZ flows
- **NextAuth providers:**
  - Google (for app identity + Sheets access). Store refresh tokens securely; request incremental scopes (profile/email first, then drive.file + spreadsheets during Step 3) using Google’s consent screen and `prompt=consent` when upgrading.
  - Stripe Connect OAuth handled via server route that stores Stripe account ID + publishable display name in DB; mark workspace as pending until both providers connected.
- **Session handling:**
  - Protect dashboard/routes with middleware; redirect unauthenticated users to wizard start.
  - Show inline “Session expired—sign back in” toast and CTA.

## Data views in the sheet
- Protected tabs suffixed `_raw`; each row maps 1:1 to a Stripe object with immutable IDs and checksum columns.
- `Working` tab includes sample pivot/lookup formulas; README tab documents refresh cadence, overwrite rules, and contacts.
- “Open sheet” always available from wizard step 5 and dashboard cards.

## Accessibility and performance
- Keyboard navigation across wizard steps; visible focus rings (Tailwind outline utilities).
- Announce status changes with `aria-live` regions (e.g., “Sync requested…”, “Backfill 42%”).
- Lazy-load secondary data (history table) to keep dashboard snappy; cache sheet metadata client-side with SWR/React Query and revalidate on focus.

## Future extensions
- Support multiple workspaces per user (list + create new workspace flow) without changing core mental model.
- Inline guidance videos or walkthroughs anchored to wizard steps.
- Notifications (email/in-app) for sustained delays or repeated errors.
