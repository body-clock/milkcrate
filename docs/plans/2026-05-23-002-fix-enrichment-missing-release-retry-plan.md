---
title: "Fix: Retry enrichment for releases that never received a Release record"
type: fix
status: active
date: 2026-05-23
---

# Fix: Retry enrichment for releases that never received a Release record

## Summary

When `EnrichmentService` is called with `listing_ids` (only changed listings), releases that failed enrichment on earlier attempts and have no `Release` record are never retried. Fix by also including release IDs from the store whose listings have no corresponding `Release` record, ensuring failed enrichments get a second chance on the next sync cycle.

---

## Problem Frame

The Discogs seller inventory API (`/users/{username}/inventory`) does not return `genres`, `styles`, or want/have counts. These fields must be populated by the `EnrichmentJob`, which calls the Discogs release API (`/releases/{id}`) — one API call per unique release ID.

When enrichment fails for a release (rate limiting, API error, timeout), the `enrich_release` method rescues the error and moves on — but no `Release` record is created for that release. On subsequent syncs, `FullStoreSyncJob` only passes `listing_ids` for **new or materially changed** listings to `EnrichmentJob`. Since the failed release's listing hasn't changed, its release ID never appears in the scope, and the release is **never retried**.

The result at `milkcrate.fm/amoebasf`: ~1,981 vinyl listings, but only 18 records surface in crates, and 9 of those have empty genres. No genre crates are built because `genre_counts` is nearly empty.

---

## Requirements

- R1. Releases that have no `Release` record (never successfully enriched) should be retried on the next enrichment cycle, even if their listings haven't changed.

---

## Scope Boundaries

- Releases that DO have a `Release` record and are not stale (`enriched_at < 7.days.ago`) should still be skipped — no behavioral change there.
- No change to how `listing_ids` is computed in `FullStoreSyncJob` — the fix lives entirely in `EnrichmentService#enrich_releases`.
- No change to `DailyCurationJob`, `StorefrontCuration`, or any curation logic — after enrichment populates genres, the next curation cycle will naturally pick them up.

---

## Context & Research

### Relevant Code and Patterns

- `app/services/enrichment_service.rb` — `#enrich_releases` method. Currently scopes to release IDs from `listing_ids`, then filters further by staleness.
- `app/models/release.rb` — `stale?` check: `enriched_at.nil? || enriched_at < 7.days.ago`.
- `app/jobs/full_store_sync_job.rb` — passes `listing_ids` (only newly-created or materially-changed listings) to `EnrichmentJob`.
- `spec/services/enrichment_service_spec.rb` — existing test: "skips releases that are not stale."

### Institutional Learnings

- `docs/solutions/integration-issues/discogs-rate-limit-middleware-2026-05-19.md` — documents rate limit issues and the Faraday middleware that retries 429s. Some releases still fail through after 3 retries, producing the gap this plan addresses.
- `docs/solutions/architecture-patterns/crate-strategies-pattern-2026-05-07.md` — documents how crate strategies depend on enriched genre data.

---

## Key Technical Decisions

- **Add un-enriched release IDs alongside `listing_ids` scope, not instead of it.** The `listing_ids` scope correctly limits work to changed listings; we're plugging the gap by also including releases that have no `Release` record.
- **Query for missing Release records via a single SQL query, not per-release lookups.** Find all release IDs in the store that have no matching `Release` entry. Efficient and avoids N+1.

---

## Implementation Units

### U1. Include un-enriched releases in enrich_releases scope

**Goal:** When `listing_ids` is provided, also include release IDs from the store whose listings have no `Release` record. This ensures releases that failed enrichment on a prior attempt are retried.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Modify: `app/services/enrichment_service.rb`
- Test: `spec/services/enrichment_service_spec.rb`

**Approach:**

In `EnrichmentService#enrich_releases`, after computing `release_ids` from the `listing_ids` scope, also query for release IDs from this store's listings that have no corresponding `Release` record:

```ruby
def enrich_releases(store, listing_ids: nil)
  scope = store.listings.where.not(discogs_release_id: nil)
  scope = scope.where(id: listing_ids) if listing_ids&.any?

  release_ids = scope.pluck(:discogs_release_id).uniq

  # Also include releases from this store that have never been enriched
  # (no Release record). This catches releases that failed enrichment on
  # a prior attempt — without this, they'd only be retried if their
  # listing materially changed in a subsequent sync.
  unenriched_release_ids = store.listings
    .where.not(discogs_release_id: nil)
    .where.not(discogs_release_id: release_ids)
    .where.not(
      discogs_release_id: Release.select(:discogs_release_id)
    )
    .distinct
    .pluck(:discogs_release_id)

  all_release_ids = (release_ids + unenriched_release_ids).uniq

  stale_release_ids = all_release_ids.reject do |rid|
    Release.find_by(discogs_release_id: rid)&.then { |r| !r.stale? }
  end

  # ... rest unchanged
```

Wait — the `stale_release_ids` logic already covers releases with no `Release` record (they're stale because `enriched_at.nil?`). So we just need to expand `release_ids` to include them. The simplest approach:

```ruby
def enrich_releases(store, listing_ids: nil)
  scope = store.listings.where.not(discogs_release_id: nil)
  scope = scope.where(id: listing_ids) if listing_ids&.any?
  listing_release_ids = scope.pluck(:discogs_release_id).uniq

  # Also include releases from this store's listings that were never
  # successfully enriched (no Release record exists). These releases
  # failed enrichment on a prior pass and would otherwise never be
  # retried — see the RateLimitError gap documented in
  # docs/solutions/integration-issues/discogs-rate-limit-middleware-2026-05-19.md
  unenriched_release_ids = store.listings
    .where.not(discogs_release_id: listing_release_ids)
    .where.not(
      discogs_release_id: Release.select(:discogs_release_id)
    )
    .distinct
    .pluck(:discogs_release_id)

  release_ids = (listing_release_ids + unenriched_release_ids).uniq

  stale_release_ids = release_ids.reject do |rid|
    Release.find_by(discogs_release_id: rid)&.then { |r| !r.stale? }
  end
  # ... rest unchanged
```

**Patterns to follow:**
- Existing `stale_release_ids` rejection logic — same pattern, just expanded source set.
- The `Release.select(:discogs_release_id)` subquery pattern is already used elsewhere in the service (e.g., `enrich_music_brainz_images` method joins the `releases` table).

**Test scenarios:**

- **Happy path — un-enriched release gets retried:** Create a listing with `discogs_release_id` that has no `Release` record. Call `enrich_releases` with a `listing_ids` scope that does NOT include this listing's ID (simulating a later sync where only a different listing changed). The release should still be enriched.
- **Already-enriched release is skipped:** Create a listing with `discogs_release_id` that has a recent `Release` record. Call `enrich_releases` with `listing_ids` that doesn't include this listing. The release should NOT be re-enriched (no Discogs API call).
- **Stale release is re-enriched:** Create a listing with `discogs_release_id` that has an old `Release` record (enriched > 7 days ago). The release should be enriched even if its listing ID isn't in `listing_ids`.
- **Listing_ids scope still works for changed listings:** A listing with `listing_ids` that HAS a recent `Release` record should still be enriched (existing behavior, ensure no regression).

**Verification:**
- All existing tests pass.
- New tests confirm un-enriched releases are picked up even outside the `listing_ids` scope.
- After deploying, the next sync cycle for Amoeba SF should show more releases being enriched (this can be verified via logs or by checking that genre crates appear on the storefront).
