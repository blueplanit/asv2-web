# Contextual Reporting Outcomes

Status: staged for review, not published.

## Scope

Four English articles receive one contextual link beside their existing worked example or relevant reporting subsection. The existing Contentful document is not changed. The renderer inserts the paragraph only when its configured heading and example are present, and skips it when that destination already appears in the document. Spanish and unrelated articles are unchanged.

The Sample Sheet page receives a three-step synthetic refund illustration below its existing preview. It reuses the public Fees and Refunds template screenshot and definitions. No Stripe record or Google Sheet is modified. The illustration is explicitly not evidence of a live sync: the source update is shown at the next hourly-sync step, and formulas are user-maintained reporting logic.

## Measurement

New event: `SyncStaq: Reporting Outcome Clicked`.

Trigger: an intentional click on one of the scoped contextual article links or the demonstration's template link. Normal link navigation is unchanged.

Properties: `origin_path`, `destination_path`, `placement`, `outcome`, and `experiment_version` (`reporting-outcomes-v1`). Values come from static public configuration, not full URLs, query strings, email addresses, click IDs, or user-entered content. The existing Amplitude SDK identity model remains unchanged; no persistent attribution cookie or new signup/trial emitter is introduced.

Use the existing `Signed Up`, `Stripe Connected`, `Google Connected`, `Workspace Spreadsheet Created`, `Trial Started`, `Onboarding Completed`, and `Backfill Completed` events downstream. For web-to-server transitions use ordered same-user funnels, not mandatory same-session funnels. Validate authenticated-email and identity-prefix internal suppression before publishing conversion counts. Keep unknown identities and unmatched activity visible.

Primary test: contextual outcome click -> verified external signup within 24 hours -> first completed backfill within 30 days. Check that Backfill Completed represents the first completed initial sync, and disclose its browser-poller coverage limitation. Do not equate a checkout, template open, or outbound sample-Sheet click with an activated account. Stripe remains authoritative for paid outcomes.

Use current page views as opportunity counts, not verified CTA exposures or qualified buyers. The click event is prospective; record its actual deployment date and do not backfill it or imply continuity with earlier data. Small samples and immature 30-day cohorts are inconclusive. Do not use exits or missing clicks alone as evidence of a copy problem.

## Review And Validation

Run `node --test tests/reporting-outcomes.test.cjs`. Review all four article placements and the illustrative amount changes on desktop and mobile. Confirm the disclaimer, template limitations, unchanged auth/billing paths, and absence of private data. Deployment is a separate approval decision.
