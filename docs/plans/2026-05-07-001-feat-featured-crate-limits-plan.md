---
title: feat: Cap featured crates to 50 records and include in crate view
type: feat
status: completed
date: 2026-05-07
origin: docs/brainstorms/2026-05-07-featured-crate-limits-requirements.md
---

# feat: Cap featured crates to 50 records and include in crate view

## Summary

Apply the existing `GENRE_CRATE_SIZE` cap to featured crates (New Arrivals, Daily Rotation) so they hold at most 50 records, remove the unused `FEATURED_CRATE_SIZE` constant, and add featured crates to the `crates` array so they appear in the crate view tab bar. The frontend already displays 4 preview images per card — no frontend display changes needed beyond switching `allCrates` to the now-complete `crates` prop.

---

## Problem Frame

Featured crates currently send all their listings over the wire — no cap is applied in `build_featured_crates`, unlike `build_genre_crates` which already uses `.first(GENRE_CRATE_SIZE)`. The unused `FEATURED_CRATE_SIZE = 4` constant sits in the code. Featured crates also only appear in `storefront_sections` (homepage) but not in the `crates` array (crate view tab bar), so clicking into one from the homepage pulls records from the `storefront_sections` version.

The genre crate pattern already demonstrates the desired behavior — cap at 50, preview at 4 via frontend slicing, present in both the homepage grid and the crate view. Extending that pattern to featured crates is a unification, not a new mechanism.

---

## Requirements

- R1. Featured crates cap at 50 records (same `GENRE_CRATE_SIZE` genre crates use). *(Origin R1, R2, R4)*
- R2. Featured crates appear in the `crates` array so the crate view tab bar includes them. *(Origin R2)*
- R3. The unused `FEATURED_CRATE_SIZE` constant is removed. *(Origin R4)*
- R4. Clicking a featured crate from the homepage opens the crate view with up to 50 records. *(Origin R2, AE2)*

**Origin acceptance examples:** AE1 (covers R1, R4), AE2 (covers R2), AE3 (covers R3)

---

## Scope Boundaries

- Changing how featured crate records are selected or ranked — only capping how many are surfaced.
- Modifying genre crate or picks wall behavior.
- Adding frontend component tests.
- Frontend display constants (4 preview images, 2-wide vs 4-wide layout) — these are presentational and unchanged.
- Refactoring `PicksSelector` interface.

---

## Context & Research

### Relevant Code and Patterns

- `app/services/storefront_curation.rb` — `build_genre_crates` already applies `.first(GENRE_CRATE_SIZE)`; `build_featured_crates` does not. Featured crates are only in `storefront_sections`, not in `crates`.
- `app/models/curated_crate.rb` — plain value object (slug, name, listings). No changes needed.
- `app/presenters/crate_presenter.rb` — `crate_props` sets `count: listings.size`. No changes needed since `listings.size` will now reflect the capped 50 (same as genre crates).
- `app/controllers/stores_controller.rb` — renders both `crates` and `storefront_sections`.
- `app/frontend/pages/stores/featured.tsx` — `allCrates` currently merges `storefront_sections`; switching to `crates` gives the correct 50-record versions.

### Institutional Learnings

None.

### External References

None — the codebase has strong local patterns for this change.

---

## Key Technical Decisions

- **One constant for crate size**: `GENRE_CRATE_SIZE = 50` governs all crates. Featured crates reuse it rather than introducing a separate constant.
- **`CuratedCrate` unchanged**: The container stays pure — no `total_record_count` or other new fields. `listings.size` is the count, and it's 50 after capping (same as genre crates).
- **Frontend preview unchanged**: The 4-image preview in `CrateCard` (`records.slice(0, 4)`) works whether the crate has 50 records or more — no change needed.

---

## Implementation Units

### U1. Cap featured crate listings to `GENRE_CRATE_SIZE` and remove `FEATURED_CRATE_SIZE`

**Goal:** Featured crates in both `storefront_sections` and the new `crates` path hold at most 50 records, matching genre crate behavior. Remove the dead constant.

**Requirements:** R1, R3

**Dependencies:** None

**Files:**
- Modify: `app/services/storefront_curation.rb`
- Test: `spec/services/storefront_curation_spec.rb`

