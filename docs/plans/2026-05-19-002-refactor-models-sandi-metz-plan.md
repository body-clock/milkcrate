---
title: refactor: Improve model adherence to Sandi Metz POODR principles
type: refactor
status: active
date: 2026-05-19
deepened: 
---

# Refactor: Improve Model Adherence to Sandi Metz POODR Principles

## Summary

Refactor four model files ($record_scorer$, $store$, $listing$, $daily_selection$, $storefront_theme$, $release$) to eliminate violations identified by a Sandi Metz POODR review. Extract scoring dimensions into strategy objects, lifecycle management into dedicated managers, embedded SQL into a query object, and shared value objects (WantHaveRatio). The codebase already has proven patterns for all of these — the work follows existing conventions rather than inventing new abstractions.

---

## Problem Frame

The Sandi Metz review found violations across 6 model files:

- **RecordScorer** (135 lines, 8 responsibilities) — exceeds the 100-line class limit, has methods up to 15 lines (5-line limit), couples to 11 raw Listing attributes, and queries listing state instead of sending messages (Tell Don't Ask)
- **Store** (3 lifecycle responsibilities) — sync state, enrichment state, and catalog coverage are separate concerns living in one class
- **Listing** — the `available` scope embeds business policy (catalog-coverage rules, recency thresholds) inside raw SQL on the model
- **DailySelection** — `store.listings.where(...)` violates Law of Demeter (3 dots)
- **StorefrontTheme** — `sort_key` reaches into 4 listing attributes instead of sending a message
- **Release** — nil guards on `want_have_ratio` duplicate logic that RecordScorer already has

Each violation increases the cost of change: a policy update requires modifying the model, coupling spreads when attributes are accessed by name, and testing is harder because concerns aren't isolated.

---

## Requirements

- R1. Eliminate Sandi Metz Rule #1 violations (classes > 100 lines) from RecordScorer
- R2. Eliminate Sandi Metz Rule #2 violations (methods > 5 lines) from RecordScorer
- R3. Eliminate Tell Don't Ask violations: RecordScorer queries Listing attributes instead of sending messages
- R4. Eliminate SRP violations: Store has 3 lifecycle concerns, Listing embeds business policy in SQL
- R5. Eliminate Law of Demeter violations: DailySelection (3 dots), StorefrontTheme (4 attribute accesses)
- R6. Eliminate duplicated logic: Release#want_have_ratio and RecordScorer#desirability_points both compute want/have ratio
- R7. Preserve all existing public interfaces — callers (crate strategies, jobs, controllers) must not change

---

## Scope Boundaries

- No schema changes, database migrations, or new columns
- No changes to public API surface (controllers, Inertia props, background job signatures)
- No changes to StorefrontTheme's public interface (`.style`, `.genre`, `.eligible?`, `.listings_for`)
- No new directories beyond `app/values/` (which will be created)
- No changes to how crate strategies construct or use RecordScorer

### Deferred to Follow-Up Work

- Arel parameterization of `daily_shuffle` scope (Listing) — minor fix, can be done during U6 cleanup or a separate PR
- Formal `ScorableListing` duck type with factory method — defer until a second scoring dimension extraction is needed

---

## Context & Research

### Relevant Code and Patterns

The codebase already has four proven extraction patterns to follow:

| Pattern | Example | Apply to |
|---------|---------|----------|
| **Strategy pattern with module namespace** | `CrateStrategies::Picks`, `CrateStrategies::NewArrivals` with uniform `select(pool, excluded_ids:)` interface | Scoring dimensions in RecordScorer: each dimension becomes a `ScoreStrategies::*` object with `score(listing) -> Float` |
| **Sub-service decomposition** | `StoreSync::InventoryFetcher`, `StoreSync::ListingNormalizer`, `StoreSync::ListingReconciler`, `StoreSync::CoverageClassifier` | Sync lifecycle extraction from Store: `StoreSync::StatusManager` |
| **Data.define result objects** | `StoreSyncService::Result`, `StoreOnboarding::Result`, `StoreSync::InventoryFetcher::Result` | Return typed results from query object and managers |
| **Constructor injection** | `StoreSyncService.new(store)`, `StoreOnboarding.new(discogs_username:, waitlist:, client:)` | All new collaborators receive dependencies via constructors |

### Institutional Learnings

- **Crate strategies pattern** (`docs/solutions/architecture-patterns/crate-strategies-pattern-2026-05-07.md`): Strategies share one `RecordScorer` instance. Each implements `select(pool, excluded_ids:)`. Score-once-then-filter avoids O(G × L) scoring calls. This directly validates keeping RecordScorer as a composer while extracting internal dimensions.
- **Middleware extraction** (`docs/solutions/integration-issues/discogs-rate-limit-middleware-2026-05-19.md`): Duplicated constants (`RATE_LIMIT_DELAY`, `RATE_LIMIT_SLEEP`) were removed after extraction — same pattern applies when extracting lifecycle methods from Store.
- **Guard-parity audit** (`docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md`): After splitting a method across extracted objects, verify every precondition/guard appears on every extracted path. Apply to DailySelection and StorefrontTheme Law of Demeter fixes.

### External References

None needed — the codebase has direct examples of every extraction pattern.

---

## Key Technical Decisions

- **Scoring strategies live in `ScoreStrategies` module** under `app/services/score_strategies/` — follows the same module-namespace convention as `CrateStrategies` and `StoreSync::`
- **WantHaveRatio lives in `app/values/want_have_ratio.rb`** — follows the existing `Data.define` pattern for immutable value objects
- **Query objects live in `app/queries/`** — new directory (no existing convention), keeps query logic out of models without forcing a service wrapper
- **Lifecycle managers live in `app/services/store_sync/` and `app/services/store_enrichment/`** — follows the existing `StoreSync::` namespace pattern
- **RecordScorer stays in `app/models/`** — it's used by services (crate strategies) as a value-type computation engine. Moving it would break the pattern of where non-AR models live in this codebase. Its internal dimensions are extracted, but the public wrapper stays put.
- **All refactors preserve RecordScorer's public interface** (`score(listing)`, `score_breakdown(listing)`, `good_condition?(listing)`, `desirable?(listing)`) — only private internals change, so all callers (crate strategies, specs) remain unchanged.

---

## Implementation Units

### U1. Extract `WantHaveRatio` Value Object

**Goal:** Extract shared want/have ratio logic used by both Release#want_have_ratio and RecordScorer#desirability_points into a reusable, testable value object.

**Requirements:** R6

**Dependencies:** None

**Files:**
- Create: `app/values/want_have_ratio.rb`
- Modify: `app/models/release.rb`
- Modify: `app/models/record_scorer.rb`
- Create: `spec/values/want_have_ratio_spec.rb`

**Approach:**
- Use `Data.define(:want, :have)` as the base pattern (matching existing `StoreSyncService::Result`, `StoreOnboarding::Result`)
- Provide `#ratio` (safe division, returns 0.0 when have is 0 or nil)
- Provide `#high?` (ratio >= 2.0 and have >= 10)
- Provide `#low?` (ratio <= 0.5 and have >= 10)
- Provide `#log_base_score` (Math.log10(total).clamp(0, 4.0) for total > 0)
- Release#want_have_ratio becomes `WantHaveRatio.new(want_count, have_count).ratio`
- RecordScorer#desirability_points uses `WantHaveRatio` for ratio computation and bonus/penalty logic

**Patterns to follow:**
- `StoreSyncService::Result` for `Data.define` pattern
- Existing `lib/` value objects (if any) for directory convention — otherwise `app/values/` as a new directory

**Test scenarios:**
- Happy path: `WantHaveRatio.new(10, 5).ratio` → 2.0
- Happy path: `WantHaveRatio.new(10, 5).high?` → true
- Edge case: `WantHaveRatio.new(0, 0).ratio` → 0.0 (nil-safe)
- Edge case: `WantHaveRatio.new(0, 0).high?` → false (below MIN_HAVE)
- Edge case: `WantHaveRatio.new(10, 0).ratio` → 0.0 (zero have)
- Edge case: `WantHaveRatio.new(nil, nil)` → ratio 0.0, all predicates false
- Edge case: `WantHaveRatio.new(1, 1).low?` → true (0.5 < ratio <= 1.0, but ratio=1.0 > 0.5 threshold? Actually ratio=1.0 so not low)
- Integration: Release#want_have_ratio returns same value as `WantHaveRatio.new(want_count, have_count).ratio`

**Verification:**
- `WantHaveRatio` specs pass
- Existing Release spec passes without modification
- Existing RecordScorer spec passes without modification

---

### U2. Extract Scoring Dimensions from RecordScorer into Strategy Objects

**Goal:** Decompose RecordScorer's 8 private scoring methods into standalone strategy objects, each implementing `score(listing) -> Float`. RecordScorer becomes a composer that injects strategies and iterates them.

**Requirements:** R1 (class size), R2 (method length), R3 (Tell Don't Ask)

**Dependencies:** U1 (WantHaveRatio)

**Files:**
- Create: `app/services/score_strategies/vintage_strategy.rb`
- Create: `app/services/score_strategies/condition_strategy.rb`
- Create: `app/services/score_strategies/section_strategy.rb`
- Create: `app/services/score_strategies/desirability_strategy.rb`
- Create: `app/services/score_strategies/metadata_strategy.rb`
- Create: `app/services/score_strategies/cover_quality_strategy.rb`
- Create: `app/services/score_strategies/freshness_strategy.rb`
- Create: `app/services/score_strategies/noise_strategy.rb`
- Create: `spec/services/score_strategies/vintage_strategy_spec.rb`
- Create: `spec/services/score_strategies/condition_strategy_spec.rb`
- Create: `spec/services/score_strategies/section_strategy_spec.rb`
- Create: `spec/services/score_strategies/desirability_strategy_spec.rb`
- Create: `spec/services/score_strategies/metadata_strategy_spec.rb`
- Create: `spec/services/score_strategies/cover_quality_strategy_spec.rb`
- Create: `spec/services/score_strategies/freshness_strategy_spec.rb`
- Create: `spec/services/score_strategies/noise_strategy_spec.rb`
- Modify: `app/models/record_scorer.rb`

**Approach:**
- Each strategy is a plain Ruby class (no base class, no module mixin) that implements `score(listing) -> Float`
- Strategies are stateless where possible; stateful ones (section_strategy needs `genre_counts`, freshness_strategy needs `today`, noise_strategy needs `today`) receive dependencies via constructor
- RecordScorer#initialize accepts `strategies:` with a default that builds the full set — callers inject when customizing
- RecordScorer#score delegates to `@strategies.sum { |s| s.score(listing) }`
- RecordScorer#score_breakdown stays as a public method but now delegates to named strategies
- RecordScorer#good_condition? delegates to ConditionStrategy
- RecordScorer#desirable? delegates to DesirabilityStrategy
- Constants move from RecordScorer to their respective strategy classes
- RecordScorer's private methods become one-liner delegations, then are removed

**Technical design:**
```ruby
# RecordScorer becomes a thin composer:
class RecordScorer
  def initialize(
    strategies: DEFAULT_STRATEGIES,
    genre_counts:,
    today: Date.today
  )
    @strategies = strategies
    @genre_counts = genre_counts
    @today = today
  end

  def score(listing)
    score_breakdown(listing).values.sum
  end

  def score_breakdown(listing)
    @strategies.transform_values { |s| s.score(listing) }
  end

  def good_condition?(listing)
    condition_strategy.score(listing).positive?
  end

  def desirable?(listing)
    desirability_strategy.desirable?(listing)
  end

  private

  def condition_strategy
    @strategies[:condition]
  end

  def desirability_strategy
    @strategies[:desirability]
  end

  DEFAULT_STRATEGIES = {
    vintage: VintageStrategy.new,
    condition: ConditionStrategy.new,
    section: SectionStrategy.new,
    desirability: DesirabilityStrategy.new,
    metadata: MetadataStrategy.new,
    cover_quality: CoverQualityStrategy.new,
    freshness: FreshnessStrategy.new,
    noise: NoiseStrategy.new
  }.freeze

  private_constant :DEFAULT_STRATEGIES
end
```

Each strategy is simple and testable in isolation:
```ruby
# app/services/score_strategies/condition_strategy.rb
class ScoreStrategies::ConditionStrategy
  GOOD_CONDITIONS = %w[Mint NM M VG+].freeze
  CONDITION_ALIASES = { "near mint" => "NM", "m-" => "M", "mint-" => "M" }.freeze

  def score(listing)
    listing.good_condition? ? 1.0 : 0.0
  end
end
```

Note: This approach requires adding `good_condition?` to Listing (or a duck type). The alternative (keeping condition logic in the strategy class) retains the Tell Don't Ask violation. The plan prefers adding it to Listing since condition data is owned by Listing.

If adding methods to Listing feels like scope creep: an intermediate approach is to keep condition matching in the strategy but use a dedicated `ConditionNormalizer` value object, separating the normalization concern from the scoring concern. The plan defers this choice to implementation — either path satisfies POODR.

**Patterns to follow:**
- `CrateStrategies::Picks` for strategy module namespace convention
- `StoreSync::InventoryFetcher` for single-responsibility extraction

**Test scenarios:**
- Each strategy: happy path (matching listing → expected score), edge case (non-matching listing → 0.0), nil/empty attribute handling
- VintageStrategy: year < 1980 → 2.0; year >= 1980 → 0.0; year nil → 0.0
- ConditionStrategy: good condition → 1.0; poor condition → 0.0; aliased condition → 1.0
- SectionStrategy: small genre → 3.0; large genre → 0.0
- DesirabilityStrategy: high want/have → positive; low want/have → negative; below MIN_HAVE → 0.0
- MetadataStrategy: missing metadata → -1.0; complete metadata → 0.0
- CoverQualityStrategy: both cover and thumb present and different → 1.0; one missing → -1.0; both nil → 0.0
- FreshnessStrategy: never surfaced → 3.0; surfaced recently → -5.0; surfaced long ago → 1.0
- NoiseStrategy: returns deterministic output for same listing+today
- Integration: RecordScorer.score returns same total as before (characterization test)

**Verification:**
- All strategy specs pass
- RecordScorer spec passes without modification (preserves public interface)
- Crate strategy specs pass (they use RecordScorer through its public interface)

---

### U3. Extract Sync and Enrichment Lifecycle from Store into Managers

**Goal:** Move sync lifecycle methods (`stale?`, `mark_sync_succeeded!`, `mark_sync_failed!`, `summarized_sync_error`) and enrichment lifecycle methods (`mark_enrichment_started!`, `mark_enrichment_succeeded!`, `mark_enrichment_failed!`) out of Store into dedicated manager objects.

**Requirements:** R4 (SRP violations)

**Dependencies:** None

**Files:**
- Create: `app/services/store_sync/status_manager.rb`
- Create: `app/services/store_enrichment/status_manager.rb`
- Create: `spec/services/store_sync/status_manager_spec.rb`
- Create: `spec/services/store_enrichment/status_manager_spec.rb`
- Modify: `app/models/store.rb`
- Modify: jobs/files that call Store lifecycle methods (find with grep)

**Approach:**
- `StoreSync::StatusManager` takes a store record and provides `stale?`, `mark_succeeded!(attributes = {})`, `mark_failed!(error)`, private `summarized_error(error)`
- `StoreEnrichment::StatusManager` takes a store record and provides `mark_started!`, `mark_succeeded!(finished_at:)`, `mark_failed!`
- Constants like `STALE_THRESHOLD = 23.hours` move into `StoreSync::StatusManager`
- Store itself keeps the `stale?` method as a convenient delegation: `def stale?; StoreSync::StatusManager.new(self).stale?; end` — or remove it and update callers. Prefer removing and updating callers directly since the method is only used in a few places.
- Callers that currently call `store.mark_sync_succeeded!` switch to `StoreSync::StatusManager.new(store).mark_succeeded!`
- The `summarized_sync_error` formatting logic stays private to `StoreSync::StatusManager`

**Patterns to follow:**
- `StoreSync::ListingReconciler` for manager-with-constructor-pattern
- `StoreSync::CoverageClassifier` for extracted policy object

**Test scenarios:**
- SyncManager: `stale?` returns true when last_synced_at is nil
- SyncManager: `stale?` returns true when last_synced_at > 23.hours.ago
- SyncManager: `stale?` returns false when recently synced
- SyncManager: `mark_succeeded!` updates sync_status to idle, clears error fields
- SyncManager: `mark_failed!` updates sync_status to failed, records error summary
- SyncManager: error summary truncates backtrace to 8 lines
- EnrichmentManager: `mark_started!` sets enrichment_status to enriching
- EnrichmentManager: `mark_succeeded!` sets enrichment_status to idle, records finished_at
- EnrichmentManager: `mark_failed!` sets enrichment_status to failed
- Integration: Store record state is correctly updated after each operation

**Verification:**
- Manager specs pass
- Sync and enrichment job specs pass (they're the primary callers)
- Store spec no longer tests lifecycle methods

---

### U4. Extract `AvailableListingsQuery` from Listing

**Goal:** Move the `available` scope's business policy (catalog-coverage rules, recency thresholds, sync-timestamp comparisons) out of Listing into a dedicated query object.

**Requirements:** R4 (SRP violations)

**Dependencies:** None

**Files:**
- Create: `app/queries/listings/available_query.rb`
- Create: `spec/queries/listings/available_query_spec.rb`
- Modify: `app/models/listing.rb`
- Modify: callers of `Listing.available` (find with grep — likely crate strategies, curation services)

**Approach:**
- `Listings::AvailableQuery` accepts an ActiveRecord::Relation at construction (defaults to `Listing.all`) and returns a relation via `#call`
- Encapsulates the entire `joins(:store).where(...)` SQL block
- Extracts the two `3.days.ago` references into a named constant `RECENCY_THRESHOLD = 3.days`
- Listing keeps a delegation: `scope :available, -> { Listings::AvailableQuery.new.call }` — or removes the scope and updates callers. Prefer keeping the delegation to minimize caller changes.
- Query object receives the threshold as an optional parameter for testability: `AvailableQuery.new(recency_threshold: 5.days)`

**Technical design:**
```ruby
# app/queries/listings/available_query.rb
class Listings::AvailableQuery
  RECENCY_THRESHOLD = 3.days

  def initialize(relation: Listing.all, recency_threshold: RECENCY_THRESHOLD)
    @relation = relation
    @recency_threshold = recency_threshold
  end

  def call
    @relation.joins(:store).where(
      <<~SQL.squish, @recency_threshold.ago, @recency_threshold.ago
        (COALESCE(stores.catalog_coverage, 'unknown') = 'partial'
         AND listings.last_seen_at > ?)
        OR
        (COALESCE(stores.catalog_coverage, 'unknown') != 'partial'
         AND (
           (stores.last_synced_at IS NOT NULL
            AND listings.last_seen_at >= stores.last_synced_at)
           OR
           (stores.last_synced_at IS NULL
            AND listings.last_seen_at > ?)
         ))
      SQL
    )
  end
end
```

**Patterns to follow:**
- `StoreSync::CoverageClassifier` for simple policy object pattern
- No existing query object to follow — this establishes the pattern

**Test scenarios:**
- Happy path: returns available listings for partial-coverage store
- Happy path: returns available listings for near-complete store with recent sync
- Happy path: returns available listings for never-synced store with recent activity
- Edge case: empty result when no listings match
- Edge case: all listings excluded when recency threshold passed
- Integration: query produces same results as current `Listing.available` scope (characterization test on real DB data or fixtures)

**Verification:**
- Query spec passes
- Existing caller specs pass (crate strategies, curation services)
- Listing.available still works (via delegation)

---

### U5. Fix Law of Demeter Violations

**Goal:** Fix `DailySelection#listings` (3-dot chain to `store.listings.where`) and `StorefrontTheme#sort_key` (4 attribute accesses on listing).

**Requirements:** R5 (Law of Demeter)

**Dependencies:** None

**Files:**
- Modify: `app/models/daily_selection.rb`
- Modify: `app/models/storefront_theme.rb`
- Modify: `app/models/store.rb` (add delegation method)
- Create: `spec/models/storefront_theme_spec.rb`
- Modify: `spec/models/daily_selection_spec.rb`

**Approach:**

*DailySelection:*
- Add `listings_for_selection(listing_ids)` to Store that scopes `listings.where(id: listing_ids)`
- DailySelection#listings becomes `store.listings_for_selection(listing_ids)`
- This keeps DailySelection talking only to its immediate neighbor (`store`)

*StorefrontTheme:*
- Add `sort_key` method to Listing (or the ScorableListing duck type) that returns the sort tuple `[-want_count, -have_count, -listed_at_timestamp]`
- StorefrontTheme#sort_key becomes `listing.sort_key`
- The theme never needs to know which attributes Listing uses for sorting

**Patterns to follow:**
- Existing `has_many` delegation patterns in Rails
- The "tell, don't ask" principle: send `listing.sort_key` instead of assembling one from raw attributes

**Test scenarios:**
- DailySelection: `listings` returns scoped listings for the store
- DailySelection: empty listing_ids returns empty collection
- StorefrontTheme: `listings_for(pool)` sorts correctly
- StorefrontTheme: `eligible?` correctly identifies pools with >= FEATURED_MIN_RECORDS matching listings
- StorefrontTheme: handles listings with nil want/have/listed_at gracefully
- Guard-parity audit: verify DailySelection#listings handles all preconditions the original chain handled (e.g., store nil, listing_ids nil)

**Verification:**
- DailySelection spec passes
- StorefrontTheme spec passes
- Callers of both methods are unaffected

---

### U6. Clean Up Remaining Violations

**Goal:** Address lower-severity findings: Store's magic number, Release's nil guards (via WantHaveRatio from U1), and documentation/consistency improvements.

**Requirements:** R1–R7 (residual cleanup)

**Dependencies:** U1 (WantHaveRatio), U3 (Store lifecycle extraction)

**Files:**
- Modify: `app/models/store.rb` (after U3, extract STALE_THRESHOLD constant even if delegation kept)
- Modify: `app/models/release.rb` (use WantHaveRatio if not already done in U1)

**Approach:**
- After U3: `STALE_THRESHOLD = 23.hours` constant in the Store model (or `StoreSync::StatusManager`) — eliminate the magic number
- After U1: Release#want_have_ratio uses `WantHaveRatio.new(want_count, have_count).ratio` — elimates nil guards
- Run `grep` to find any other magic numbers or guard conditions that the refactors didn't catch

**Test scenarios:**
- Release: `want_have_ratio` returns the same values as before (characterization test)
- Store: `stale?` behavior is identical

**Verification:**
- All existing specs pass
- No regression in any caller

---

## System-Wide Impact

- **Interaction graph:** RecordScorer is used by all four `CrateStrategies` — no API changes means no ripple. Store lifecycle methods are called from `FullStoreSyncJob`, `EnrichmentJob`, and `SyncAllStoresJob` — these callers must be updated to use managers instead of direct model methods.
- **Error propagation:** `StoreSync::StatusManager#mark_failed!` captures error formatting (already private logic), no change to error behavior. Query object throws same exceptions as current AR scope.
- **State lifecycle risks:** Extracting lifecycle managers from Store means two places could update the same store record. Mitigation: managers operate on the same store record passed by value, and the `update!` calls are synchronous — no new concurrency risk.
- **API surface parity:** No public API changes. Views, controllers, and Inertia props are unchanged.
- **Integration coverage:** U4's query extraction should be validated against real DB data (or production SQL dump) via characterization test before merging. U2 should verify total scores match pre-refactor via a characterization test.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Scoring behavior changes during extraction | Write a characterization test that compares pre/post scores for a fixed set of listings before starting U2. Run it before and after to confirm parity. |
| Callers of Store lifecycle methods missed | `grep -rn 'mark_sync_\|mark_enrichment_\|\.stale?' app/ spec/` before and after U3 |
| Callers of `Listing.available` missed | `grep -rn '\.available' app/ spec/` before and after U4 |
| Guard conditions lost during Law of Demeter fixes | Apply the guard-parity audit checklist from `docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md` to each extracted path in U5 |
| New `app/queries/` directory not auto-loaded | Verify `app/queries/` is in Rails autoload paths (check `application.rb` or add if needed) |
| `app/values/` directory not auto-loaded | Same as above — verify autoloading before writing files |

---

## Sources & References

- **Origin document:** Sandi Metz POODR review output from this session (inline findings above)
- Related code: `app/services/crate_strategies.rb` (strategy pattern), `app/services/store_sync/` (sub-service extraction)
- Related PRs/issues: None
- External docs: *Practical Object-Oriented Design in Ruby* by Sandi Metz
