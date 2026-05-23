---
title: Audit follow-up — code quality, refactoring, performance, and coverage
type: refactor
status: completed
date: 2026-05-23
origin: RAILS_AUDIT_REPORT.md
---

# Audit Follow-Up: Code Quality, Refactoring, Performance, and Coverage

## Summary

Execute the 29 findings from the thoughtbot Rails audit across four phases: quick wins (spec gaps, query optimization, auth hardening), crate strategy and curation pipeline extraction, DiscogsClient and job refactoring, and SQL-optimized scoring. Phases are ordered lowest-risk first so each phase validates approach before touching more complex code.

---

## Problem Frame

The thoughtbot Rails audit scored the codebase highly overall (90.78 RubyCritic, 87.7% coverage) but identified 29 findings across testing, code design, performance, and security. The most impactful are a god-class in `StorefrontCuration` (210 lines, 189 flog), pervasive service-object pattern diverging from thoughtbot's domain-model PORO recommendation, a `DiscogsClient` mixing two auth paths, Ruby-side iteration for scoring pipelines that won't scale, and a zero-coverage dev controller.

Left unaddressed, these accumulate as drag on maintainability — new crate strategies duplicate the same filtering pipeline, the curation cache logic obscures the core algorithm, and the scoring engine must load all listings into memory for every daily run.

---

## Requirements

- R1. Zero-coverage files get specs — `app/controllers/dev_controller.rb`
- R2. Curation pipeline is structurally clean — `StorefrontCuration` extracted into separate caching and curation concerns
- R3. Crate strategies share a common selection pipeline instead of duplicating score-sort-take-N
- R4. `DiscogsClient` is split by auth mechanism — public API (app token, Faraday) separated from OAuth-protected endpoints
- R5. `FullStoreSyncJob` delegates listing import and stale removal to a dedicated object
- R6. `DailySelectionService` computes weights in SQL instead of loading all listings into Ruby memory
- R7. `recent_selection_ids` query uses `unnest(listing_ids)` instead of loading `DailySelection` objects
- R8. Default auth enforcement prevents accidental exposure from new controllers
- R9. `lib/tasks/` files have basic coverage
- R10. Class/module documentation comments added (IrresponsibleModule smell)

---

## Scope Boundaries

- **Only audit-identified work.** No speculative refactoring beyond the specific files and patterns flagged in the report.
- **No frontend changes.** All work is Ruby/Rails backend.
- **No model migrations.** Precomputed score columns (for R6) are deferred — the SQL optimization uses computed CASE expressions, not stored columns.
- **No new auth models or Devise.** Default auth enforcement uses existing `session[:store_owner_id]` pattern only.
- **Service-object-to-PORO renaming deferred.** The audit flagged 15+ service classes using `.call`, but each rename needs domain analysis per class. This plan addresses the structural extractions that make subsequent PORO refactoring easier but does not rename or move classes.

### Deferred to Follow-Up Work

- Service object → domain-model PORO renaming and directory move (requires per-class domain analysis)
- Adding branch coverage to SimpleCov (`enable_coverage :branch`)
- `DiscogsResponseHandler` extraction (absorbed into U6 DiscogsClient split)
- `MarketingPreviewPresenter` duplication with `StorefrontCuration` (identified during flow analysis but outside audit scope)
- `list_orders` dead code removal in `DiscogsClient` (identified during flow analysis)

---

## Context & Research

### Relevant Code and Patterns

- **Result objects via `Data.define`** — consistent pattern across all service objects (e.g., `Result = Data.define(:store, :error) { def success? = error.nil? }`)
- **Presenters with `#props`** — `app/presenters/` returns serialization hashes for Inertia, e.g., `DashboardPresenter.new(store).props`
- **Queries with `#call`** — `app/queries/listings/available_query.rb`
- **Namespacing** — `StoreSync::*`, `CrateStrategies::*`, `ScoreStrategies::*`, `SyncStrategies::*`, `Admin::*`
- **`self.call(...) = new(...).call`** — newer convention for one-shot services (e.g., `StoreOnboarding`)
- **`limits_concurrency to: 1, key: ->(*) { "discogs_api" }`** — global Discogs API concurrency gate
- **`dev_scorer` private class method** — uses `curation.send(:genre_counts)` to reach instance state; must be preserved in extraction

### Institutional Learnings

