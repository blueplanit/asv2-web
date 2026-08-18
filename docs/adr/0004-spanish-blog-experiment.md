# ADR 0004: Spanish Blog Experiment

## Status

Proposed

## Context

SyncStaq is testing one Spanish search-intent page before investing in broader site
localization. The shared Contentful environment has one locale, and changing locale
behavior across the space would affect content owned by other websites.

## Decision

- Spanish posts remain separate `blogPostASv2` entries.
- The optional `language` field accepts `en` or `es`. A missing value means English, so
  existing entries need no migration.
- The optional `translationOf` field links the Spanish entry to its English source for
  editorial context.
- The cached listing reads each entry ID and `translationOf` relationship, allowing routing
  and `hreflang` to follow editorial links without another Contentful query or deployment.
- The optional `seoTitle` field lets editors use a search title that differs from the H1.
- English posts render at `/blog/[slug]`; Spanish posts render at `/es/blog/[slug]`.
- The cached blog listing continues to be the source for the index, slug guards, sitemap,
  and translation availability.
- Reciprocal language metadata and visible language links appear only when both entries are
  published with `showInProduction` enabled.
- The Spanish article marks its content with `lang="es"`. The shared English header and
  footer retain their existing language behavior.

## Publication

1. Review the Spanish draft in Contentful.
2. Set its publication date.
3. Enable `showInProduction`.
4. Publish the entry.

The existing Contentful webhook invalidates the entry and blog-listing cache tags. The
Spanish URL, sitemap entry, reciprocal `hreflang`, and language links then become available
without a site deployment.

## Consequences

This approach keeps the experiment isolated and preserves the current Contentful quota
strategy. Adding another translated article requires only a new Spanish entry linked to its
English source. A larger localization program should replace this entry-based convention with
a broader locale architecture.