**Approach:**
- In `build_featured_crates`, cap `new_arrivals_listings` and the thematic crate's listings to `.first(GENRE_CRATE_SIZE)` — the same pattern `build_genre_crates` already uses.
- Remove the `FEATURED_CRATE_SIZE = 4` constant.
- `FEATURED_MIN_RECORDS = 4` stays — it's a distinct concern (section visibility gate, not a display or record cap).

**Patterns to follow:**
- `build_genre_crates` line: `listings = selector.rank_genre(genre).reject { ... }.first(GENRE_CRATE_SIZE)`

**Test scenarios:**
- Happy path: Given a store with 60 new arrivals, the new-arrivals crate in `storefront_sections` contains at most 50 listings. *(Covers AE1)*
- Happy path: Given a store with a thematic crate of 80 records, the thematic crate in `storefront_sections` contains at most 50 listings.
- Edge case: Given a featured crate has exactly 50 records, all 50 are included.
- Edge case: Given a featured crate has fewer than 50 records, all are included (no padding).

**Verification:**
- `StorefrontCuration#storefront_sections` featured crates each have at most 50 listings.
- `FEATURED_CRATE_SIZE` is removed from the class body.
- Existing tests pass without modification (they use small record counts well below 50).

---

### U2. Add featured crates to the `crates` array

**Goal:** The `crates` method (used by the crate view tab bar) includes featured crates with 50 records, positioned after picks and before genre crates. Genre crates exclude both picks and featured listings.

**Requirements:** R2

**Dependencies:** U1

**Files:**
- Modify: `app/services/storefront_curation.rb`
- Test: `spec/services/storefront_curation_spec.rb`

**Approach:**
- In `crates`, after building picks, build featured crates via a new private helper (or inline) — same logic as `build_featured_crates` but capped by U1.
- Add featured crate listing IDs to `picks_ids` (rename or extend the exclusion set) so genre crates deduplicate correctly.
- Position featured crates between picks and genre crates in the returned array, matching the `storefront_sections` ordering.

**Patterns to follow:**
- `build_genre_crates` exclusion logic: `excluded_ids: picks_ids` → extend to `excluded_ids: picks_and_featured_ids`.

**Test scenarios:**
- Happy path: Given a store with valid featured crates, `crates` includes entries for "New Arrivals" and the thematic crate between picks and genre crates. *(Covers AE2)*
- Happy path: Genre crates in `crates` exclude records already present in featured crates.
- Edge case: Given featured crates are absent (below min threshold), `crates` still includes picks and genre crates without error.

**Verification:**
- `StorefrontCuration#crates` includes featured crates with slugs `new-arrivals` and the thematic crate's slug.
- Genre crates in `crates` do not duplicate records from featured crates.
- Existing `#crates` tests continue to pass.

---

### U3. Switch frontend `allCrates` to use `crates` prop

**Goal:** Clicking a featured crate from the homepage opens the crate view with the 50-record version from `crates`, not the `storefront_sections` version.

**Requirements:** R4

**Dependencies:** U2

**Files:**
- Modify: `app/frontend/pages/stores/featured.tsx`

**Approach:**
- Change the `allCrates` memo to use `crates` directly instead of flattening `storefront_sections`.
- `crates` is now the complete list (picks + featured + genres with 50 records each).
- Keep the fallback for empty `crates` using the existing `storefront_sections` flattening.

**Patterns to follow:**
- The existing `useMemo` structure — swap the primary source, keep the fallback.

**Test scenarios:**
- Test expectation: none — this is a data-source swap with no behavioral change to the component's rendering contract; the existing `storefront_shell.test.tsx` smoke test covers the component mount path.

**Verification:**
- Clicking a featured crate card on the homepage opens the crate view with up to 50 records in the card stack.
- Clicking picks or genre crates works as before (no regression).
- Browser back button returns to the homepage as before.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Featured crates with exactly 4 records (the old min) now show only 4 in the crate view after U1 caps at 50 — no regression since 4 < 50 | Existing tests verify the 4-record threshold; no change to selection logic |
| Frontend `allCrates` change breaks crate view for picks/genre crates | Manual smoke test: click picks and a genre crate after the change |

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-07-featured-crate-limits-requirements.md](../../brainstorms/2026-05-07-featured-crate-limits-requirements.md)
- Related code: `app/services/storefront_curation.rb`, `app/frontend/pages/stores/featured.tsx`