- `docs/solutions/architecture-patterns/crate-strategies-pattern-2026-05-07.md` — strategies SELECT (filter domain), `RecordScorer` RANKS. The shared scoring pipeline is the exact pattern this plan codifies.
- `docs/solutions/integration-issues/discogs-rate-limit-middleware-2026-05-19.md` — precedent for extracting HTTP transport concerns out of service objects into Faraday middleware.
- `docs/solutions/integration-issues/discogs-oauth-csv-export-2026-05-22.md` — documents the dual-auth architecture; authentication already separated into `DiscogsOauthClient`.

### External References

- thoughtbot *Rails Antipatterns* — callback complexity, fire-and-forget, inaudible failures (referenced in RAILS_AUDIT_REPORT.md sections)
- thoughtbot *Ruby Science* — code smell detection patterns (Large Class, Feature Envy)

---

## Key Technical Decisions

- **Auth enforcement via subclass, not ApplicationController `before_action`.** Adding a `before_action` to `ApplicationController` forces every public controller (PagesController, StoresController, WaitlistsController, AuthController, Api::DiscogsLookupController, DevController, Admin::BaseController) to add `skip_before_action`. A `SessionAuthenticatedController < ApplicationController` that `DashboardController` inherits from avoids the skip-everywhere pattern. (Addresses Q10/Q11 from flow analysis.)
- **DailySelectionService: move all weight components to SQL.** The condition values are stored directly in `listings.condition` (standard Discogs format strings). `DesirabilityStrategy#desirable?` checks `have_count >= 10 AND want_count / have_count >= 2.0` — fully expressible as a CASE expression. Keeping any component in Ruby would require an awkward pre-load-and-inject step that defeats the optimization.
- **PostgreSQL `POWER(RANDOM(), 1.0 / weight)` for reservoir sampling.** The `^` operator is bitwise XOR in PostgreSQL. Use the standard `POWER()` function. (Addresses Q6.)
- **DiscogsClient error classes stay on a shared namespace.** Callers rescue `DiscogsClient::RateLimitError` and `DiscogsClient::ApiError`. Keep them on a `Discogs::Errors` namespace that both new clients include; `DiscogsClient` re-exports for backward compatibility. (Addresses Q8/Q9.)
- **DiscogsClient delegation shim.** After creating `Discogs::PublicClient` and `Discogs::Marketplace`, make `DiscogsClient` delegate to them so existing callers continue working without changes. Update callers in a subsequent pass.
- **SelectionPipeline as a shared module, not template-method base class.** `Picks` has a fundamentally different selection model (genre diversity + day-seed shuffle). `Thematic` returns `[name, listings]` tuples. A template-method base class would be overridden by most strategies. Instead, extract the `reject excluded → score → sort → take` pipeline as `CrateStrategies::SelectionPipeline` module. (Addresses Q3/Q4 from flow analysis.)

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

### Phase 2: Crate strategy shared selection pipeline

The current duplication across strategies:

```
# Every strategy independently:
candidates = pool.reject { |l| excluded_ids.include?(l.id) }
filtered = candidates.select { |l| domain_criteria(l) }
scored = filtered.map { |l| [l, scorer.score(l)] }
  .sort_by { |_, s| -s }
  .map(&:first)
```

Extract as a module:

```ruby
module CrateStrategies
  module SelectionPipeline
    def score_and_sort(pool, excluded_ids:, scorer:)
      pool
        .reject { |l| excluded_ids.include?(l.id) }
        .yield_self { |candidates| yield(candidates) }  # domain filter
        .map { |l| [l, scorer.score(l)] }
        .sort_by { |_, s| -s }
        .map(&:first)
    end
  end
end
```

Used as:

```ruby
class CrateStrategies::Genre
  include SelectionPipeline

  def select(pool, excluded_ids:)
    score_and_sort(pool, excluded_ids:, scorer: @scorer) do |candidates|
      candidates.select { |l| l.primary_genre == @genre }
    end
  end
end
```

### Phase 3: DiscogsClient split

```
DiscogsClient (delegation shim → removed after migration)
├── Discogs::PublicClient    ← Faraday, app token
│   └── Methods: seller_inventory, seller_inventory_pages, release, seller_profile
└── Discogs::Marketplace     ← OAuth::AccessToken
    └── Methods: inventory_export, check_export_status, download_export, recent_exports
```

### Phase 4: DailySelectionService SQL scoring

```
Current: load ALL listings → iterate in Ruby → per-listing weight → weighted sample
Target:  SQL query per store → MATERIALIZED CTE → CASE weights → POWER(RANDOM(), 1.0/weight) → LIMIT. All weight components (recency, condition, desirability, unseen boost) computed as CASE expressions in the CTE.
```

---

## Implementation Units

### U1. Add DevController spec

**Goal:** Close the only zero-coverage file with a request spec covering the login-as flow and environment guard.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Create: `spec/controllers/dev_controller_spec.rb`

