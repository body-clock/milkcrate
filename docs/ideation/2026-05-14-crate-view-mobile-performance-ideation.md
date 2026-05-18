---
date: 2026-05-14
updated: 2026-05-17
topic: store-page-performance-static-curation
focus: Stores pages are slow because storefront curation runs during public page requests; curation should run once daily and render static results quickly.
mode: repo-grounded
---

# Ideation: Store Page Performance and Static Curation

## Grounding Context

### Codebase Context

Milkcrate is a Rails 8.1 + Inertia React app for browsing Discogs seller inventory as curated storefront crates. The relevant request path is:

- `StoresController#render_store` builds `StorefrontCuration.new(store, filter_available: !Rails.env.development?)`
- It then calls both `curation.crates` and `curation.storefront_groups`
- `CratePresenter` serializes the full crate-browser payload and the storefront floor sections into Inertia props
- `Featured` renders the floor immediately, but also receives all crate records up front so opening a crate is instant

The current curation service loads all eligible LP listings into Ruby and scores/sorts them through strategy objects:

- `eligible_listings` calls `@store.listings.available.lp_only.to_a`
- picks, new arrivals, thematic, hidden gems, and genre crates score/filter from that in-memory pool
- `crates` and `storefront_groups` duplicate most of the same work in the same request
- `DailyCurationJob` is already scheduled in `config/recurring.yml` at `1am`, but `DailyCurationService` only stamps `last_surfaced_at` and increments `surface_count`; it does not persist the selected storefront result

Local measurement on the development database:

- store: `philadelphiamusic`
- listings: `31,049`
- controller-equivalent curation (`crates` + `storefront_groups`): `3,831.2ms`
- presenter serialization: `10.1ms`
- Inertia JSON payload: `1,308,947` bytes
- computing grouped curation once still costs `2,516.6ms` and serializes `654,639` bytes for the floor-only payload

### Past Learnings

- `docs/solutions/architecture-patterns/crate-strategies-pattern-2026-05-07.md` says strategy objects should stay pure and share `RecordScorer`; callers wrap/cap strategy output. Static curation should preserve that boundary rather than bury persistence inside strategies.
- The follow-up layered refactor plan already moved final section-key assembly into `CratePresenter` and kept `StorefrontCuration#storefront_groups` as the domain grouping API. Persisting static results should build on that split.
- `MarketingPreviewPresenter` already demonstrates bounded storefront payloads for public surfaces. That is the right pattern for fast first paint.
- The older mobile crate-view ideas remain valid for after first paint, but they do not address the observed multi-second server-side delay.

### External Context

