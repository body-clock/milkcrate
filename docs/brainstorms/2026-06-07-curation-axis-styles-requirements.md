---
date: 2026-06-07
topic: curation-axis-styles
---

# Curation-Axis Switch: Styles for Narrow-Catalog Stores

## Summary

When a store's catalog lacks diverse top-level genres with meaningful depth, switch the curation axis from top-level genres to styles. The decision lives in `StorefrontCuration` and flows as a parameter to Wall and Genre strategies — Wall diversity caps, Genre crate names, and crate contents all switch to styles, giving narrow-catalog stores the same rich browsing experience as diverse ones.

---

## Problem Frame

The Wall curation enforces genre diversity via a per-genre cap (`[count/3, 2].max` → 4 per genre for 12 slots). For stores with diverse catalogs, this ensures the wall represents multiple genres. For stores with narrow catalogs — a punk-only shop, a single-genre jazz store — the cap limits the wall to 4 records total, leaving it sparse and broken-looking. The diversity policy pulls low-quality filler from irrelevant genres just to meet quotas.

The Genre Crates tab compounds the problem. A diverse store with 8+ top-level genres produces 8+ crates to flip through. A narrow store with 1-2 genres produces 1-2 crates — the browsing experience is diminished not because the store is bad, but because the curation axis is too coarse.

The data to fix this already exists. Listings carry a `styles` array (indexed, GIN) with sub-genre tags like "Punk", "Hardcore", "Pop Punk", "Crust". `StorefrontTheme` already has both `genre` and `style` matchers. The axis decision is the missing piece.

---

## Key Flows

- **F1. Curation axis detection and propagation**
  - **Trigger:** Storefront curation cycle begins
  - **Actors:** Curation system
  - **Steps:**
    1. Compute top-level genre counts from eligible listings via `primary_genre`
    2. Count genres where tally ≥ 5% of total eligible listings ("deep genres")
    3. If deep genre count ≥ 3, set axis to `:genres`. Otherwise, set axis to `:styles`
    4. Compute `genre_counts` from the chosen axis source
    5. Pass `curation_axis` to Wall and Genre strategies for field-level key selection
  - **Outcome:** All downstream curation surfaces use a consistent axis that matches catalog reality
  - **Covered by:** R1, R2, R3, R4

---

## Requirements

**Axis detection**

- **R1.** The curation axis is computed once per curation cycle from eligible listings, before Wall or Genre strategies run.
- **R2.** A top-level genre has "meaningful depth" when its record count is ≥ 5% of total eligible listings. Only deep genres count toward the diversity threshold.
- **R3.** When ≥ 3 top-level genres have meaningful depth, the axis is `:genres` (current behavior). When < 3 do, the axis is `:styles`.

**Genre counts**

- **R4.** When axis is `:genres`, `genre_counts` is a tally of `listing.primary_genre` across eligible listings. When axis is `:styles`, `genre_counts` is a tally of all values in `listing.styles` across eligible listings.

**Wall**

- **R5.** The Wall receives `curation_axis` as a parameter. When axis is `:styles`, the diversity cap keys on `listing.styles.first` instead of `listing.primary_genre`. The `WallPolicy` formula itself does not change.

**Genre crates**

- **R6.** `CrateStrategies::Genre` receives `curation_axis` as a parameter. When axis is `:genres`, it filters the pool by `listing.primary_genre == @genre`. When axis is `:styles`, it filters by `listing.styles.include?(@genre)`.
- **R7.** Genre crate names are drawn from `genre_counts` keys. No frontend changes are needed — the frontend already renders whatever crate names the backend returns.

**Consistency**

- **R8.** Hidden Gems genre cap and Thematic strategy selection also use `curation_axis` for field selection, so all curation surfaces stay consistent with the chosen axis.

---

## Acceptance Examples

- **AE1. Covers R1, R2, R3.** Given a store with Rock (300 records, 60%), Jazz (150 records, 30%), Electronic (10 records, 2% — below 5%), and Classical (8 records, 1.6% — below 5%), only Rock and Jazz count as deep genres. Deep genre count is 2, which is < 3. Axis is `:styles`. Genre crates are named by style ("Punk", "Hardcore", "Bebop", "Cool Jazz", etc.), and the Wall diversity cap keys on styles.