**Approach:**
- Test the happy path: `DevController#login_as` sets `session[:store_owner_id]` in development
- Test the guard: raises `RuntimeError` in non-development environments
- Use `allow(Rails.env).to receive(:development?).and_return(false)` for the guard test
- Follow existing controller spec patterns (see `spec/controllers/` for examples)

**Test scenarios:**
- Happy path: hitting `login_as` with a valid store ID sets `session[:store_owner_id]` to the store's owner ID
- Error path: in production/staging/test environments, visiting `login_as` raises "Not available in production"

**Verification:**
- `bundle exec rspec spec/controllers/dev_controller_spec.rb` passes
- Coverage for `app/controllers/dev_controller.rb` goes from 0% to 100%

---

### U2. Optimize `recent_selection_ids` query

**Goal:** Replace loading full `DailySelection` objects with a SQL `unnest(listing_ids)` pluck for the unseen-boost computation in `DailySelectionService`.

**Requirements:** R7

**Dependencies:** None

**Files:**
- Modify: `app/services/daily_selection_service.rb`

**Approach:**
- Replace `DailySelection.where(...).flat_map(&:listing_ids).to_set` with `DailySelection.where(...).pluck(Arel.sql("unnest(listing_ids)")).to_set`
- This avoids loading ActiveRecord objects just for one array column
- The query returns individual listing IDs directly from the array column, skipping object instantiation
- Performance improvement: eliminates N object allocations per daily selection record (N = listing_ids per selection)

**Test scenarios:**
- The unseen boost still applies to listings that haven't appeared in recent selections
- Listings that appeared in recent selections correctly do NOT get the boost (verified via `recent_selection_ids` set membership)
- A store with no recent selections (new store, first day) — `recent_selection_ids` returns empty set, all listings get the unseen boost

**Verification:**
- `bundle exec rspec spec/services/daily_selection_service_spec.rb` passes
- The set of listing IDs returned matches the previous `flat_map` approach (verify manually with existing data)

---

### U3. Add default auth enforcement via `SessionAuthenticatedController`

**Goal:** Add a `SessionAuthenticatedController < ApplicationController` base class that `DashboardController` inherits from, enforcing session-based auth by default for dashboard routes without forcing public controllers to opt out.

**Requirements:** R8

**Dependencies:** None

**Files:**
- Create: `app/controllers/session_authenticated_controller.rb`
- Modify: `app/controllers/dashboard_controller.rb`

**Approach:**
- Create `SessionAuthenticatedController < ApplicationController` with `before_action :require_store_owner_session` that checks `session[:store_owner_id].present?` and redirects to `root_path` with an alert if absent
- Move the `require_store_owner` method from `DashboardController` to the new base class (keeping the same behavior)
- Change `DashboardController` to inherit from `SessionAuthenticatedController` instead of `ApplicationController`
- Leave all other controllers inheriting from `ApplicationController` (they remain public)

**Patterns to follow:**
- Existing `before_action` pattern in `DashboardController#require_store_owner`
- Rails base-class hierarchy pattern (cf. `Admin::BaseController`)

**Test scenarios:**
- Happy path: authenticated store owner can access dashboard
- Error path: unauthenticated user is redirected to root with an alert
- Public controllers (StoresController, AuthController, PagesController, WaitlistsController) remain accessible without session — verify no behavior change

**Verification:**
- `bundle exec rspec` passes — all existing controller specs that don't set up session auth should be unaffected since only `DashboardController` changes inheritance

---

### U4. Extract shared CrateStrategies selection pipeline

**Goal:** Extract the duplicated `reject excluded → score → sort → take` pattern across 5 crate strategies into a shared `SelectionPipeline` module.

**Requirements:** R3

**Dependencies:** None (structural only — no behavioral change)

**Files:**
- Create: `app/services/crate_strategies/selection_pipeline.rb`
- Modify: `app/services/crate_strategies/genre.rb`
- Modify: `app/services/crate_strategies/hidden_gems.rb`
- Modify: `app/services/crate_strategies/new_arrivals.rb`
- Test: `spec/services/crate_strategies/selection_pipeline_spec.rb`

**Approach:**
- Create `CrateStrategies::SelectionPipeline` module with a `score_and_sort` method that handles: reject excluded_ids → yield for domain filter → map(score) → sort_by -score → map(&:first)
- Include in `Genre` (simplest — pure domain filter + pure score sort)
- Include in `HiddenGems` (has domain filter + genre cap — the module handles score/sort, strategy handles genre-cap dedup)
- Include in `NewArrivals` (has expanding-window filter — module handles score/sort of the final candidate set)
- Do NOT include `Picks` — its genre diversity + day-seed shuffle is a fundamentally different sort model
- Do NOT include `Thematic` — its tuple return type and multi-step theme discovery don't fit the signature

