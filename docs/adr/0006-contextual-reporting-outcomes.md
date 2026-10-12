# Contextual Reporting Outcomes

Status: staged for review, not published.

## Scope

Article copy and link placement belong in Contentful. Four English entries have unpublished closing CTA updates, using the existing `ctaBlock` content type. Their template links appear after the conclusion rather than interrupting worked examples. The existing closing trial message is retained in the same callout. The app renders the CMS document directly; it does not insert article paragraphs, choose editorial anchors, or supply fallback copy. Spanish and unrelated entries are unchanged. Both the article changes and their new referenced blocks require separate publishing approval.

The Sample Sheet page receives a three-step synthetic refund illustration below its existing preview. It reuses the public Fees and Refunds template screenshot and definitions. No Stripe record or Google Sheet is modified. The illustration is explicitly not evidence of a live sync: the source update is shown at the next hourly-sync step, and formulas are user-maintained reporting logic.

## Measurement

New event: `SyncStaq: Reporting Outcome Clicked`.

Trigger: an intentional click on the demonstration's template link. Normal link navigation is unchanged. Standard CMS hyperlinks do not currently emit this new event; do not claim article-level click attribution from it. Existing destination page views can indicate navigation but cannot isolate a CTA click or its placement.

Properties: `origin_path`, `destination_path`, `placement`, `outcome`, and `experiment_version` (`reporting-outcomes-v1`). Values come from static public configuration, not full URLs, query strings, email addresses, click IDs, or user-entered content. The existing Amplitude SDK identity model remains unchanged; no persistent attribution cookie or new signup/trial emitter is introduced.

Use the existing `Signed Up`, `Stripe Connected`, `Google Connected`, `Workspace Spreadsheet Created`, `Trial Started`, `Onboarding Completed`, and `Backfill Completed` events downstream. For web-to-server transitions use ordered same-user funnels, not mandatory same-session funnels. Validate authenticated-email and identity-prefix internal suppression before publishing conversion counts. Keep unknown identities and unmatched activity visible.

Primary test: contextual outcome click -> verified external signup within 24 hours -> first completed backfill within 30 days. Check that Backfill Completed represents the first completed initial sync, and disclose its browser-poller coverage limitation. Do not equate a checkout, template open, or outbound sample-Sheet click with an activated account. Stripe remains authoritative for paid outcomes.

Use current page views as opportunity counts, not verified CTA exposures or qualified buyers. The click event is prospective; record its actual deployment date and do not backfill it or imply continuity with earlier data. Small samples and immature 30-day cohorts are inconclusive. Do not use exits or missing clicks alone as evidence of a copy problem.

## Review And Validation

Run `node --test tests/reporting-outcomes.test.cjs`. Review the four actual CMS drafts and the illustrative amount changes on desktop and mobile. Confirm uninterrupted worked examples, distinct closing callouts, the disclaimer, template limitations, unchanged auth/billing paths, and absence of private data. Deployment and CMS publishing are separate approval decisions.
