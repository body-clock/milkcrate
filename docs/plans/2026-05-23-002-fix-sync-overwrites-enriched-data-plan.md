---
title: "Fix: Sync overwrites enriched genres/format on every run"
type: fix
status: active
date: 2026-05-23
---

# Fix: Sync overwrites enriched genres/format on every run

## Summary

Every `FullStoreSyncJob` run re-upserts `format`, `genres`, and `styles` from the Discogs seller inventory API — which returns empty genres and a different format string — overwriting the data that `EnrichmentJob` carefully populated. On the next enrichment cycle, the Release record is still recent (not stale), so enrichment skips it. The result is a permanent cycle where enriched data is destroyed by every sync and never restored.

---

## Problem Frame

The Discogs seller inventory API (`/users/{username}/inventory`) does not return `genres`, `styles`, or `basic_information` on release objects. The `ListingNormalizer` stores these as `[]` (empty). The format string from this API (`release["format"]`) is also different from the enriched format string reconstructed from the release API's `formats` array.

Three bugs compound into the observed behavior at `milkcrate.fm/amoebasf` (1,981 vinyl listings, but only 28 with enriched data, zero genre crates):

### Bug 1: UPDATE_FIELDS includes format/genres/styles

`FullStoreSyncJob` defines:

```ruby
UPDATE_FIELDS = %i[
  discogs_release_id artist title label year
  format genres styles condition price currency
  thumbnail_url notes listed_at last_seen_at
].freeze
```

On every sync, ALL listings get their `format`, `genres`, and `styles` re-upserted from the sync API — which sets `genres=[]`, `styles=[]`, and `format="LP, Album"` (the sync format, no "Vinyl" prefix).

### Bug 2: materially_changed? re-detects the overwrite as a "change"

```ruby
def materially_changed?(existing, incoming)
  ...
  existing.format,  # "Vinyl, LP, Album" (enriched)
  ...
  incoming[:format], # "LP, Album" (sync)
  ...
end
```

After enrichment updates the format to "Vinyl, LP, Album", the next sync sees the format differ from the sync API's value, flags it as `materially_changed?`, and re-upserts the sync data over the enriched data.

### Bug 3: No retry for overwritten-but-recently-enriched releases

After the sync overwrites, enrichment runs but skips the release because its `Release` record has a recent `enriched_at` — the release is not stale, so it's not included in `stale_release_ids`. The listing stays in the reverted state permanently.

### The cycle

```
Sync → upsert(genres=[], format="LP, Album")  [enriched data destroyed]
Enrichment → skips (Release is fresh, not stale)
Sync → upsert(genres=[], format="LP, Album")  [same data, nothing changes]
Enrichment → skips (still fresh)
... forever
```

Only releases that trigger the "downgraded thumbnail" re-enrichment path (`cover_image_url = thumbnail_url`) escape this cycle. That's why exactly 28 listings have enriched data — they're the ones that were re-enriched via the downgraded-release check.

---

## Requirements

- R1. Sync must not overwrite `format`, `genres`, or `styles` on listings that have already been enriched.
- R2. Listings whose enriched data was destroyed by a prior sync must be detected and re-enriched.
- R3. Existing behavior for brand-new listings (first sync, no enrichment yet) must not regress — they should still get their initial sync format/genres, then enrichment upgrades them.

---

## Scope Boundaries

- No change to `EnrichmentJob`, `DailyCurationJob`, `StorefrontCuration`, or curation logic.
- No change to how `listing_ids` is computed — the enrichment fix is about detecting overwritten listings, not about changing the sync.
- The backfill (fixing existing damaged data) is a one-time operation and won't repeat.

---

## Context & Research

### Relevant Code and Patterns

- `app/jobs/full_store_sync_job.rb` — `UPDATE_FIELDS` constant (line 3-6), `import_listings` method, `materially_changed?` method.
- `app/services/enrichment_service.rb` — `enrich_releases` method, `stale_release_ids` logic.
- `app/models/release.rb` — `stale?` check: `enriched_at.nil? || enriched_at < 7.days.ago`.

### Evidence from Production