**Technical design:**

```ruby
# app/services/crate_strategies/selection_pipeline.rb
module CrateStrategies
  module SelectionPipeline
    def score_and_sort(pool, excluded_ids:, scorer:)
      pool
        .reject { |l| excluded_ids.include?(l.id) }
        .yield_self { |candidates| yield(candidates) }
        .map { |l| [l, scorer.score(l)] }
        .sort_by { |_, s| -s }
        .map(&:first)
    end
  end
end
```

**Patterns to follow:**
- Existing crate strategy pattern documented in `docs/solutions/architecture-patterns/crate-strategies-pattern-2026-05-07.md`
- `RecordScorer` for uniform scoring

**Test scenarios:**
- `score_and_sort` excludes all IDs in `excluded_ids` from the result
- `score_and_sort` passes candidates through the block's domain filter
- `score_and_sort` returns candidates sorted by descending scorer score
- Integration: `Genre#select` with the module produces identical results to the current inline implementation (corpus integration test comparing old and new outputs for the same store data)

**Verification:**
- `bundle exec rspec spec/services/crate_strategies/` passes
- Run an integration test that feeds identical input to old and new `Genre#select` and asserts identical output

---

### U5. Split StorefrontCuration — extract CacheManager

**Goal:** Separate the caching concern from `StorefrontCuration` into `StorefrontCuration::CacheManager`, leaving curated computation logic in `StorefrontCuration`.

**Requirements:** R2

**Dependencies:** None (U4 and U5 are independent structural extractions — can be done in parallel)

**Files:**
- Create: `app/services/storefront_curation/cache_manager.rb`
- Modify: `app/services/storefront_curation.rb` (add delegation methods)
- Modify: `app/services/daily_curation_service.rb`
- Modify: `app/controllers/stores_controller.rb` (if delegation is direct, no change needed)
- Test: `spec/services/storefront_curation/cache_manager_spec.rb`

**Approach:**
- Extract three class methods from `StorefrontCuration` into `StorefrontCuration::CacheManager`:
  - `cached_curation(store, filter_available:, cache:)` — wraps curation + presentation in cache fetch
  - `write_curation_cache(store, curation_payload, filter_available:, cache:)` — pre-warms cache
  - `curation_cache_key(store, filter_available:)` — builds the cache key (remains private)
- Move `dev_scorer` along with the cache logic — accept `genre_counts` as a parameter instead of calling `curation.send(:genre_counts)`
- Note: `send(:genre_counts)` moves from `dev_scorer` to `cached_curation` itself (the caller passes `curation.send(:genre_counts)` to `dev_scorer`). Net improvement of one fewer `send` call site. Full resolution (making `genre_counts` public or extracting it) is deferred.
- Add delegation from `StorefrontCuration`: `def self.cached_curation(...) = CacheManager.cached_curation(...)`
- Update `DailyCurationService` to call `StorefrontCuration::CacheManager.write_curation_cache` directly instead of `StorefrontCuration.write_curation_cache`

**Technical design:**

```ruby
# app/services/storefront_curation/cache_manager.rb
module StorefrontCuration
  class CacheManager
    CURATION_CACHE_TTL = 36.hours
    CURATION_CACHE_RACE_TTL = 30.seconds
    CURATION_CACHE_KEY = "storefront/curation/v1/%<store_id>s/%<date>s/%<scope>s"

    def self.cached_curation(store, filter_available: true, cache: Rails.cache)
      key = curation_cache_key(store, filter_available:)
      cache.fetch(key, expires_in: CURATION_CACHE_TTL, race_condition_ttl: CURATION_CACHE_RACE_TTL) do
        curation  = StorefrontCuration.new(store, filter_available:)
        scorer    = dev_scorer(curation.send(:genre_counts))
        presenter = CratePresenter.new(store, scorer:)
        {
          sections: presenter.build_storefront_sections(curation.storefront_groups),
          crates:   presenter.build_crates(curation.crates)
        }
      end
    end

    def self.write_curation_cache(store, curation_payload, ...)
      # ...
    end

    private

    def self.curation_cache_key(store, filter_available:)
      # ...
    end

    def self.dev_scorer(genre_counts)
      return nil unless Rails.env.development?
      RecordScorer.new(genre_counts:, today: Date.today)
    end
  end
end
```

**Patterns to follow:**
- Existing `StoreSync::*` namespacing pattern
- Class methods for stateless cache operations