- **AE2. Covers R1, R3.** Given a store with Rock (300 records), Jazz (150), Electronic (80), and Classical (50), all four pass the 5% depth gate. Deep genre count is 4 ≥ 3. Axis is `:genres`. Behavior is identical to current — top-level genre crates, Wall caps on `primary_genre`.

- **AE3. Covers R5.** Given axis is `:styles` and a listing has `genres: ["Rock"], styles: ["Punk", "Oi"]`, the Wall diversity cap uses `listing.styles.first` → "Punk" as the genre key, not "Rock".

- **AE4. Covers R6.** Given axis is `:styles` and `genre_counts` includes `"Hardcore" => 45`, the Genre crate for "Hardcore" receives listings where `listing.styles.include?("Hardcore")`, scored and sorted as normal. A listing with `styles: ["Punk", "Hardcore"]` appears in both the "Punk" and "Hardcore" crates.

- **AE5. Covers R4.** Given axis is `:styles` and eligible listings have styles `["Punk", "Hardcore"]`, `["Punk"]`, `["Hardcore"]`, and `[]`, `genre_counts` is `{"Punk" => 2, "Hardcore" => 2}`. Listings with no styles don't appear in the tally.

---

## Success Criteria

- A single-genre punk store's wall displays a full 12 records (not 4 capped + filler), with natural variety across punk sub-styles
- A single-genre store's Genre Crates tab shows 5+ crates named by style ("Hardcore", "Pop Punk", "Crust") instead of 1 crate named "Rock"
- Multi-genre stores with ≥ 3 deep top-level genres are unaffected — their walls and genre crates are identical to current behavior
- A store that gains a third deep genre through catalog growth transitions smoothly to the `:genres` axis on the next curation cycle

---

## Scope Boundaries

- The `WallPolicy#genre_cap` formula (`[count/3, 2].max`) is unchanged
- Dynamic wall sizing, sparse-wall UX, and `TIER_DENSITY` frontend changes are out of scope
- Artist-level diversity caps, genre adjacency clustering, nil-genre exemption, and progressive cap relaxation are out of scope
- Within-genre diversity dimensions beyond the styles array are out of scope
- Admin dashboard or store management UI changes are out of scope

---

## Key Decisions

- **Axis location:** The axis decision lives in `StorefrontCuration`, not inside individual strategies. Strategies receive the axis as a parameter and branch on it for field selection, but don't own the decision. One place to change when the algorithm evolves.
- **Depth threshold: 5% of total catalog.** Chosen over absolute record counts because it scales with store size. A 50-record store needs only 3 records for a genre to count. A 500-record store needs 25. This prevents tiny-genre noise from triggering "diverse catalog" behavior.
- **Diversity threshold: 3 deep genres.** A store with 1-2 meaningful top-level genres gets styles. A store with 3+ stays on genres. Three genres is enough to fill the genre crates tab naturally and make cross-genre diversity meaningful on the wall.
- **Wall key: `styles.first`.** Mirrors `primary_genre = genres.first`. A listing may belong to multiple style crates (AE4) but contributes to only one Wall diversity bucket.

---

## Dependencies / Assumptions

- The `styles` column is already populated from Discogs metadata and GIN-indexed — no data migration needed
- `StorefrontTheme.style()` already supports style-based thematic crates — the axis switch feeds naturally into themed curation
- The 5% depth gate and threshold of 3 are initial values; the experiment pipeline may tune them

---

## Outstanding Questions

### Deferred to Planning

- [Affects R6][Technical] Should a listing with multiple styles appear in ALL matching style crates (current assumption), or only its primary style? Allowing multi-crate membership increases overlap between crates but surfaces more records.
- [Affects R4][Technical] When axis is `:styles`, should `genre_counts` deduplicate by listing (a listing with 3 styles contributes 1 to each tally but 1 to total), or count raw occurrences? Raw occurrences inflates tallies for listings with many styles.
- [Affects R5][Technical] `styles.first` may be arbitrary if the array order isn't meaningful. Should we use the most frequent style in the store's catalog instead? This would be more stable but requires a store-level frequency lookup during Wall selection.
- [Affects R8][Technical] Verify that the Thematic strategy's use of `pool.map(&:primary_genre)` for genre detection works correctly with styles. The strategy currently uses genres to detect dominant themes — this may need adjustment.
