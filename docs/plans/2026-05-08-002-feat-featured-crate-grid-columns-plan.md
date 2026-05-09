---
title: feat: Add Hidden Gems crate and tighten featured grid to 3 columns
type: feat
status: active
date: 2026-05-08
---

# feat: Add Hidden Gems crate and tighten featured grid to 3 columns

## Summary

Add a third featured crate type — **Hidden Gems** — that surfaces top-scored records from small genres (fewer than 7 records in the store), filling the 3-column desktop grid. The frontend grid change (`md:grid-cols-2` → `md:grid-cols-3`) is already applied. The remaining work is the backend strategy and its integration into the curation pipeline.

## Problem Frame

Featured crates currently produce at most 2 crates (New Arrivals + Thematic), leaving an empty slot in the 3-column desktop grid. The storefront needs a third featured crate type that adds variety and showcases the long tail of a store's inventory — records from genres with too few listings to form their own genre crate.

The existing strategy pattern (`CrateStrategies` module with `select(pool, excluded_ids:)` interface, `RecordScorer` for uniform scoring) makes this a straightforward extension.

## Requirements

- R1. Featured crate cards render 3 per row on desktop (`md` breakpoint and above). **(Done — U1)**
- R2. Mobile layout is unchanged (remains `grid-cols-1`).
- R3. Card internals — thumbnail grid, text sizing, motion — are unaffected.
- R4. A "Hidden Gems" crate surfaces records from genres with fewer than 7 records in the store.
- R5. Hidden Gems scores via `RecordScorer` (same as all other crate types), sorted best-first.
- R6. Hidden Gems appears in both `crates` (crate view tab bar) and `storefront_sections` (homepage).
- R7. Hidden Gems deduplicates against picks, new arrivals, and thematic crate listings.

## Scope Boundaries

- Changing `CrateCard` component internals or variant logic.
- Adjusting genre grid or picks wall layout.
- Changing `RecordScorer` scoring dimensions or the `SMALL_GENRE_THRESHOLD` (+3 boost at 5 records) — the Hidden Gems threshold of 7 is a separate filter, not a scorer change.
- Changing how New Arrivals or Thematic crates work.
- Mobile layout changes.

## Context & Research

### Relevant Code and Patterns

- `app/services/crate_strategies.rb` — strategy module. New `HiddenGems` class follows the `select(pool, excluded_ids:)` interface of `Picks`, `NewArrivals`, and `Thematic`.
- `app/services/storefront_curation.rb` — `build_featured_crates` currently builds new-arrivals and thematic; needs a third step for hidden gems.
- `app/models/record_scorer.rb` — shared scoring engine. Already gives +3 `section` boost to small-genre records, though with a threshold of 5 (separate from the Hidden Gems filter threshold of 7).
- `app/models/curated_crate.rb` — value object. `CRATE_SIZE = 50` caps all crates (unchanged).
- `spec/services/storefront_curation_spec.rb` — existing test suite with helper `curation_with_strategies` that stubs `build_featured_crates`.
- `spec/support/storefront_curation_helpers.rb` — test factory helpers.

### Institutional Learnings

- `docs/solutions/architecture-patterns/crate-strategies-pattern-2026-05-07.md` — documents the strategy pattern and the rule that `CuratedCrate::CRATE_SIZE` is the single cap constant.

## Key Technical Decisions

- **Separate threshold (7) from scorer threshold (5):** The `RecordScorer` gives a +3 boost to genres with < 5 records. Hidden Gems uses a threshold of 7 for filtering — a wider net. These serve different purposes and should not be coupled.
- **Strategy placed last in featured crates:** Order is New Arrivals → Thematic → Hidden Gems. Hidden Gems is the most "discovery" crate and works well as the third slot visually.
- **Hidden gems dedup is optimistic:** The strategy excludes picks + new-arrivals + thematic IDs, but doesn't need to exclude its own records (it only runs once). Same pattern as other featured crates.

## Implementation Units

### U1. Change desktop grid from 2 to 3 columns ✅

**Goal:** Featured crate cards render 3 per row on desktop.

**Requirements:** R1, R2, R3

**Dependencies:** None

**Files:**
- Modify: `app/frontend/components/featured_crates_row.tsx`

**Approach:**
- Swapped `md:grid-cols-2` to `md:grid-cols-3` in the container div's Tailwind classes.

**Status:** Complete. All 14 existing tests pass.

---

### U2. Add HiddenGems strategy class

**Goal:** A new strategy class that selects records from small genres and scores them via `RecordScorer`.

**Requirements:** R4, R5

**Dependencies:** None

**Files:**
- Modify: `app/services/crate_strategies.rb`
- Test: `spec/services/storefront_curation_spec.rb`