**Test scenarios:**
- `cached_curation` returns cached payload on cache hit (verifies cache key construction)
- `cached_curation` builds + caches on cache miss (verifies the block executes)
- `write_curation_cache` writes the expected key-value pair
- Cache key includes store ID, date, and scope (available vs all)
- `StorefrontCuration.cached_curation` delegates to `CacheManager.cached_curation`

**Verification:**
- `bundle exec rspec spec/services/storefront_curation_spec.rb` passes (delegation shim preserves existing behavior)
- `bundle exec rspec spec/services/daily_curation_service_spec.rb` passes

---

### U6. Split DiscogsClient

**Goal:** Extract OAuth-protected endpoints from `DiscogsClient` into `Discogs::Marketplace`, leaving public API methods in `Discogs::PublicClient`. Keep `DiscogsClient` as a delegation shim for backward compatibility.

**Requirements:** R4

**Dependencies:** None

**Files:**
- Create: `app/services/discogs/public_client.rb`
- Create: `app/services/discogs/marketplace.rb`
- Create: `app/services/discogs/errors.rb`
- Modify: `app/services/discogs_client.rb` (add delegation shim)
- Test: `spec/services/discogs/public_client_spec.rb`
- Test: `spec/services/discogs/marketplace_spec.rb`

**Approach:**
- Move error classes to `Discogs::Errors` module: `RateLimitError < StandardError`, `ApiError < StandardError`. `DiscogsClient` re-exports by referencing `Discogs::Errors::RateLimitError` as `DiscogsClient::RateLimitError = Discogs::Errors::RateLimitError`.
- Create `Discogs::PublicClient` with:
  - Faraday connection (same `build_connection` pattern)
  - Methods: `seller_inventory`, `seller_inventory_pages`, `release`, `seller_profile`
  - `handle_response` for Faraday response objects (`response.status`)
  - `DiscogsRateLimitMiddleware` in Faraday stack
- Create `Discogs::Marketplace` with:
  - OAuth `AccessToken` construction from provided token/secret
  - Methods: `inventory_export`, `check_export_status`, `download_export`, `recent_exports`
  - `parse_oauth_response` for OAuth response objects (`response.code`)
  - `require_oauth!` is unnecessary — this client only has OAuth methods
- Add delegation to `DiscogsClient`:
  - Public methods delegate to `Discogs::PublicClient.new(...)`
  - OAuth methods delegate to `Discogs::Marketplace.new(...)`
  - Keep the same constructor signature for backward compatibility
- Add `Discogs::Error` namespace as `Discogs::Errors` so both syntaxes work

**Patterns to follow:**
- `DiscogsOauthClient` pattern (separate client for OAuth token exchange)
- Faraday middleware pattern from `docs/solutions/integration-issues/discogs-rate-limit-middleware-2026-05-19.md`

**Test scenarios:**
- `Discogs::PublicClient#seller_inventory` calls the correct Discogs API endpoint with pagination params
- `Discogs::PublicClient#release` returns parsed release data + remaining rate limit
- `Discogs::PublicClient#handle_response` raises `RateLimitError` on 429
- `Discogs::Marketplace#inventory_export` uses OAuth access token and returns export ID
- `Discogs::Marketplace#check_export_status` parses status response
- Callers using `DiscogsClient.new(...).seller_inventory(...)` still work via delegation shim
- `DiscogsClient::ApiError` is the same class as `Discogs::Errors::ApiError`

**Verification:**
- `bundle exec rspec spec/services/discogs_client_spec.rb` passes (delegation shim preserves behavior)
- `bundle exec rspec spec/services/` — all specs referencing `DiscogsClient` continue to pass

---

### U7. Extract FullStoreSyncJob import and stale-removal logic

**Goal:** Move `import_listings`, `remove_stale_listings`, and `materially_changed?` out of `FullStoreSyncJob` into `StoreSync::InventoryUpdater`.

**Requirements:** R5

**Dependencies:** None

**Files:**
- Create: `app/services/store_sync/inventory_updater.rb`
- Modify: `app/jobs/full_store_sync_job.rb`
- Test: `spec/services/store_sync/inventory_updater_spec.rb`

**Approach:**
- Extract into `StoreSync::InventoryUpdater` with:
  - `initialize(store)` — takes the store
  - `call(listings)` — returns `listing_ids_for_enrichment` (same as current `import_listings`)
  - `remove_stale(listings)` — removes listings not in the current sync
  - Private: `materially_changed?`, `normalized_price`, `differing?`, `UPDATE_FIELDS` constant
