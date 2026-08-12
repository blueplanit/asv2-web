This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## For shared schemas package
npm install via "export NPM_TOKEN_PAT=your github user PAT; npm i @blueplanit/asv2-shared"

## Amplitude analytics

Set this environment variable to enable client analytics:

```bash
NEXT_PUBLIC_AMPLITUDE_API_KEY=your_amplitude_project_api_key
```

Amplitude initializes in `components/providers/app-providers.tsx` through `components/analytics/amplitude-init.tsx`.

To track custom events in client components, use:

```ts
import { trackAmplitudeEvent } from "@/lib/analytics/amplitude-client";

trackAmplitudeEvent("Button Clicked", { source: "pricing_page" });
```

## Onboarding survey responses (Google Sheet via SSM)

Survey answers from the post-activation modal are appended to an internal Google Sheet. Credentials are read from **AWS Systems Manager Parameter Store** (dev and prod).

### How it works

After onboarding, the backfill intro modal (`components/dashboard/backfill-intro-modal.tsx`) shows a two-question, free-text survey before the confirmation card:

1. **Q1** — "What best describes your role?" (free text, optional)
2. **Q2** — "What problem are you trying to solve with SyncStaq?" (free text, required to submit)
3. **Confirmation** — "We're loading your Stripe data…" with Open Sheet / Got it

Both questions are skippable and jump to the confirmation card. **Skip** still captures anything the user already typed — e.g. entering a role then skipping Q2 records the real role and `"skipped"` for the problem; only fields left blank fall back to `"skipped"` (the API requires both fields non-empty). Submitting is fire-and-forget (a failed `POST` never blocks the UI) and posts to `POST /api/onboarding/survey`, which is session-gated, origin-checked (`lib/http/allowed-origins.ts`), rate-limited, and trims/length-caps the inputs before appending a row.

### SSM parameters

| Parameter | Type | Value |
|-----------|------|--------|
| `/${project}/${stage}/google-service-account/reporting-sheet-writer` | SecureString | Existing reporting service-account JSON (reused) |
| `/${project}/${stage}/survey/responses-sheet-id` | String | Google Spreadsheet ID for survey responses |

### Web app env vars (parameter names only)

```bash
SURVEY_SERVICE_ACCOUNT_PARAM_NAME=/${project}/${stage}/google-service-account/reporting-sheet-writer
SURVEY_RESPONSES_SHEET_ID_PARAM_NAME=/${project}/${stage}/survey/responses-sheet-id
```

The web app IAM user needs `ssm:GetParameter` on both parameters (granted in `asv2-serverless` `app-stack.ts`).

### One-time setup (dev + prod)

1. Create a Google Sheet with header row: `timestamp`, `userId`, `email`, `role`, `problem`.
2. Share the sheet with the **reporting service-account** email (`client_email` from the SSM JSON) as Editor.
3. Create the `survey/responses-sheet-id` SSM String parameter with the spreadsheet ID.
4. Set `SURVEY_*_PARAM_NAME` env vars on the web app host.

Survey answers are written with `valueInputOption: "RAW"` and formula-trigger characters are neutralized to prevent spreadsheet formula injection.

## Contentful revalidation webhook

One Contentful space serves three websites on a shared quota of 100,000 Delivery API
calls per month. Every Contentful read here is cached for 7 days, and a webhook expires
that cache when content changes. See [ADR-0003](./docs/adr/0003-contentful-delivery-quota.md).

**Without the webhook, a published change takes up to 7 days to appear.** The steps below
are required, not optional.

### Web app env var

```bash
CONTENTFUL_WEBHOOK_SECRET=<a long random string>
```

Generate one with `openssl rand -hex 32`. Set it in Vercel for production and preview.

### One-time Contentful setup

1. In the space, open **Settings → Webhooks** and add a webhook named `asv2-web revalidate`.
2. Set the URL to `https://www.syncstaq.com/api/revalidate`, method `POST`.
3. Under **Triggers**, select *Entry* only, for `publish`, `unpublish`, `delete`, and `archive`.
   The endpoint ignores every other entity, so Asset triggers only waste deliveries.
4. Under **Headers**, add a secret header `x-revalidate-secret` with the value above.
5. Leave the payload as the default. The endpoint reads `sys.id`, `sys.updatedAt`,
   `sys.contentType`, `fields.slug`, and `fields.pageKey`.

### Checking it works

Publish any entry, then open the webhook's **Activity log**.

- **200 with `confirmed: true`** — the change is live.
- **200 with `revalidated: false`** — the entry belongs to one of the other two websites.
  This is expected and is not a failure.
- **503** — the endpoint could not confirm the change against the Delivery API. Contentful
  retries. A run of these means content is stale, so check the log.

A silently broken webhook is invisible for up to 7 days, so check this log after any change
to the endpoint or the secret.