**Approach:**
- Add `CrateStrategies::HiddenGems` class with constants `GENRE_THRESHOLD = 7` and `MIN_RECORDS = 4`.
- `select(pool, excluded_ids:)` filters to records whose primary genre has fewer than 7 records in the store (using `genre_counts`), excludes the given IDs, scores via `RecordScorer`, sorts best-first, and returns the result (uncapped — the caller applies `CRATE_SIZE`).
- Constructor takes `genre_counts:` and `today:` (same signature as `NewArrivals`).
- The `@genre_counts` hash comes from `StorefrontCuration#genre_counts`, which is already computed and available for the `hidden_gems_strategy` lazy initializer.

**Patterns to follow:**
- `CrateStrategies::NewArrivals` — same constructor shape (`genre_counts:`, `today:`), same `scored_sorted` pattern.

**Test scenarios:**
- Happy path: Given a store with 4+ records across genres that each have fewer than 7 records, `select` returns them scored best-first.
- Happy path: Given excluded_ids, those records are excluded from the result.
- Edge case: Given fewer than 4 qualifying records, `select` returns an empty array.
- Edge case: Given no small-genre records at all (every genre has 7+ records), `select` returns an empty array.
- Edge case: Given a genre with exactly 6 records (one below the threshold), all 6 are eligible.

**Verification:**
- `CrateStrategies::HiddenGems.new(genre_counts:, today:).select(pool, excluded_ids: [])` returns scored, deduped listings.
- The strategy does not apply `CRATE_SIZE` internally — it returns all qualifying records.

---

### U3. Integrate Hidden Gems into the curation pipeline

**Goal:** Hidden Gems appears as the third featured crate in both `crates` and `storefront_sections`, with correct dedup and capping.

**Requirements:** R6, R7

**Dependencies:** U2

**Files:**
- Modify: `app/services/storefront_curation.rb`
- Test: `spec/services/storefront_curation_spec.rb`

**Approach:**
- Add `hidden_gems_strategy` lazy initializer (same pattern as `picks_strategy`, `new_arrivals_strategy`, `thematic_strategy`).
- Add `build_hidden_gems_crate(excluded_ids:)` private method: selects via the strategy, caps at `CuratedCrate::CRATE_SIZE`, wraps in a `CuratedCrate` with slug `hidden-gems` and name `"Hidden Gems"`, returns nil if not viable.
- Update `build_featured_crates`: after building thematic, compute `hg_excluded` (na_seen ∪ thematic listing IDs), call `build_hidden_gems_crate`, append to result.
- The `crates` method already calls `build_featured_crates` and spreads its result — no changes needed there.
- The `storefront_sections` method already calls `build_featured_crates` and appends to `featured_crates` section — no structural changes needed there either.

**Patterns to follow:**
- `build_thematic_crate` — same shape: strategy call → cap → `CuratedCrate.new` → viability check.

**Test scenarios:**
- Happy path: Given a store with viable hidden gems, `storefront_sections` includes `"hidden-gems"` slug in the featured crates section, positioned after thematic.
- Happy path: Given a store with viable hidden gems, `crates` includes Hidden Gems in the array, positioned after thematic.
- Happy path: Hidden Gems records are excluded from genre crates (dedup cascades correctly).
- Edge case: Given hidden gems is not viable (fewer than 4 records), the featured crates section still shows new arrivals and thematic (only 2 crates).
- Edge case: Given thematic is not viable but hidden gems is, featured crates shows new arrivals + hidden gems (2 crates, no empty slot).
- Edge case: Given only hidden gems is viable (new arrivals and thematic both underfill), the featured crates row shows only hidden gems.
- Integration: Clicking Hidden Gems from the homepage opens the crate view with up to 50 records. (Manual smoke test.)

**Verification:**
- `storefront_sections` featured crates array includes up to 3 entries (new-arrivals, thematic, hidden-gems) when all are viable.
- `crates` includes hidden-gems between thematic and genre crates.
- Genre crate records do not overlap with hidden gems records.
- Existing tests pass without modification (they stub `build_featured_crates`).

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Hidden gems pool may be small in stores with low genre diversity | `MIN_RECORDS = 4` gate + `GENRE_THRESHOLD = 7` keeps the net wide enough for most stores; crate simply omits if underfilled |
| Existing tests stub `build_featured_crates` and won't exercise the new code path | Add dedicated integration tests that exercise the real `build_featured_crates` |

---

## Sources & References

- Related code: `app/services/crate_strategies.rb`, `app/services/storefront_curation.rb`, `app/models/record_scorer.rb`
- Prior plan (PR #124): `docs/plans/2026-05-07-001-feat-featured-crate-limits-plan.md`
- Pattern doc: `docs/solutions/architecture-patterns/crate-strategies-pattern-2026-05-07.md`