- Move `UPDATE_FIELDS` constant to the extracted class
- `FullStoreSyncJob#perform` calls `StoreSync::InventoryUpdater.new(store).call(result.listings)` instead of inline logic
- Keep concurrency limiting, status management, enrichment dispatch, and curation scheduling in the job — these are job-infrastructure concerns

**Patterns to follow:**
- Existing `StoreSync::*` namespace (`StoreSync::InventoryFetcher`, `StoreSync::ListingNormalizer`, `StoreSync::StatusManager`)
- `StoreSync::InventoryFetcher` for the closest precedent in the same module

**Test scenarios:**
- Happy path: importing new listings creates records and returns IDs for enrichment
- Material change detection: a listing with changed price/condition/notes returns its ID for enrichment
- No material change: listings unchanged since last sync do NOT return their IDs (avoids unnecessary enrichment)
- Stale removal: listings not in the current sync are deleted
- Empty import: when `listings` is empty, no records are created and empty array is returned

**Verification:**
- `bundle exec rspec spec/jobs/full_store_sync_job_spec.rb` passes
- `bundle exec rspec spec/services/store_sync/inventory_updater_spec.rb` — new spec passes

---

### U8. Push DailySelectionService scoring to SQL

**Goal:** Move the per-listing weight computation from Ruby iteration to a PostgreSQL MATERIALIZED CTE with CASE expressions for all weight components.

**Requirements:** R6

**Dependencies:** Both U2 and U8 modify `daily_selection_service.rb`. U2 runs in Phase 1 and optimizes the Ruby `recent_selection_ids` method. U8's SQL path does not call this Ruby method — the unseen boost is handled by a SQL LEFT JOIN subquery. The carry-over Ruby path may still use the optimized method after U8.

**Files:**
- Modify: `app/services/daily_selection_service.rb`
- Modify: `app/services/daily_selection_service.rb` — add private SQL builder method
- Test: `spec/services/daily_selection_service_spec.rb`

**Approach:**
- The scoring weight is computed as: base(1) + recency + quality + desirability + unseen_boost
- Move all weight components to SQL CASE expressions in a MATERIALIZED CTE. The condition check maps to `LIKE` patterns on `listings.condition`; desirability is `have_count >= 10 AND want_count::float / NULLIF(have_count, 0) >= 2.0`.
- Use a `MATERIALIZED` CTE wrapping all weight computation to prevent PostgreSQL from re-evaluating `RANDOM()` per sort row.
- Use `LEFT JOIN` with the CTE for the unseen boost (not `NOT IN` on array columns, which has NULL complications).
- For carry-over and fresh phases: two SQL phases over the shared CTE, kept separate because they use different ordering expressions (deterministic weight DESC vs POWER(RANDOM(), 1.0/weight) DESC).
- Use `POWER(RANDOM(), 1.0 / GREATEST(selection_weight, 0.1))` for the weighted reservoir sampling ORDER BY.
- Keep `SELECTION_SIZE`, `OVERLAP_FRACTION`, and weight constants on the class.

**Full query sketch:**

```sql
WITH recent_seen AS MATERIALIZED (
  SELECT DISTINCT unnest(listing_ids) AS listing_id
  FROM daily_selections
  WHERE store_id = :store_id AND selected_on BETWEEN :seven_days_ago AND :today
),
weighted_listings AS MATERIALIZED (
  SELECT l.id,
    1
    + CASE WHEN l.listed_at >= CURRENT_DATE - 30 THEN 3
           WHEN l.listed_at >= CURRENT_DATE - 90 THEN 2
           ELSE 0
      END
    + CASE WHEN l.condition LIKE '%(M)%' OR l.condition LIKE '%(NM%' OR l.condition LIKE '%(VG+)%'
           THEN 2 ELSE 0
      END
    + CASE WHEN l.have_count >= 10
             AND l.want_count::float / NULLIF(l.have_count, 0) >= 2.0
           THEN 3 ELSE 0
      END
    + CASE WHEN rs.listing_id IS NULL THEN 4 ELSE 0 END
    AS weight
  FROM listings l
  LEFT JOIN recent_seen rs ON l.id = rs.listing_id
  WHERE l.store_id = :store_id
)
-- Phase 1: carry-over (deterministic top-k, from yesterday's selection)
(SELECT id FROM weighted_listings
 WHERE id = ANY(:yesterday_ids)
 ORDER BY weight DESC
 LIMIT :carry_count)
UNION ALL
-- Phase 2: fresh (weighted random, excluding carry-over)
(SELECT id FROM weighted_listings
 WHERE id NOT IN (SELECT id FROM weighted_listings
                  ORDER BY weight DESC LIMIT :carry_count)
 ORDER BY POWER(RANDOM(), 1.0 / GREATEST(weight, 0.1)) DESC
 LIMIT :fresh_count)
```

