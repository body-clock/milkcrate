---
title: "feat: Curation-axis switch to styles for narrow-catalog stores"
type: feat
status: active
date: 2026-06-07
origin: docs/brainstorms/2026-06-07-curation-axis-styles-requirements.md
---

# feat: Curation-axis switch to styles for narrow-catalog stores

## Summary

Add a curation-axis detection step to `StorefrontCuration` that switches from top-level genres to styles when a store has fewer than 3 top-level genres with ≥5% catalog depth. The axis decision threads as a parameter to `CrateStrategies::Wall`, `CrateStrategies::Genre`, and `CrateStrategies::HiddenGems` — each switches its field-level key (filter or cap) from `primary_genre` to `styles.first` when the axis is `:styles`. `genre_counts` switches its source from a `primary_genre` tally to a `styles` tally. Thematic and NewArrivals strategies are axis-agnostic and need no changes. Zero frontend changes.

---

## Problem Frame

The Wall's genre diversity cap (`[count/3, 2].max` → 4 per genre) and the Genre Crates tab both assume the store has multiple top-level genres. Single-genre stores get a sparse wall and 1-2 genre crates. The `styles` column already exists with sub-genre data (e.g., "Punk", "Hardcore", "Pop Punk") and is GIN-indexed. `StorefrontTheme` already has both `genre` and `style` matchers. The curation axis decision is the missing piece.

---

## Requirements

- **R1.** Curation axis computed once per curation cycle from eligible listings, before Wall or Genre strategies run. *(origin R1)*
- **R2.** A top-level genre has "meaningful depth" when its record count is ≥ 5% of total eligible listings. Only deep genres count toward the diversity threshold. *(origin R2)*
- **R3.** ≥ 3 deep genres → axis `:genres`. < 3 deep genres → axis `:styles`. *(origin R3)*
- **R4.** `genre_counts` switches source: `primary_genre` tally for `:genres` axis, `styles` tally for `:styles` axis. *(origin R4)*
- **R5.** Wall diversity cap keys on `primary_genre` for `:genres` axis, `listing.styles.first` for `:styles` axis. `WallPolicy` formula unchanged. *(origin R5)*
- **R6.** `CrateStrategies::Genre` filters by `primary_genre == @genre` for `:genres`, `styles.include?(@genre)` for `:styles`. *(origin R6)*
- **R7.** Genre crate names drawn from `genre_counts` keys. No frontend changes. *(origin R7)*
- **R8.** `HiddenGems` genre cap keys on the active axis field. *(origin R8)*

**Origin flows:** F1 (Curation axis detection and propagation)
**Origin acceptance examples:** AE1 (2 deep genres → styles), AE2 (4 deep genres → genres), AE3 (Wall cap uses styles.first), AE4 (multi-style listing appears in multiple crates), AE5 (empty-styles listings excluded from tally)

---

## Scope Boundaries

- The `WallPolicy#genre_cap` formula (`[count/3, 2].max`) is unchanged
- Thematic strategy is axis-agnostic — continues discovering both genre and style themes regardless of axis
- Dynamic wall sizing, sparse-wall UX, frontend `TIER_DENSITY` changes out of scope
- Artist-level caps, genre adjacency clustering, nil-genre exemption, progressive relaxation out of scope
- Experiment pipeline (`SeedGenerator`) remains genre-axis-only until `section_points` scoring is ported from the layered-architecture-refactor branch

---

## Context & Research

### Relevant Code and Patterns

- **`app/services/storefront_curation.rb`** — orchestrator; `genre_counts` at line 136, `build_genre_crates` at line 86
- **`app/services/crate_strategies/wall.rb`** — `apply_genre_cap` at line 46 keys on `listing.primary_genre`
- **`app/services/crate_strategies/genre.rb`** — `select` at line 18 filters by `l.primary_genre == @genre`
- **`app/services/crate_strategies/hidden_gems.rb`** — `under_genre_cap?` at line 43 keys on `listing.primary_genre`
- **`app/models/storefront_theme.rb`** — already has `.style()` matcher using `Array(listing.styles).include?(name)`
- **`app/models/listing.rb`** — `primary_genre = genres.first` at line 21; `styles` is `string[]` with GIN index
- **`app/services/wall_policy.rb`** — `genre_cap(count)` formula, does not need changes
- **`app/models/record_scorer.rb`** — accepts `genre_counts:` but no strategy reads it on `development` branch

