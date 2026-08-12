# ADR-0003: Contentful reads are cached behind a webhook

**Status:** Accepted
**Date:** 2026-08-12

## Context

One Contentful space serves three websites: `asv2-web`, `blueplanitnext`, and
`sync2gs_web`. The free plan allows 100,000 Delivery API calls per month across
all three. Usage is close to that limit.

Three facts made this repo spend far more calls than it needs:

- **The SDK sends requests with axios, not `fetch`.** Next.js only caches a
  `fetch`. Every Contentful read here was therefore a real API call. Nothing in
  the repo wrapped a read in a cache.
- **`/pricing` and `/pages/[slug]` rendered on every request.** `/pricing` called
  `getServerSession`, which reads cookies and forces dynamic rendering. Its
  `revalidate = 60` never applied. `/pages/[slug]` declared no
  `generateStaticParams`, so nothing was prerendered. Both spent a call per page
  view.
- **The revalidation window was 60 seconds.** `/`, `/blog`, and `/blog/[slug]`
  each regenerated up to once a minute. Twenty posts plus two index pages meant
  up to 22 routes doing this under steady crawler traffic.

Two routes also took their slug from the URL without checking it first. Any
visitor could invent a slug and spend a call. The space serves three websites,
so most slugs in it belong elsewhere.

The other two websites already solved this. `sync2gs_web` is the closer model.

## Decisions

### 1. Every read is cached and tagged

`unstable_cache` wraps each Contentful read. Each cached read carries cache tags:
one for its content type, one for its own slug or `pageKey`.

Next 16 offers `use cache` as the newer API. It needs the `cacheComponents`
flag, which changes rendering rules for every route in the app. That includes
the authed dashboard and onboarding routes, which have nothing to do with
Contentful. `unstable_cache` buys the same saving and touches only these files.
Both siblings already use it.

### 2. The webhook delivers content; the window is a backstop

A Contentful webhook calls `/api/revalidate` and expires cache tags. Published
changes reach the site in seconds.

Time-based revalidation drops from 60 seconds to 7 days. It no longer delivers
content. It only catches a webhook that failed.

The 7 days is for consistency with the other two repos, not for the savings. Most
of the win is in the first step away from 60 seconds. A move from 24 hours to 7
days saves almost nothing further.

**A future reader will read `revalidate = 604800` as a bug. It is not.** It is
only reachable when the webhook has already failed.

### 3. The webhook confirms a change before it expires a tag

Contentful accepts a publish before its Delivery API serves the new version. The
endpoint polls that API for up to 15 seconds and waits for the new version. It
answers 503 when it cannot confirm, so Contentful retries.

Without this, a visitor arriving during the lag refills the cache from the **old**
version. That also starts a fresh 7-day window. One publish would pin stale
content for a week, and the webhook would report success throughout.

Polling costs up to 15 calls per publish. At this publishing volume that is under
100 calls a month. The long window is what makes the failure it prevents severe.

### 4. An unknown slug costs no call

`/blog/[slug]` and `/pages/[slug]` check the slug against the cached listing
before they read the entry. The listing is already cached for the sitemap, so the
check is free. An unknown slug returns 404 without touching Contentful.

`sync2gs_web` hardcodes its allowlist, because the info pages it serves are a
fixed set shared with other websites. This repo does not copy that.
`blogPostASv2` and `pageASv2` are this site's own content types, so a listing of
them *is* the allowlist. A new CMS page then needs no deploy.

`dynamicParams` stays at its default of `true`. A newly published post is not in
`generateStaticParams`, which runs at build time. The webhook expires the listing
tag, so the guard already knows the new slug. The post renders on demand.

### 5. `/pricing` renders statically

The page no longer calls `getServerSession`. `PricingClient` reads the session in
the browser instead.

A logged-in visitor now sees the logged-out call to action for a moment after
load. This affects the button label and the free-trial line. Prices, copy, and
layout are identical either way, and crawlers see the static HTML.

`PRICING_PAGE_VIEWED` now fires after the session resolves, not on mount. Firing
on mount would report every visitor as logged out, because `useSession` reports
`loading` first. The event is lost for a visitor who leaves before the session
call returns. That loss is small and falls on both groups equally. A wrong
boolean would instead corrupt the split on the one page where it matters.

### 6. A failure is never cached

The cache stores successful reads only.

`getMarketingCopy` and `getPricingCopy` still fall back to their `DEFAULT_*`
copy, which is real hand-maintained text. The fallback now sits outside the
cache, so an outage cannot store it.

`app/sitemap.ts` no longer catches. It previously returned an empty sitemap on
error, which was safe under an hourly rebuild. Under a 7-day window, one failed
regeneration would drop every blog post from the sitemap for a week. A throw
makes Next keep serving the last good `sitemap.xml` instead. A cold build during
a Contentful outage now fails loudly, which is the safer failure.

## Consequences

- An editor who replaces a cover image without republishing the post keeps the
  old image for up to 7 days. Asset webhooks are ignored on purpose. Acting on
  them would let one deleted image expire every cached post.
- A broken webhook is invisible for up to 7 days. The Contentful activity log is
  the only place it shows. This is the main cost of the long window.
- Vercel preview deployments still hide entries whose `showInProduction` is
  false, because Vercel sets `NODE_ENV=production` for preview builds.
  `VERCEL_ENV` is what separates preview from production. This behaviour predates
  this ADR and is deliberately left alone. `isProd` is now part of every cache
  key, so a development entry can never satisfy a production request.
- The design assumes Vercel. `unstable_cache` needs a store shared across
  instances, and `revalidateTag` needs to reach every instance. Self-hosting this
  app requires a cache handler first.