**Execution note:** Add characterization coverage before modifying — write a spec that captures the current selection distribution, then refactor, then verify the SQL path produces substantially similar results. Use `SETSEED()` for reproducible comparison.

**Test scenarios:**
- Happy path: SQL scoring produces identical weights to the Ruby implementation for known inputs (recency window, condition flags, desirability flags)
- Unseen boost: listings in recent selections correctly receive lower weights than unseen listings
- Empty recent selections: new store with no history — all listings get the unseen boost
- Edge: `listed_at` is nil — CASE expression returns 0 for recency (matching current Ruby `if listing.listed_at` guard)
- Edge: `selection_weight` is 0 — `GREATEST(0, 0.1)` ensures no division by zero in `POWER()`
- Integration: for a real store's listings, the SQL and Ruby pathways select sets with >90% Jaccard similarity (run once manually to validate)

**Verification:**
- `bundle exec rspec spec/services/daily_selection_service_spec.rb` passes
- Manual validation: for the demo store's listing set, the old and new `generate` methods produce daily selections with >90% overlap

---

### U9. Add class/module documentation comments

**Goal:** Address the `IrresponsibleModule` Reek smell (99 occurrences) by adding brief class/module comments to all public-facing classes.

**Requirements:** R10

**Dependencies:** None

**Files:**
- Modify: all files in `app/services/`, `app/models/`, `app/controllers/`, `app/presenters/`, `app/queries/`, `app/values/`, `app/jobs/`, `app/mailers/`

**Approach:**
- Add a single-line or short-block class comment to each class/module describing its responsibility in one sentence
- Follow the format: `# Orchestrates [what] for [whom/context].` or `# Implements [pattern/behavior] for [purpose].`
- Prioritize `app/services/` (most files, most impact) — controllers and models mostly already have self-evident names
- Do not add comments to trivial or framework-generated files (`ApplicationRecord`, `ApplicationJob`)

**Patterns to follow:**
- Existing comment on `StorefrontCuration` (already has class comment)
- Use the thoughtbot convention: describe WHAT the class does, not HOW

**Verification:**
- `bundle exec rubocop` and `bundle exec rubycritic` show reduced IrresponsibleModule count (confirm with `rubycritic` before/after)

---

### U10. Add rake task coverage for `lib/tasks/`

**Goal:** Add basic smoke tests for the two rake task files at low coverage (17.4% and 42.2%).

**Requirements:** R9

**Dependencies:** None

**Files:**
- Create: `spec/tasks/milkcrate_spec.rb`
- Create: `spec/tasks/experiment_spec.rb`

**Approach:**
- For `lib/tasks/milkcrate.rake`: smoke test that each task (`milkcrate:sync_all`, `milkcrate:curate_all`, etc.) enqueues the expected job or produces expected output
- For `lib/tasks/experiment.rake`: test the experiment run flow — verify it can list, run, or report without errors
- Use `Rails.application.load_tasks` in a before-context, then `Rake::Task["task:name"].invoke`
- Keep tests at smoke-test level — don't test the internal logic of services called by tasks (those are tested in their own specs)

**Patterns to follow:**
- Standard RSpec rake task testing pattern with `Rake::Task#invoke`
- Use `before(:each) { Rake::Task["task:name"].reenable }` to allow multiple invocations

**Test scenarios:**
- `milkcrate:sync_all` enqueues `SyncAllStoresJob` or `FullStoreSyncJob` for each store
- `milkcrate:curate_all` enqueues `DailyCurationJob` for each store
- `experiment:list` outputs experiment names without error
- Rake task scope: no task raises an unexpected error when invoked with default arguments

**Verification:**
- `bundle exec rspec spec/tasks/` passes
- SimpleCov shows coverage for `lib/tasks/milkcrate.rake` > 70%

---

### U11. (Deferred) Add branch coverage to SimpleCov

**Goal:** Enable branch coverage tracking in SimpleCov for more thorough coverage analysis.

**Requirements:** (informational — no R-ID)

**Dependencies:** None

**Approach:**
The audit noted branch coverage was N/A. This is a one-line config change:

```ruby
SimpleCov.start "rails" do
  enable_coverage :branch
end
```

However, adding branch coverage typically drops reported percentages significantly — it's a different metric, not a regression. This should only be applied after agreeing on new coverage targets and ensuring the team understands the metric change.