### Institutional Learnings

- **`docs/solutions/architecture-patterns/crate-strategies-pattern-2026-05-07.md`** — canonical strategy architecture: "strategies SELECT; RecordScorer RANKS." Every strategy follows `initialize(params) → select(pool, excluded_ids:)` interface. Scoring changes cascade automatically.
- **`docs/solutions/workflow-issues/experiment-pipeline-simplification-2026-05-21.md`** — `section` strategy removed as "diversity mechanism masquerading as quality signal." The genre cap MUST remain a cap, not get absorbed into scoring.

### Flow Analysis Findings

- `styles.first` is non-deterministic across Discogs imports (array order not guaranteed) — accepted as tolerable edge case per user decision
- Listings with `genres: nil/[]` and populated `styles` are included on styles axis — a feature that surfaces listings genres-axis curations miss
- Listings with `styles: []` produce `nil` from `styles.first` — tracked in nil bucket, capped same as any other key
- Cache invalidation: axis is purely a function of inventory data, and `inventory_version` in the cache key covers it. No cache key change needed for initial implementation
- Thematic strategy: axis-agnostic (user decision) — continues discovering both genre and style themes
- `RecordScorer` on `development` branch does not consume `genre_counts` — no scoring impact from axis switch on current branch

---

## Key Technical Decisions

- **Axis location:** `StorefrontCuration#curation_axis` computes and owns the decision. Strategies receive `curation_axis:` as a keyword parameter but do not own the logic. One place to change when the algorithm evolves.
- **Depth threshold: 5% of eligible listings.** Scales with store size. A 50-record store needs 3 records for a genre to count; a 500-record store needs 25.
- **Axis threshold: 3 deep genres.** ≥3 → `:genres`; <3 → `:styles`. Three genres is enough to make cross-genre diversity meaningful.
- **Wall key: `styles.first`.** Mirrors `primary_genre = genres.first`. Non-determinism across imports accepted as tolerable.
- **Genre crate filtering: `styles.include?(@genre)`.** A listing with 3 styles appears in 3 crates, mirroring the pre-grouping mental model the brainstorm established.
- **Thematic: no change.** Already discovers both theme types. "Also switch" in R8 means HiddenGems only.
- **No new policy object extracted.** Axis detection is a private method on `StorefrontCuration` — a single conditional. Extracting to a policy object adds indirection without clear value at this scope.

---

## Implementation Units

### U1. Add curation-axis detection to `StorefrontCuration`

**Goal:** Compute the curation axis from eligible listings once per cycle, and switch `genre_counts` source accordingly.

**Requirements:** R1, R2, R3, R4

**Dependencies:** None

**Files:**
- Modify: `app/services/storefront_curation.rb`
- Test: `spec/services/storefront_curation_spec.rb`

**Approach:**
- Add `CURATION_AXIS_THRESHOLD = 3` and `GENRE_DEPTH_RATIO = 0.05` constants
- Add private method `curation_axis` that computes deep genre count and returns `:genres` or `:styles`
- Modify `genre_counts` to switch source: when `:styles`, `eligible_listings.flat_map(&:styles).compact.tally`; otherwise current behavior
- Memoize both `curation_axis` and `genre_counts`
- Thread `curation_axis:` to strategy constructors that need it (Wall, Genre, HiddenGems)

**Patterns to follow:**
- Existing `genre_counts` memoization pattern at line 136
- Keyword-argument threading pattern from `Wall.new(eligible_listings:, genre_counts:)`

**Test scenarios:**
- Happy path: Store with Rock (60%), Jazz (30%), Electronic (10%) → Rock and Jazz pass 5% (only 2 deep genres) → axis is `:styles`
- Happy path: Store with Rock (30%), Jazz (25%), Electronic (20%), Classical (15%) → 4 deep genres → axis is `:genres`
- Happy path: genre_counts on `:styles` axis produces tally from `flat_map(&:styles)`
- Edge case: Store with exactly 3 genres at exactly 5.0% each → axis is `:genres`
- Edge case: Store with 0 eligible listings → axis is `:styles` (0 deep genres, < 3)
- Error path: Listings with nil `genres` and nil `styles` → excluded from both tallies

**Verification:**
- `curation_axis` returns `:styles` for a punk-only store mock, `:genres` for a multi-genre store mock
- `genre_counts` keys are style names when axis is `:styles`, genre names when `:genres`