- Rails' caching guide recommends low-level `Rails.cache` for serializable values and explicitly warns against caching Active Record instances; cache IDs or primitive data instead. Rails 8 enables Solid Cache by default, making persistent cache storage available without Redis. Sources: [Rails caching guide](https://guides.rubyonrails.org/caching_with_rails.html), [rails/solid_cache](https://github.com/rails/solid_cache).
- PostgreSQL materialized views persist query results and can be refreshed, including `CONCURRENTLY` when a qualifying unique index exists, but refresh still replaces view contents and is not a natural fit for Ruby strategy selection logic. Source: [PostgreSQL REFRESH MATERIALIZED VIEW](https://www.postgresql.org/docs/current/sql-refreshmaterializedview.html).

## Topic Axes

- **Request-time compute** - eliminate expensive Ruby curation/scoring from public store requests.
- **Static daily artifact** - persist the once-daily result with freshness metadata, not just surface counters.
- **Payload shape** - avoid shipping a full crate-browser payload before the user chooses a crate.
- **Freshness and failure behavior** - decide what renders when curation is missing, stale, or failed.
- **Observability** - make curation cost and payload size measurable so regressions are visible.

## Ranked Ideas

### 1. Persist a Daily Storefront Snapshot

**Description:** Add a durable `storefront_snapshots` table that stores the rendered storefront artifact for each store and date. `DailyCurationJob` computes `StorefrontCuration#storefront_groups`, serializes it through `CratePresenter`, writes JSONB payload columns, records surfaced listing IDs, and atomically marks the snapshot active for that store. `StoresController#render_store` reads the active snapshot and renders props without running `StorefrontCuration`.

**Axis:** Static daily artifact

**Basis:** `direct:` `config/recurring.yml` already schedules `DailyCurationJob` every day at `1am`, while `DailyCurationService` currently only stamps `last_surfaced_at` and `surface_count`. `StoresController#render_store` recomputes curation on every request. Local measurement shows `3,831.2ms` request-time curation for `31,049` listings.

**Rationale:** This matches the product truth: curation is daily, not per-request. It turns public store rendering into a single store lookup plus one snapshot lookup and JSON prop return. It also gives the app an audit trail: what was shown today, when it was generated, how many records were surfaced, and whether generation succeeded.

**Downsides:** Requires a migration, model, service boundary, backfill/bootstrap path, and tests for stale/missing snapshots. JSONB snapshots duplicate some listing data and need an invalidation/versioning story when prop shape changes.

**Confidence:** 92%
**Complexity:** Medium
**Status:** Unexplored

### 2. Split Store Floor Payload from Crate Detail Payload

**Description:** Make the initial store page render only the static storefront floor: store props, picks preview, featured crates, and genre grid previews. Fetch full crate detail lazily when the user opens a crate, either through a focused Inertia partial reload or a small JSON endpoint keyed by `snapshot_id` and `crate_slug`.

**Axis:** Payload shape

**Basis:** `direct:` `Featured` receives both `crates` and `storefront_sections`. For `philadelphiamusic`, controller-equivalent props serialize to `1,308,947` bytes, while the grouped floor-only path is roughly `654,639` bytes. `StoreFloor` only needs `storefront_sections`; `CrateView` only needs full `crates` after `activeSlug` is set.

**Rationale:** Static curation removes TTFB compute; this removes unnecessary first-load bytes and hydration work. Users should see the store floor fast. Full 50-record crate payloads can be delivered only for the crate they choose, preserving instant browsing after the explicit action.

**Downsides:** Crate opening becomes a networked interaction unless full crate data is prefetched after first paint. Needs loading/error states in `CrateView` and careful history behavior so back/forward still feels native.

**Confidence:** 84%
**Complexity:** Medium
**Status:** Unexplored

### 3. Introduce a Single Curation Result Object as the Interim Fix

**Description:** Before full snapshot persistence, change `StorefrontCuration` to compute one grouped result per instance and derive both `#crates` and `#storefront_groups` from it. `StoresController` should call one method, not two independent curation paths.

**Axis:** Request-time compute

**Basis:** `direct:` `StorefrontCuration#crates` and `#storefront_groups` both call picks, featured, thematic, and genre crate builders separately. Local measurement shows grouped curation once is `2,516.6ms`, while the controller-equivalent double path is `3,831.2ms`.

**Rationale:** This does not solve the static daily requirement, but it is a low-risk bridge and good preparation. A single immutable result object is exactly what the snapshot writer should persist. It also eliminates the risk that `crates` and `storefront_sections` diverge inside one request.

**Downsides:** Still leaves multi-second curation in the request path. It should be treated as a stepping stone, not the final remediation.

**Confidence:** 88%
**Complexity:** Low
**Status:** Unexplored

### 4. Add Snapshot Freshness Lifecycle and Fallback Rules

**Description:** Add explicit store-level or snapshot-level states: `ready`, `generating`, `stale`, and `failed`. Public requests render the latest successful snapshot when present, show the existing syncing/enriching spinner only during first setup, and enqueue regeneration when the active snapshot is stale or missing after inventory changes.

**Axis:** Freshness and failure behavior

**Basis:** `direct:` `Store` already has `sync_status`, `enrichment_status`, `last_synced_at`, and `last_enriched_at`. The frontend already gates rendering while sync/enrichment runs. The missing state is "curation artifact exists and is fresh enough to render."

**Rationale:** Static artifacts need operational semantics. Without them, the first failed daily job can either hide the store or silently show unknown data. The best user experience is stale-while-good: keep serving yesterday's snapshot and make regeneration observable.

**Downsides:** Adds state transitions that must stay in sync with full-store sync, enrichment, and daily curation. Admin health should surface failures so stale snapshots do not become invisible.

**Confidence:** 82%
**Complexity:** Medium
**Status:** Unexplored

### 5. Cache Serialized Snapshot Props, Not Active Record Objects

**Description:** Once durable snapshots exist, optionally layer `Rails.cache.fetch` around the serialized active snapshot props keyed by `store_id`, `snapshot_id`, and prop schema version. Cache primitive hashes/JSON only, never `Listing` or `CuratedCrate` instances.

**Axis:** Request-time compute

**Basis:** `external:` Rails' caching guide recommends low-level caching for serializable values and warns against caching Active Record instances because records may change or disappear. This app already has `solid_cache_entries` in the schema and Rails 8/Solid Cache available.

**Rationale:** The DB snapshot removes expensive selection. A serialized-props cache removes repeated JSONB decode/shape work and gives a very small hot path for popular stores. Keeping the DB snapshot as source of truth avoids making cache correctness the core system.

**Downsides:** Adds a second layer of invalidation. This should follow, not precede, durable snapshots; cache-only would be too easy to lose on expiry and would not provide daily auditability.

**Confidence:** 76%
**Complexity:** Low-Medium
**Status:** Unexplored

### 6. Instrument Curation Duration, Snapshot Size, and Request Payload Size

**Description:** Add structured logs or `ActiveSupport::Notifications` around curation generation and store render payload assembly. Track store ID, listing count, eligible listing count, crate count, surfaced record count, curation duration, serialization duration, payload bytes, snapshot age, and whether the request hit static data or recomputed.

**Axis:** Observability

**Basis:** `direct:` The current logger line in `DailyCurationService` only emits store name, surfaced count, and picks count. The performance issue required manual `rails runner` measurement to quantify.

**Rationale:** Static curation is a performance feature. It needs a regression tripwire. With instrumentation, future changes to `RecordScorer`, crate counts, or payload shape can be evaluated against real numbers instead of subjective page-load reports.

**Downsides:** Logs can get noisy across many stores unless sampled or shaped carefully. Payload byte measurement should avoid forcing extra serialization in production.

**Confidence:** 86%
**Complexity:** Low
**Status:** Unexplored

### 7. Consider Materialized SQL Helpers Only for Ranking Primitives

**Description:** Do not try to materialize the entire storefront in PostgreSQL. If curation remains expensive after snapshots, consider SQL-side helper tables or materialized views for primitive rankings such as eligible LP IDs, genre counts, and base record scores, then keep Ruby strategy orchestration intact.

**Axis:** Request-time compute

**Basis:** `external:` PostgreSQL materialized views persist query results and can be refreshed, but refresh replaces the contents and concurrent refresh has unique-index constraints. `direct:` Milkcrate curation uses Ruby strategies, `RecordScorer`, `PickPolicy`, and seeded thematic selection, not one declarative SQL query.

**Rationale:** SQL materialization may help if the daily job itself becomes too slow, but it is the wrong first move for request performance. Persisting final snapshots removes request-time work without distorting the curation architecture.

**Downsides:** Adds database-specific complexity and can pull domain scoring rules into SQL. Treat as a later optimization only if daily generation becomes a bottleneck.

**Confidence:** 68%
**Complexity:** High
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Cache `StorefrontCuration` objects directly | Rails docs advise against caching Active Record instances; cache primitive IDs or serialized hashes instead. |
| 2 | Cache-only daily curation with `Rails.cache` | Too volatile for the user's "static daily result" requirement; no audit trail and cache expiry could reintroduce request-time curation. |
| 3 | Build-time static pre-render | Inventory sync and daily curation are runtime data, not deploy-time assets. |
| 4 | PostgreSQL materialized view for the whole storefront | Curation is Ruby strategy orchestration, seeded theme choice, and presenter serialization; a materialized view would fight the existing architecture. |
| 5 | Keep full crate payload on initial page forever | Preserves instant crate entry but makes first paint carry about 1.3MB for the measured store; split payload is a stronger tradeoff. |
| 6 | Service worker stale-while-revalidate | Interesting for offline/perceived performance, but it does not remove server-side curation from first uncached requests. |
| 7 | Inertia hover prefetch as the main fix | Helps demo navigation but still causes the server to do expensive work; useful only after static snapshots make the prefetched page cheap. |
| 8 | Old mobile CSS/Framer Motion hint-card optimizations | Still valuable for crate browsing smoothness, but not relevant to the multi-second stores-page load root cause. |
