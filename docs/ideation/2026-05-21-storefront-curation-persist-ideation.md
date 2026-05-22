---
date: 2026-05-21
topic: storefront-curation-persist
focus: Persist storefront curation output to avoid recomputing on every page load
mode: repo-grounded
---

# Ideation: Persist Storefront Curation

## Grounding Context

### Codebase Context
- **Project:** Milkcrate — Rails 8.1 + Inertia.js + React 19 + TypeScript, dark-mode vinyl storefront
- **Current curation flow:** `StoresController#show` → `StorefrontCuration.new(store)`:
  - Loads all eligible listings from DB (lp_only, available)
  - Runs 4 strategies (Picks, New Arrivals, Thematic, Hidden Gems) each using RecordScorer (7 scoring strategies per listing)
  - Builds genre crates with another scored pass
  - Deduplicates across crates
  - **All synchronous, on every page load**
- Two output methods on StorefrontCuration: `crates` (for crate view tab bar) and `storefront_groups` (for sections) — overlapping computation
- `DailyCurationJob` runs daily but only tracks surface_count/last_surfaced_at — doesn't cache output
- `MarketingPreviewPresenter` also runs curation for homepage — caps to bounded results
- `CratePresenter` serializes curation output to Inertia props (already a JSON shape)
- Current branch: `feat/experiment-pipeline`

### Past Learnings
- **crate-strategies-pattern:** Strategy objects with uniform scoring via RecordScorer; single CRATE_SIZE constant (50); score once, filter per category
- **experiment-pipeline-simplification:** Seed crates persisted as JSON in experiments/ dirs — pattern exists for caching curation output

### External Context
- Web research identified 4 caching patterns: (A) solid_cache with daily key, (B) DB model `StorefrontCrate` per store/day, (C) cache full presenter output with listing_updated_at_max dependency, (D) prefilter pool via existing DailySelection

## Topic Axes
1. **Cache storage format** — JSON file vs DB vs Redis vs other; what data shape to persist
2. **Cache lifecycle** — when to write, when to invalidate, staleness tolerance
3. **Cache read path** — how the controller serves cached vs recomputed data
4. **Background vs inline** — job-based write vs request-cycle check
5. **Computation cost reduction** — making curation cheaper even without caching

## Ranked Ideas

### 1. Rails.cache Wrapper (solid_cache, Immediate Win) [Explored]
**Description:** Wrap StorefrontCuration's output in Rails.cache.fetch with a daily key: `storefront/curation/v1/{store_id}/{Date.current.iso8601}`. TTL = 36 hours to cover the day boundary. The controller reads from cache and only recomputes on cache miss. DailyCurationJob pre-warms the cache. Uses existing solid_cache infrastructure — zero migrations.
**Axis:** Cache read path
**Basis:** `direct:` DiscogsSellerLookup already uses Rails.cache.read/write with TTL — this is an established pattern in the codebase. No caching layer exists in the curation path.
**Rationale:** Can be implemented in under an hour: wrap `StorefrontCuration.new(...).storefront_groups` in cache.fetch, add a write-through in DailyCurationJob, update the controller. This is the immediate win before any deeper persistence work. If cache pressure becomes an issue, versioned snapshots (idea 3) are a natural migration path.
**Downsides:** Cache eviction (solid_cache uses LRU) could force cold-start recompute under memory pressure. Cache is per-process unless using Redis. Doesn't address the underlying compute cost — just defers it.
**Confidence:** 95%
**Complexity:** Low
**Status:** Explored

### 2. Score Precomputation (Cached per-listing score column)
**Description:** Add a `curation_score` (and optionally decomposed score columns) to the listings table. Compute it at sync time and on daily freshness rotation — not on every page load. Crate strategies read scores via SQL ORDER BY instead of running RecordScorer in Ruby on every request.
**Axis:** Computation cost reduction
**Basis:** `direct:` RecordScorer runs 7 strategies across all listings 1-2 times per request. Build_genre_crates scores every non-excluded listing each time. Only freshness depends on Date.today — the other 6 strategies are pure functions of listing attributes.
**Rationale:** Eliminates the dominant O(N×S) compute cost from every page load. Reduces per-request scoring to a SQL read + freshness delta. Leverage: unlocks incremental scoring, SQL-native genre crate ordering, and real-time admin preview.
**Downsides:** Daily freshness update still requires a scheduled job. Score columns add storage per listing. Re-scoring on algorithm change needs a batch job.
**Confidence:** 90%
**Complexity:** Medium
**Status:** Unexplored

### 3. Versioned Curation Snapshots (Persisted crate output)
**Description:** Persist the output of StorefrontCuration as a versioned snapshot — either as a `storefront_snapshots` table (store_id, curated_at, crate_data JSONB) or as a JSON file. The storefront controller reads the latest snapshot instead of recomputing. Keep N recent versions for rollback and diffing.
**Axis:** Cache storage format
**Basis:** `direct:` StorefrontCuration outputs are discarded after each request — CuratedCrate objects are garbage-collected after serialization. DailyCurationService throws away crate assignments after extracting listing IDs.
**Rationale:** Direct answer to "write to a JSON file and serve from that." Eliminates ALL per-request curation compute. Versioned snapshots enable rollback, A/B comparison, curation quality analytics, and historical "what was shown" views.
**Downsides:** Requires migration or file storage. Snapshot staleness means visitors see slightly old curation between refreshes.
**Confidence:** 85%
**Complexity:** Medium
**Status:** Unexplored