---

### U2. Switch Wall diversity cap to use axis-aware key

**Goal:** `CrateStrategies::Wall#apply_genre_cap` uses the active axis field for its diversity key.

**Requirements:** R5

**Dependencies:** U1

**Files:**
- Modify: `app/services/crate_strategies/wall.rb`
- Test: `spec/services/crate_strategies/wall_spec.rb`

**Approach:**
- Accept `curation_axis:` keyword argument in `initialize` (default `:genres` for backward compatibility)
- In `apply_genre_cap`, branch: when `:styles`, genre = `listing.styles.first`; otherwise `listing.primary_genre`
- `WallPolicy` and the cap formula itself are unchanged
- `Wall` model (`app/models/wall.rb`) passes `curation_axis:` through from `StorefrontCuration`

**Patterns to follow:**
- Existing `apply_genre_cap` closure at line 46-49
- `WallPolicy` remains a pure value object — only the key selection changes

**Test scenarios:**
- Happy path: On `:genres` axis, wall caps on `primary_genre` (existing behavior preserved)
- Happy path: On `:styles` axis, wall caps on `listing.styles.first` — 2 listings with `styles.first = "Punk"` count toward the same cap bucket
- Edge case: Listing with `styles: []` → `styles.first` returns nil → tracked in nil bucket, same cap applies
- Edge case: Listing with `styles: ["Punk", "Hardcore"]` → only `"Punk"` (first) counts toward cap
- Covers AE3: Wall diversity cap uses `styles.first`

**Verification:**
- Wall with `curation_axis: :styles` produces 12 records from a single-genre store mock (no cap starvation)
- Wall with `curation_axis: :genres` produces identical results to pre-change behavior

---

### U3. Switch Genre strategy filtering to axis-aware field

**Goal:** `CrateStrategies::Genre#select` filters the pool by the correct field based on axis.

**Requirements:** R6, R7

**Dependencies:** U1

**Files:**
- Modify: `app/services/crate_strategies/genre.rb`
- Test: `spec/services/crate_strategies/genre_spec.rb` (new — no dedicated Genre strategy spec currently exists)

**Approach:**
- Accept `curation_axis:` keyword argument in `initialize` (default `:genres`)
- In `select`, branch the filter: when `:styles`, `candidates.select { |l| Array(l.styles).include?(@genre) }`; otherwise `candidates.select { |l| l.primary_genre == @genre }`
- Genre crate ordering in `StorefrontCuration#build_genre_crates` already uses `genre_counts.sort_by { |_, count| -count }` — keys are now style names when axis is `:styles`, so crates are named and ordered by style

**Patterns to follow:**
- Existing `SelectionPipeline` inclusion
- `StorefrontTheme.style(name)` matcher: `Array(listing.styles).include?(name)` — same pattern

**Test scenarios:**
- Happy path: On `:genres` axis, only listings with `primary_genre == "Rock"` appear in Rock crate
- Happy path: On `:styles` axis, listings with `styles` including "Punk" appear in Punk crate
- Happy path: A listing with `styles: ["Punk", "Hardcore"]` appears in BOTH "Punk" and "Hardcore" crates
- Covers AE4: multi-style listing appears in multiple crates
- Edge case: Listing with `styles: []` — `Array([]).include?("Punk")` → false, correctly excluded
- Edge case: Listing with `styles: ["Punk"]` on `:genres` axis — filtered by `primary_genre == "Punk"` which won't match (primary_genre is a top-level genre, not a style name)

**Verification:**
- Punk crate on styles axis contains listings where `styles` includes "Punk"
- Rock crate on genres axis contains listings where `primary_genre == "Rock"` (unchanged)

---

### U4. Switch HiddenGems genre cap to axis-aware key

**Goal:** `HiddenGems#under_genre_cap?` uses the active axis field.

**Requirements:** R8

**Dependencies:** U1

**Files:**
- Modify: `app/services/crate_strategies/hidden_gems.rb`
- Test: `spec/services/crate_strategies/hidden_gems_spec.rb`

**Approach:**
- Accept `curation_axis:` keyword argument in `initialize` (default `:genres`)
- In `under_genre_cap?`, branch: when `:styles`, genre = `listing.styles.first`; otherwise `listing.primary_genre`
- `PER_GENRE_CAP = 3` constant unchanged — naming reflects genre-axis origin, rename if desired but not required