From `milkcrate.fm/amoebasf`:
- 1,964 Release records (all successfully enriched at some point)
- 1,981 listings have `want_count`/`have_count` populated (enrichment's unconditional update worked)
- **Only 28 listings** have enriched format (starts with "Vinyl") and populated genres
- **1,413 listings** have sync format (no "Vinyl" prefix) and empty genres

A sample listing (Leroy Vinnegar, release_id=27428673):
- Listing: `genres=[]`, `fmt="LP, Album, RE, 180"` (sync format)
- Release: `enriched_at=2026-05-21`, `want=94`, `have=1464`
- API for `/releases/27428673`: `genres=['Jazz']`, `formats=[{"name":"Vinyl","descriptions":["LP","Album","Reissue","Stereo"]}]`

The API clearly returns the data, the Release record exists, but the listing has the sync data. The sync overwrote it.

---

## Key Technical Decisions

- **Remove `format`, `genres`, `styles` from `UPDATE_FIELDS`.** These fields are enrichment-owned. The sync's job is to keep `discogs_listing_id`, `price`, `condition`, `notes`, `listed_at`, `last_seen_at` current — not to clobber curated data.
- **For backfill: detect overwritten listings by checking format.** A listing that has `genres=[]` AND `format NOT LIKE 'Vinyl%'` was enriched (Release record exists) but got reverted. These need one-time re-enrichment.
- **Enrichment scope expansion: include listings whose enriched data was overwritten.** In `enrich_releases`, also find release IDs where the listing's format is still the sync format (no "Vinyl" prefix) but a Release record exists. These releases were enriched but their listing was reverted — they need a re-enrich that will "stick" once UPDATE_FIELDS stops overwriting.

---

## Implementation Units

### U1. Stop sync from overwriting enriched fields

**Goal:** Remove `format`, `genres`, and `styles` from `UPDATE_FIELDS` so `upsert_all` never reverts enriched data.

**Requirements:** R1, R3

**Dependencies:** None

**Files:**
- Modify: `app/jobs/full_store_sync_job.rb`
- Test: `spec/jobs/full_store_sync_job_spec.rb`

**Approach:**

Change the `UPDATE_FIELDS` constant to exclude `format`, `genres`, and `styles`:

```ruby
UPDATE_FIELDS = %i[
  discogs_release_id artist title label year
  condition price currency
  thumbnail_url notes listed_at last_seen_at
].freeze
```

This means:
- New listings (first sync): all fields including format/genres/styles are inserted with sync data. Then enrichment upgrades them. ✓
- Existing listings (subsequent syncs): format/genres/styles are NOT touched. The enriched values survive. ✓
- `materially_changed?` no longer detects format differences as a "change" for already-enriched listings. ✓

R3 concern: on the very first sync for a brand-new store, format/genres/styles get inserted from sync data (empty). Enrichment runs immediately after, fills them in, and subsequent syncs don't overwrite. Same behavior as before, but now it sticks.

**Test scenarios:**

- **Enriched format survives sync:** Create a listing with enriched format (`"Vinyl, LP, Album"`). Run `FullStoreSyncJob` with sync data that has a different format (`"LP, Album"`). The listing should retain `"Vinyl, LP, Album"`.
- **Enriched genres survive sync:** Same with `['Jazz']` → sync data has `[]` → listing retains `['Jazz']`.
- **New listing still gets sync format:** Create a brand-new listing (no prior record). The sync upsert should insert the sync format/genres as before.
- **materially_changed? excludes format:** A listing whose only "change" is format difference should NOT be flagged as materially changed.

**Verification:**
- All existing tests pass.
- New tests confirm enriched data survives a sync cycle.

---

### U2. Re-enrich listings whose enriched data was overwritten

**Goal:** In `EnrichmentService#enrich_releases`, when `listing_ids` is provided, also include release IDs from the store's listings that have a Release record but whose format shows they were overwritten by a prior sync.

**Requirements:** R2

**Dependencies:** U1 (otherwise re-enrichment will just be destroyed again on the next sync)

**Files:**
- Modify: `app/services/enrichment_service.rb`
- Test: `spec/services/enrichment_service_spec.rb`

**Approach:**

In `enrich_releases`, after computing release IDs from the `listing_ids` scope, also query for release IDs from listings whose format indicates they were overwritten — those with sync format (no "Vinyl" prefix) that still have a `Release` record:

```ruby
def enrich_releases(store, listing_ids: nil)
  scope = store.listings.where.not(discogs_release_id: nil)
  scope = scope.where(id: listing_ids) if listing_ids&.any?
  listing_release_ids = scope.pluck(:discogs_release_id).uniq

  # Also include releases whose listings have sync-format data (no "Vinyl"
  # prefix in format) but DO have a Release record. These were enriched
  # but their enriched data was overwritten by a prior sync that included
  # format/genres/styles in UPDATE_FIELDS. Now that U1 prevents further
  # overwrites, this re-enrichment will stick.
  overwritten_release_ids = if listing_ids
    store.listings
      .where.not(discogs_release_id: listing_release_ids)
      .where("format NOT LIKE ? AND format LIKE ?", "Vinyl%", "%LP%")
      .where(discogs_release_id: Release.select(:discogs_release_id))
      .distinct
      .pluck(:discogs_release_id)
  else
    []
  end

  release_ids = (listing_release_ids + overwritten_release_ids).uniq

  stale_release_ids = release_ids.reject do |rid|
    Release.find_by(discogs_release_id: rid)&.then { |r| !r.stale? }
  end

  # ... downgraded_release_ids and enrich_ids logic unchanged
```

The key insight: Release records exist (from the initial enrichment), so `stale?` checks `enriched_at`. If `enriched_at < 7.days.ago`, the release IS stale and will be enriched. If `enriched_at >= 7.days.ago` (recent), the release is NOT stale.

For Amoeba SF, all 1,964 releases were enriched on May 21-22 (within the last 2 days), so they're NOT stale. The `stale_release_ids` would be empty.

So we need a DIFFERENT mechanism: we need these releases to be enriched regardless of staleness. We're not catching a failed enrichment — we're catching a successful enrichment whose output was destroyed by the sync.

The simplest approach: add the overwritten release IDs directly to `enrich_ids`, bypassing the stale check entirely:

```ruby
def enrich_releases(store, listing_ids: nil)
  scope = store.listings.where.not(discogs_release_id: nil)
  scope = scope.where(id: listing_ids) if listing_ids&.any?
  listing_release_ids = scope.pluck(:discogs_release_id).uniq

  # Standard stale-release detection (unchanged)
  stale_release_ids = listing_release_ids.reject do |rid|
    Release.find_by(discogs_release_id: rid)&.then { |r| !r.stale? }
  end

  # Downgraded thumbnail re-enrichment (unchanged)
  downgraded_release_ids = store.listings
    .where(discogs_release_id: listing_release_ids)
    .where("cover_image_url = thumbnail_url AND cover_image_url IS NOT NULL AND thumbnail_url IS NOT NULL")
    .distinct
    .pluck(:discogs_release_id)

  # NEW: releases whose listings have sync-format data despite having a
  # Release record — their enriched data was overwritten by prior syncs.
  # These must be re-enriched regardless of staleness so the enriched
  # data can be restored. After U1, subsequent syncs won't overwrite.
  overwritten_release_ids = store.listings
    .where.not(discogs_release_id: listing_release_ids)
    .where("format NOT LIKE ? AND format LIKE ?", "Vinyl%", "%LP%")
    .where(discogs_release_id: Release.select(:discogs_release_id))
    .distinct
    .pluck(:discogs_release_id)

  enrich_ids = (stale_release_ids + downgraded_release_ids + overwritten_release_ids).uniq
  # ...
```

Wait, this has an issue: `listing_release_ids` already includes the IDs from the `listing_ids` scope (changed listings from the sync). The `overwritten_release_ids` excludes those (`.where.not(discogs_release_id: listing_release_ids)`). This prevents double-processing.

But actually, there's a simpler approach. Since `overwritten_release_ids` are releases with a non-stale Release record that we WANT to enrich anyway, we should handle them separately. Let me think about edge cases:

- A listing with sync format AND a fresh Release record (= overwritten by sync): **enrich now**
- A listing with sync format AND no Release record: already caught by `stale_release_ids`
- A listing with enriched format AND a fresh Release record: **skip** (already correct, U1 protects it)
- A listing with enriched format AND stale Release record: caught by `stale_release_ids`

The query `where("format NOT LIKE ? AND format LIKE ?", "Vinyl%", "%LP%")` catches listings with sync format. And `.where(discogs_release_id: Release.select(:discogs_release_id))` ensures they have a Release record. Perfect.

**Test scenarios:**

- **Overwritten listing gets re-enriched:** Create a listing with sync format (no "Vinyl") and an existing recent Release record. Call `enrich_releases` with a `listing_ids` unrelated to this listing. The release should still be enriched.
- **Already-enriched listing is NOT re-enriched:** Create a listing with enriched format ("Vinyl, LP, Album") and a recent Release record. Call `enrich_releases` with unrelated `listing_ids`. The listing should NOT trigger an API call.
- **Overwritten listing outside listing_ids is still caught:** Same as first scenario but with `listing_ids` containing a different listing. The overwritten release should still be enriched.
- **No regression for stale releases:** A stale release whose listing has sync format should still be enriched via `stale_release_ids`.

**Verification:**
- All existing tests pass.
- After deploying U1+U2 and running one sync+enrichment cycle, Amoeba SF's listings should show populated genres and enriched format for most records.
- After the following sync cycle, the enriched data should persist (not get overwritten).

---

### U3. Backfill for all production stores

**Goal:** Recover damaged enriched data across ALL stores. This bug affects every store that has gone through at least one sync+enrichment cycle — enriched data is overwritten on every subsequent sync. After U1+U2 are deployed, the fix will prevent new damage, but existing listings need restoration.

**Dependencies:** U1, U2 deployed

**Files:**
- Modify: `app/jobs/sync_all_stores_job.rb` — add a single-run enrichment pass
- Or: `bin/rails runner` on production (one-time)

**Approach:**

Option A — Rails runner command (preferred, simpler, no permanent code change):

```ruby
Store.find_each do |store|
  overwritten_ids = store.listings
    .where("format NOT LIKE ? AND format LIKE ?", "Vinyl%", "%LP%")
    .pluck(:id)
  
  if overwritten_ids.any?
    EnrichmentJob.perform_later(store.id, listing_ids: overwritten_ids)
    Rails.logger.info "[Backfill] Enqueued #{overwritten_ids.size} listings for #{store.discogs_username}"
  end
end
```

This enqueues one `EnrichmentJob` per store with each store's overwritten listing IDs. U2's logic in `enrich_releases` will catch these IDs and enrich them regardless of the Release record's staleness.

**Risk:** The backfill will hit the Discogs API hard — ~1,400 releases per store. With concurrency limited to 1 and 1.1s pacing, each large store takes ~25 minutes. Multiplied across all stores (staggered by `SyncAllStoresJob`'s 5-minute intervals), it could take hours. Consider running this outside of peak hours or spreading it across a weekend night.

**Simpler Option B — Let U2 catch them naturally:** After U1+U2 are deployed, the next `SyncAllStoresJob` cycle will trigger `FullStoreSyncJob` for each store, which enqueues `EnrichmentJob` with the changed listing IDs. U2's `overwritten_release_ids` query runs inside every enrichment, so it will automatically pick up overwritten releases from ALL stores — not just changed ones — on every enrichment cycle. No separate backfill needed.

Wait — this depends on whether `listing_ids` is passed. If no listings changed in a sync, `listing_ids_for_enrichment` is empty, and `EnrichmentJob` is NOT called at all. So U2's logic would never run for stores with stable inventory.

**Recommendation: Use Option A.** Run once after deploying U1+U2, then normal cycles maintain health.

**Verification:**
- After backfill, run `Store.find_each { |s| puts "#{s.discogs_username}: #{s.listings.where("format LIKE ?", "Vinyl%").count}/#{s.listings.lp_only.count}" }` — should show most lp_only listings with enriched format.
- Genre crates should appear on storefronts at the next `DailyCurationJob` run.

---

## System-Wide Impact

- **Error propagation:** No change — the same error handling patterns apply.
- **State lifecycle risks:** After U1, the `materially_changed?` check will no longer detect format differences as a change event. This is intentional, but worth noting that listings whose only "change" was format difference will no longer trigger enrichment. That's fine — the enriched format is the correct one, and we don't want to re-enrich unnecessarily.
- **Unchanged invariants:** `price`, `condition`, `notes`, and `listed_at` are still synced every cycle. Inventory removal (stale listings) is unaffected. `UPDATE_FIELDS` only loses three fields that enrichment owns.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Removing `format` from UPDATE_FIELDS means brand-new listings' format is set only once (first sync), never refreshed from Discogs | Enrichment always runs after first sync; format is upgraded to enriched format. After that, it's stable. |
| `materially_changed?` no longer detects format differences, so listing changes that only affect format (unlikely from Discogs) won't trigger re-enrichment | Format is an enrichment-owned field; it shouldn't change from sync data anyway. The release API's formats rarely change. |
| Overwritten release detection (`format NOT LIKE 'Vinyl%'`) is a heuristic that could miss edge cases | Any listing where enrichment ran successfully gets "Vinyl" prefix. If a non-vinyl format was genuinely correct (e.g., "12\"", "LP" without Vinyl?), enrichment would still write "Vinyl, ..." prefix. The heuristic covers 100% of the affected cases. |

---

## Sources & References

- Production data from `milkcrate.fm/amoebasf`: 1,964 Release records exist, but only 28 listings have enriched format/genres.
- `app/jobs/full_store_sync_job.rb` lines 3-6: `UPDATE_FIELDS` constant.
- `app/jobs/full_store_sync_job.rb` lines 73-84: `materially_changed?` method.
- `app/services/enrichment_service.rb` lines 22-45: `enrich_releases` scope logic.
