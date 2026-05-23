---
title: "refactor: Address Sandi Metz POODR violations in FullStoreSyncJob and EnrichmentService"
type: refactor
status: completed
date: 2026-05-23
---

# Refactor: Address Sandi Metz POODR Violations

## Summary

Address six Sandi Metz POODR findings across `FullStoreSyncJob` and `EnrichmentService`, surfaced by the on-demand review on PR #189. The most impactful change is extracting a `MusicBrainzEnricher` class (the 36-line `enrich_music_brainz_images` method is a whole class waiting to get out). Smaller fixes address tentacled hash construction, fragile parallel-array comparisons, a Tell-Don't-Ask branch, and a hidden mutable cache.

---

## Problem Frame

The recent sync-overwrites-enriched-data fix (PR #189) touched these two files, and a focused Sandi Metz review found accruing design debt:

- **`EnrichmentService`** (150 lines) has three distinct responsibilities: release selection (3 queries), Discogs enrichment (API + DB writes), and MusicBrainz enrichment (API + rate-limiting + DB writes). Violates SRP.
- **`listing_updates` hash** in `enrich_release` tentacles across 5 conditionally-assigned keys — a missing abstraction.
- **`materially_changed?`** in `FullStoreSyncJob` uses parallel arrays that must be edited in lockstep when fields change — fragile.
- **`remove_stale_listings`** in `FullStoreSyncJob` branches on `current_ids.empty?` — a Tell-Don't-Ask pattern.
- **`@enrichment_managers`** in `EnrichmentService` accumulates across service reuse with no eviction — minor but worth cleaning.

---

## Requirements

- R1. Separate `EnrichmentService` into focused classes: MusicBrainz enrichment extracted, release selection logic extracted or clarified
- R2. Replace tentacled `listing_updates` hash with a named method or abstraction
- R3. Replace `materially_changed?` parallel arrays with self-synchronizing comparison
- R4. Simplify `remove_stale_listings` to avoid Ask-style branching
- R5. Clean up `@enrichment_managers` cache

---

## Scope Boundaries

- No change to `FullStoreSyncJob`'s core sync logic, `UPDATE_FIELDS`, or `import_listings`
- No change to `EnrichmentService`'s Discogs enrichment logic or error handling
- No change to the overwritten-release detection added in PR #189
- The hardwired defaults (`DiscogsClient.new` / `MusicBrainzClient.new` in constructor kwargs) are already injectable via kwargs and used correctly in tests — flagged by the review as a "dead defaults" concern, but not worth changing since Rails service objects rarely use DI beyond test injection and the defaults provide a useful production convenience

---

## Context & Research

### Relevant Code and Patterns

- `app/services/enrichment_service.rb` — 150-line class, `enrich_music_brainz_images` (36 lines), `enrich_release` (30 lines with tentacled hash)
- `app/jobs/full_store_sync_job.rb` — `materially_changed?` (parallel arrays), `remove_stale_listings` (branch on empty?)
- Prior Sandi Metz plans established extraction patterns: `docs/plans/2026-05-21-002-refactor-sandi-metz-remainder-plan.md`, `docs/plans/2026-05-19-002-refactor-models-sandi-metz-plan.md`
- Prior learnings at `docs/solutions/integration-issues/discogs-rate-limit-middleware-2026-05-19.md` document the shared Discogs API concurrency between sync and enrichment

### Institutional Learnings

- Previous Sandi Metz refactors (May 19-21) established a pattern of extracting focused classes from overgrown services — e.g., sync lifecycle managers, enrichment lifecycle managers, scoring strategies. The `MusicBrainzEnricher` extraction follows the same pattern.

---

## Key Technical Decisions

- **MusicBrainzEnricher as a separate class, not a module:** The 36-line `enrich_music_brainz_images` method has its own API client, rate-limit pacing, error handling, and DB write concerns — enough surface area to justify a class. Injection via constructor keeps testability. The caller (`EnrichmentService#enrich_store`) creates an instance or receives one.
- **No selective application on the parallel-array issue:** The `materially_changed?` method receives two different representations (an `ActiveRecord` object and a hash). A hash-slice comparison would be cleaner than parallel arrays, but the two representations have different key shapes — stick with the array approach but extract a helper that accepts pairs, so adding a field means one statement instead of two parallel edits.
- **`remove_stale_listings` simplification:** The `current_ids.empty?` branch exists because `delete_all` with no arguments is a full table truncation risk. The fix is to guard at the call site — only call `remove_stale_listings` when `result.complete? && result.listings.any?`, removing the need for the Ask-style branch entirely.

---

## Implementation Units

### U1. Extract MusicBrainzEnricher

**Goal:** Move `enrich_music_brainz_images` and all its private dependencies (`MUSICBRAINZ_SLEEP`, API client, rate-limit sleep, error handling) into a standalone `MusicBrainzEnricher` class.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Create: `app/services/music_brainz_enricher.rb`
- Modify: `app/services/enrichment_service.rb` (remove the method, replace with delegation)
- Test: `spec/services/music_brainz_enricher_spec.rb`
- Modify: `spec/services/enrichment_service_spec.rb` (update to use the new class)

**Approach:**
- New class accepts `musicbrainz: MusicBrainzClient.new` (same injectable pattern). The rate-limit sleep constant moves inside the class.
- Public method: `def enrich_store(store)` — iterates candidate release IDs, searches musicbrainz, fetches cover URLs, updates listings.
- Error handling per-release stays the same (rescue MusicBrainzClient::ApiError, log, continue).
- `EnrichmentService#enrich_music_brainz_images` becomes `MusicBrainzEnricher.new(musicbrainz: @musicbrainz).enrich_store(store)`. The existing DI path through `EnrichmentService.initialize` makes this seamless — `@musicbrainz` is already injectable.

**Patterns to follow:**
- `app/services/enrichment_service.rb` — the existing method body is the extraction source
- The class-level split mirrors how `SyncStrategies::PublicApi` / `SyncStrategies::CsvExport` separate sync strategies

**Test scenarios:**
- Happy path: store has candidates → MusicBrainz returns MBID → cover URL found → listings updated
- Edge case: store has candidates → MusicBrainz returns nil MBID → Release.musicbrainz_id set to empty string, cover skipped
- Error path: MusicBrainz API error during search → error logged, loop continues to next release
- Error path: MusicBrainz API error during cover fetch → error logged, loop continues (release already has MBID)
- Integration: candidate query correctly joins listings + releases where discogs_image_missing=true and musicbrainz_id is nil
- Rate-limiting: sleep 1.1s between releases (verify the sleep constant is preserved)

**Verification:**
- All existing enrichment specs pass after migrating MusicBrainz tests to the new class
- `EnrichmentService` loses ~40 lines (only `enrich_store` delegation remains)
- New class is independently unit-testable without instantiating `EnrichmentService`

---

### U2. Replace tentacled hash and parallel arrays

**Goal:** Clean up two fragile patterns: the `listing_updates` hash with 5 conditionally-assigned keys, and `materially_changed?` parallel arrays.

**Requirements:** R2, R3

**Dependencies:** None (independent of U1, can land in either order)

**Files:**
- Modify: `app/services/enrichment_service.rb` — the `listing_updates` construction inside `enrich_release`
- Modify: `app/jobs/full_store_sync_job.rb` — `materially_changed?` method
- No test changes needed (behavior is identical, assertions already pass)

**Approach:**

For `listing_updates` — replace the tentacled hash with an extracted method that filters out blank/nil values in one pass:

```ruby
def listing_updates_for(data, want:, have:, genres:, styles:, format_str:, cover_url:, tracklist:)
  { want_count: want, have_count: have,
    genres: genres, styles: styles,
    format: format_str, cover_image_url: cover_url,
    tracklist: tracklist }.compact_blank
end
```

Then `store.listings.where(...).update_all(listing_updates_for(...))`. The `if` conditionals move into the method: `genres` is always set to `Array(data["genres"])` already, so `compact_blank` naturally drops keys with empty/nil values. The only behavioral difference from the current code is that `genres: []` — which `compact_blank` would drop because `[].blank?` is true — but `Array(data["genres"])` already produces `[]` for missing keys, and the current code only sets `genres if genres.any?`, so the behavior is identical.

For `materially_changed?` — replace parallel arrays with a helper that accepts field pairs:

```ruby
MATERIAL_FIELDS = %i[discogs_release_id price condition notes].freeze

def materially_changed?(existing, incoming)
  MATERIAL_FIELDS.any? do |field|
    existing_value = field == :price ? normalized_price(existing.price) : existing.public_send(field)
    incoming_value = field == :price ? normalized_price(incoming[field]) : incoming[field]
    existing_value.to_s != incoming_value.to_s
  end
end
```

Or simpler: keep the array structure but extract a `changes?` helper that takes pairs:

```ruby
def materially_changed?(existing, incoming)
  changes?(
    [existing.discogs_release_id.to_s, incoming[:discogs_release_id].to_s],
    [normalized_price(existing.price), normalized_price(incoming[:price])],
    [existing.condition, incoming[:condition]],
    [existing.notes, incoming[:notes]]
  )
end

def changes?(*pairs)
  pairs.any? { |a, b| a != b }
end
```

This way adding a field means adding one pair to the `changes?` call — no second array to forget.

**Patterns to follow:**
- Existing `listing_updates` hash construction in `enrich_release` is the code being refactored
- The `materially_changed?` change preserves the existing comparison logic — only the structure changes

**Test scenarios:**
- `materially_changed?` returns true when any field differs (existing tests already cover this)
- `materially_changed?` returns false when all fields match
- `listing_updates` produced by the refactored method include the same set of keys as before for any given input
- `listing_updates` drops nil genres/styles/format/cover_url/tracklist (same as current behavior)

**Verification:**
- All existing tests pass (no behavioral change)

---

### U3. Simplify remove_stale_listings and cleanup enrichment_managers cache

**Goal:** Eliminate the Ask-style `current_ids.empty?` branch in `remove_stale_listings` and clean up the `@enrichment_managers` cache in `EnrichmentService`.

**Requirements:** R4, R5

**Dependencies:** None

**Files:**
- Modify: `app/jobs/full_store_sync_job.rb` — `remove_stale_listings` and its call site
- Modify: `app/services/enrichment_service.rb` — `enrichment_manager` method
- No test changes needed

**Approach:**

For `remove_stale_listings` — the root cause is that `store.listings.delete_all` (with no scope) truncates the entire table when called on an empty result set. The guard should move to the call site:

```ruby
# In perform:
if result.complete? && result.listings.any?
  remove_stale_listings(store, result.listings)
end
```

Then `remove_stale_listings` itself becomes a single code path:

```ruby
def remove_stale_listings(store, current_listings)
  current_ids = current_listings.map { |r| r[:discogs_listing_id] }
  store.listings
    .where.not(discogs_listing_id: current_ids)
    .delete_all
end
```

For `@enrichment_managers` — replace the growing hash with a simple private method that creates a fresh manager each call. The cache was an optimization that doesn't pay off since `EnrichmentService` is instantiated fresh per job:

```ruby
def enrichment_manager(store)
  @enrichment_manager ||= StoreEnrichment::StatusManager.new(store)
end
```

(Or remove the cache entirely and just instantiate each call — the `StatusManager` is lightweight.)

**Patterns to follow:**
- Existing call site logic in `FullStoreSyncJob#perform` — `result.complete?` check already exists, just add `&& result.listings.any?`
- The single-reference cache pattern is already used elsewhere in the codebase

**Test scenarios:**
- Happy path: `result.complete?` with non-empty listings → stale listings removed (existing test covers)
- Edge case: `result.complete?` with empty listings list → `remove_stale_listings` not called, listings preserved (existing test: "keeps existing listings when an incomplete snapshot is empty" covers similar ground)
- Convergence: `result.complete?` with empty listings list AND `remove_stale_listings` not called → same behavior as before (the guard moved, not the logic)
- EnrichmentManager: service still marks enrichment as started/succeeded/failed correctly

**Verification:**
- All existing sync job tests pass
- Stale-listing removal behavior unchanged for non-empty result sets

---

## System-Wide Impact

- **Interaction graph:** `EnrichmentService#enrich_store` callers (`EnrichmentJob`) are unaffected — the method signature doesn't change, only internal delegation. `FullStoreSyncJob#perform` callers are unaffected.
- **Error propagation:** Unchanged — MusicBrainz errors are already rescued per-release; the new class preserves that pattern.
- **State lifecycle risks:** The `@enrichment_managers` cache change means slightly more allocations but eliminates a memory leak (accumulating store references across reuses). Safe change.
- **Unchanged invariants:** All public method signatures remain the same. No schema changes. No API surface changes.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| MusicBrainzEnricher extraction changes test structure — existing enrichment specs isolate MusicBrainz via `allow(musicbrainz)` already, so migration is straightforward | Run full test suite after extraction; will catch any stub mismatches |
| `compact_blank` on `listing_updates` hash drops empty arrays (`[]`) — currently conditionally set, so this is identical behavior | Verify with a test that `genres: []` is not persisted (same as current) |
| No risk from `remove_stale_listings` guard move — the condition is strictly stronger (adds `.any?` check) | Existing tests for empty-complete and empty-incomplete snapshots already cover the boundary |

---

## Sources & References

- PR #189 (on-demand review): Sandi Metz findings from `full_store_sync_job.rb` and `enrichment_service.rb`
- Prior pattern: `docs/plans/2026-05-21-002-refactor-sandi-metz-remainder-plan.md`
- Prior pattern: `docs/plans/2026-05-19-002-refactor-models-sandi-metz-plan.md`