### 4. Background + Event-Triggered Recuration
**Description:** Move curation computation off the request path entirely. Recuration runs in a background job triggered by: (a) sync completion, (b) daily freshness rotation, (c) manual admin trigger. The storefront always reads the last-computed result.
**Axis:** Background vs inline
**Basis:** `direct:` StoresController#render_store calls StorefrontCuration synchronously inside the HTTP request (stores_controller.rb:17-28). The page is blank until curation finishes.
**Rationale:** Eliminates the synchronous compute anchor. Page load latency drops from "time to compute curation" to "time to read cached result + serialize." Background compute time grows independently of page load time.
**Downsides:** Staleness window between data change and curation refresh. Requires daily freshness schedule.
**Confidence:** 80%
**Complexity:** Medium
**Status:** Unexplored

### 5. Curation Epoch = Sync Cycle (not calendar day)
**Description:** Key the curation epoch on `sync_generation` (a counter incremented per successful sync) instead of Date.today. Thematic seed, freshness curve reference, picks genre-diversity shuffle — all key on the sync cycle rather than the calendar. Eliminates the midnight discontinuity.
**Axis:** Cache lifecycle
**Basis:** `reasoned:` Thematic seed uses MD5(store_id + today.iso8601) — changing to sync_generation produces same behavior per epoch without midnight flip. Genre counts depend on listing state (sync). Only freshness is genuinely time-dependent.
**Rationale:** Fixes a real UX problem: browsing across midnight sees the storefront reorganize with no data change. Makes curation stable within sync epochs.
**Downsides:** Freshness genuinely depends on time — moving it to periodic sweep is a conceptual shift. Existing DailySelection and DailyCurationJob key on Date.
**Confidence:** 65%
**Complexity:** Low (conceptual) / Medium (migration)
**Status:** Unexplored

### 6. SQL-Native Dedup via Window Functions
**Description:** Remove the sequential excluded_ids threading between crate strategies. Compute each crate independently, handle deduplication at query time via SQL window functions. Enables parallel strategy execution.
**Axis:** Computation cost reduction
**Basis:** `reasoned:` Current dedup chain threads a Set through 4+ method calls (storefront_curation.rb lines 11-19), preventing parallel execution and creating fragile ordering dependencies.
**Rationale:** Removes the largest source of sequential coupling. Enables parallel crate computation. Simplifies strategy interface.
**Downsides:** Best combined with score precomputation for SQL-based window functions.
**Confidence:** 70%
**Complexity:** Low (combined with idea 1)
**Status:** Unexplored

### 7. Curation-as-a-Publication Model (snapshot + diff + rollback)
**Description:** Treat each curation as a "published issue" with explicit versioning. DailyCurationJob becomes the editorial pipeline: compute curation, persist as snapshot, mark as current, keep N versions. Enable rollback, diff, and admin UI.
**Axis:** Cache lifecycle
**Basis:** `external:` Print publishing treats content as versioned artifacts. DailyCurationJob naming implies this model but doesn't deliver it.
**Rationale:** Transforms caching from invisible optimization to visible product capability. Store owners see "curation published at 3:00 AM" and can roll back.
**Downsides:** Most valuable for admin visibility — doesn't directly improve page load performance beyond ideas 1-3. Requires admin UI.
**Confidence:** 60%
**Complexity:** High
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason |
|---|------|--------|
| 1 | Static Storefront | Too restrictive — deploys for every inventory change |
| 2 | Push-Button Curation | Unacceptable staleness risk |
| 3 | Streaming Curation | Huge complexity for uncertain editorial UX benefit |
| 4 | Universal Template | Different stores have different inventory; collapses |
| 5 | Client-Side Curation | Duplicates scoring pipeline in JS, large data payload |
| 6 | Event-Sourced Curation | Too architectural — batch backfill defeats incremental |
| 7 | No Deduplication | Same record in multiple crates — terrible UX |
| 8 | Precompute Theme Candidates | Subsumed by score precomputation (Idea 2) |
| 9 | Persist HiddenGems at Sync | Subsumed by snapshot persistence (Idea 3) |
| 10 | Materialized Listing Pool | Subsumed by score precomputation (Idea 2) |
| 11 | Cache Scored Pool for Genres | Subsumed by score precomputation (Idea 2) |
| 12 | Curation Diff API | Downstream feature of snapshot persistence |
| 13 | Polymorphic Curation Target | Premature — optimize single target first |
| 14 | Content-Addressed Build Cache | Overengineered for current crate count |
| 15 | Incremental Compilation | Dependency tracking too complex |
| 16 | Static Site Generation | Too restrictive for dynamic storefront |
| 17 | Print Publishing | Subsumed by Curation-as-Publication (Idea 7) |
| 18 | Game Asset Baking | Subsumed by Background+Event-Triggered (Idea 4) |