**Deferred — not implemented in this plan.** The structural refactors in U4-U8 are higher priority. Branch coverage can be added as a separate config-only PR.

---

## System-Wide Impact

- **Interaction graph:**
  - U5 (CacheManager) changes how `DailyCurationService` writes cache — currently it calls `StorefrontCuration.write_curation_cache` directly; after extraction it calls `StorefrontCuration::CacheManager.write_curation_cache`
  - U3 (SessionAuthenticatedController) changes `DashboardController`'s inheritance chain — affects `before_action` ordering
  - U6 (DiscogsClient split) touches every caller through delegation shim, so no immediate interaction change, but future callers should use the new classes
- **Error propagation:**
  - U6 moves error classes to `Discogs::Errors` with re-exports — all current `rescue DiscogsClient::ApiError` continue working
  - U5 preserves all error behavior — CacheManager wraps the same curation+presentation block
- **State lifecycle risks:**
  - U8 (SQL scoring) changes the selection algorithm — must be validated with parallel shadow run before full cutover
  - U2 (recent_selection_ids) is a pure optimization with identical set semantics — no risk
- **Integration coverage:**
  - U4 (SelectionPipeline) is structural — verify with an integration test that old and new `Genre#select` produce identical output for the same input
  - U7 (InventoryUpdater) is a pure extraction — verify job spec passes with the extracted class
- **Unchanged invariants:**
  - All controller action behavior is preserved — U3 only changes `DashboardController`'s base class with the same `before_action` logic
  - All external API behavior is preserved — U6 uses the same Faraday/OAuth configurations

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| U8 SQL scoring produces different daily selections | Parallel shadow run: keep both Ruby and SQL paths; compare daily selection overlap > 90% before removing Ruby path |
| U6 delegation shim drifts from new classes | Update `DiscogsClient` constructor to delegates, not copy. Run full spec suite after each change to catch drift immediately |
| U5 CacheManager extraction misses edge case in `dev_scorer` (`curation.send(:genre_counts)`) | `dev_scorer` accepts `genre_counts` as parameter instead of reaching into instance. Verify development-only behavior works |
| U3 authentication change breaks existing controller specs | `SessionAuthenticatedController` uses the same `session[:store_owner_id]` check — specs that already set up session auth continue working |
| Crate strategy extraction (U4) changes selection output | Add an integration test that feeds identical input to old and new `Genre#select` before/after to prove identical output |

---

## Phased Delivery

### Phase 1: Quick Wins (U1, U2, U3)

Safe, bounded changes:
- U1: DevController spec (the only 0% coverage file)
- U2: `recent_selection_ids` query optimization (pure SQL improvement)
- U3: `SessionAuthenticatedController` (base class, no behavioral change for any action)

### Phase 2: Pipeline Refactoring (U4, U5)

Structural extractions with no behavioral change:
- U4: Shared `SelectionPipeline` module (Genre, HiddenGems, NewArrivals)
- U5: `StorefrontCuration::CacheManager` (cache separation from curation logic)

### Phase 3: Service Layer Extraction (U6, U7, U9)

Splitting and extracting service concerns:
- U6: DiscogsClient split (delegation shim + two new classes)
- U7: FullStoreSyncJob → StoreSync::InventoryUpdater
- U9: Class documentation (can be done in parallel with other Phase 3 work)

### Phase 4: Performance & Coverage (U8, U10)

Higher-risk items that benefit from running after the codebase is structurally clean:
- U8: DailySelectionService SQL scoring
- U10: Rake task coverage

---

## Open Questions

### Deferred to Implementation

- **U8 carry-over query merge:** Whether `compute_carry_over` and `compute_fresh` can be merged into a single SQL query or whether keeping them separate is simpler. The plan recommends keeping them separate (different ordering expressions).
- **U6 constructor compatibility with delegation:** Whether `DiscogsClient` can fully delegate to `Discogs::PublicClient` and `Discogs::Marketplace` with the same constructor, or whether the delegation needs a routing layer. The flow analysis suggests full constructor compatibility — verify during implementation.

---

## Sources & References

- **Origin document:** `RAILS_AUDIT_REPORT.md`
- Related code: `app/services/storefront_curation.rb`, `app/services/discogs_client.rb`, `app/services/daily_selection_service.rb`, `app/jobs/full_store_sync_job.rb`, `app/services/crate_strategies/`
- Related docs: `docs/solutions/architecture-patterns/crate-strategies-pattern-2026-05-07.md`, `docs/solutions/integration-issues/discogs-rate-limit-middleware-2026-05-19.md`, `docs/solutions/integration-issues/discogs-oauth-csv-export-2026-05-22.md`