**Patterns to follow:**
- Same field-switch pattern as Wall (U2) — identical branching logic
- Existing `under_genre_cap?` guard at line 43-44

**Test scenarios:**
- Happy path: On `:styles` axis, HiddenGems caps at 3 per style — a 4th "Punk" listing is excluded
- Happy path: On `:genres` axis, behavior unchanged
- Edge case: Listing with `styles: []` → `styles.first` returns nil → tracked in nil bucket

**Verification:**
- HiddenGems on `:styles` axis from a punk store does not exceed 3 records from any one style

---

### U5. Thread `curation_axis` through `StorefrontCuration` to all strategy constructors

**Goal:** Wire the axis decision from `StorefrontCuration` into every strategy that needs it.

**Requirements:** R5, R6, R8

**Dependencies:** U1, U2, U3, U4

**Files:**
- Modify: `app/services/storefront_curation.rb`
- Modify: `app/models/wall.rb`

**Approach:**
- In `StorefrontCuration#crates` and `#storefront_groups`, pass `curation_axis:` to `Wall.new`
- `Wall` model (`app/models/wall.rb`) accepts `curation_axis:` and passes it to `CrateStrategies::Wall.new`
- `build_genre_crates` passes `curation_axis:` to `CrateStrategies::Genre.new`
- `build_hidden_gems_crate` passes `curation_axis:` to `CrateStrategies::HiddenGems.new`
- `build_featured_crates` passes `curation_axis:` through
- NewArrivals and Thematic constructors do NOT receive `curation_axis:` — they are axis-agnostic

**Patterns to follow:**
- Existing keyword-argument threading from `StorefrontCuration` → `Wall` → `CrateStrategies::Wall`
- Default values on strategy constructors (`curation_axis: :genres`) ensure backward compatibility for any direct instantiation in tests or experiments

**Test scenarios:**
- Integration: Full curation cycle on `:styles` axis produces wall with 12 records (no starvation), style-named genre crates, and correctly capped HiddenGems
- Integration: Full curation cycle on `:genres` axis produces identical results to pre-change behavior
- Regression: StorefrontCurationHelpers `curation_with_strategies` continues to work (default `:genres` axis)

**Verification:**
- `StorefrontCuration.new(punk_store).crates` returns genre crates named "Punk", "Hardcore", etc.
- `StorefrontCuration.new(diverse_store).crates` returns genre crates named "Rock", "Jazz", etc. (unchanged)

---

## System-Wide Impact

- **Interaction graph:** `StorefrontCuration` → `Wall` → `CrateStrategies::Wall` (cap key change); `StorefrontCuration` → `CrateStrategies::Genre` (filter change); `StorefrontCuration` → `CrateStrategies::HiddenGems` (cap key change). Thematic and NewArrivals are unaffected.
- **Error propagation:** `curation_axis` defaults to `:genres` everywhere — if threading fails, behavior degrades to current, not to broken
- **Unchanged invariants:** `WallPolicy#genre_cap` formula, `CuratedCrate::CRATE_SIZE`, `CuratedCrate::MIN_RECORDS`, cache key structure, frontend data contract, `RecordScorer` scoring weights

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `styles.first` non-determinism across Discogs imports changes diversity bucket assignment | Accepted as tolerable edge case per user decision. Self-correcting on next curation cycle. |
| Listings with empty `styles` arrays produce `nil` key, potentially dominating wall diversity bucket | Nil bucket is tracked and capped same as any other key. Existing nil-genre behavior in genres axis is the same pattern. |
| `RecordScorer#section_points` on layered-architecture-refactor branch uses `primary_genre` as scoring key — would need axis-awareness when ported | Out of scope for this plan. Addressed in scope boundaries. |

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-06-07-curation-axis-styles-requirements.md](../brainstorms/2026-06-07-curation-axis-styles-requirements.md)
- Related code: `app/services/storefront_curation.rb`, `app/services/crate_strategies/wall.rb`, `app/services/crate_strategies/genre.rb`, `app/services/crate_strategies/hidden_gems.rb`, `app/models/storefront_theme.rb`, `app/services/wall_policy.rb`
- Institutional learnings: `docs/solutions/architecture-patterns/crate-strategies-pattern-2026-05-07.md`
