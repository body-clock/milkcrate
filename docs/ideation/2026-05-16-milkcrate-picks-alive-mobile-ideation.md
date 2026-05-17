---
date: 2026-05-16
topic: milkcrate-picks-alive-mobile
focus: Milkcrate picks don't feel alive like genre and featured crates. Mobile first, they should stand out instead of just another crate.
mode: repo-grounded
---

# Ideation: Milkcrate Picks Alive Mobile Surface

## Grounding Context

Milkcrate's strategy is to make online record browsing feel like walking into a record store: spatial bins, walls, genre sections, and an algorithmic digger's taste engine. The current README says Milkcrate Picks are 12 genre-diverse, top-scored records across the full inventory, displayed as a wall of cover art.

`StorefrontCuration#storefront_sections` always places a `picks_wall` first, then featured crates, then genre grid. `StoreFloor` renders Picks with `CrateShelf`, `previewCount` 4 on compact and 8 otherwise, today's date as meta, and `openLabel="DIG ->"`. Featured and genre crates use crate-specific surfaces, making Picks visually share the same crate/shelf vocabulary instead of owning a distinct product role.

Past learnings say small Picks-wall flips were removed because the back face was illegible; tapping a pick should navigate into `CrateView` for detail access. They also say `RecordTile` and `CrateShelf` are shared visual primitives, while richer interaction belongs in specialized components.

External grounding reinforced two constraints: mobile users can miss important product imagery and sections when the page overview is weak, and recommendation surfaces feel more alive when the user can see why the system understands taste. Carousel guidance is mixed-to-negative, so a static lead plus explicit supporting previews is safer than an auto-forwarding carousel.

## Topic Axes

- Mobile visual hierarchy
- Liveness/time
- Editorial voice
- Interaction into the crate
- Curation semantics

## Ranked Ideas

### 1. Front Window Picks

**Description:** Replace the compact Picks shelf with a front-window composition: one large lead pick, 3 supporting covers, and a clear "Dig today's picks" entry. This should not look like a crate card or genre tile. It should read as the storefront's display window: the thing the shop put up front today.

**Axis:** Mobile visual hierarchy

**Basis:** `direct:` README describes Picks as "12 genre-diverse, top-scored records across the full inventory" but `StoreFloor` renders them through the same `CrateShelf` primitive used for crate-like visual display. `external:` Baymard notes mobile users can overlook important images and content sections when overview is weak.

**Rationale:** Picks are the algorithm's best answer to "what should I look at first?" A mobile shelf of four equal squares undersells that role; a lead/support composition gives Picks a hierarchy genre crates do not have.

**Downsides:** Needs a specialized Picks component and responsive tests; the lead record choice must avoid bad cover art.

**Confidence:** 90%

**Complexity:** Medium

**Status:** Unexplored

### 2. Today's Pull

**Description:** Present Picks as the day's pull rather than a permanent crate: "Today's Pull" or "Milkcrate Picks / May 16" with a subtle refreshed-today state. The component can show "new pull today" now and later graduate to "3 new since yesterday" if curation history is available.

**Axis:** Liveness/time

**Basis:** `direct:` `StoreFloor` already computes today's date and passes it as Picks meta, while `CrateStrategies::Picks` uses today's date in deterministic sorting noise. `reasoned:` if the set changes daily, the UI should make that temporal behavior legible.

**Rationale:** Featured crates feel alive because New Arrivals and Daily Rotation have obvious time/theme semantics. Picks already have a daily mechanic but the surface only shows a date; naming the mechanic makes it feel intentional.

**Downsides:** "Today's Pull" must still preserve the recognizable Milkcrate Picks brand, likely as secondary label.

**Confidence:** 86%

**Complexity:** Low-Medium

**Status:** Unexplored

### 3. Pick Reason Chips

**Description:** Add one compact reason chip per visible pick: "fresh copy", "deep section", "clean VG+", "wanted more than owned", "older press", or "small section." Start with reasons derivable from existing listing fields, then add presenter-level score reason metadata later.

**Axis:** Curation semantics

**Basis:** `direct:` `RecordScorer` scores condition, vintage, genre-section boosts, want/have desirability, sparse metadata penalties, freshness, surfaced penalties, cover quality, and daily noise. `direct:` current `Listing` props expose genres, styles, condition, year, and price but not score reasons.

**Rationale:** Picks need to show taste, not just covers. Reasons make algorithmic curation feel like a digger made a choice, and they distinguish Picks from genre crates whose reason is simply category membership.

**Downsides:** Requires careful copy and possibly backend presenter work if reasons should match `RecordScorer` exactly.

**Confidence:** 84%

**Complexity:** Medium

**Status:** Unexplored

### 4. Lead Pick Detail Peek

**Description:** Let the lead pick show title, artist, price, and one action affordance directly on the compact Picks surface, while supporting covers remain simple thumbnails. Tapping the lead or supporting covers still opens `CrateView` at the exact record.

**Axis:** Interaction into the crate

**Basis:** `direct:` past learning says the Picks wall should stay cover-first and route detail access to `CrateView` because small-card backs are illegible. `reasoned:` one lead card is large enough to carry limited metadata without reviving the failed small-grid flip.

**Rationale:** Mobile users need a little reason to enter. A lead-card peek creates intrigue without turning the entire Picks wall into tiny product cards.

**Downsides:** Must avoid adding Pile/Discogs actions too early; those could compete with the primary "dig" motion and clutter the first viewport.

**Confidence:** 78%

**Complexity:** Medium

**Status:** Unexplored

### 5. Digger's Note

**Description:** Add a short sentence under the Picks header that describes the set: "A fresh pull across jazz, soul, and a left-field synth record." This can start deterministic from genres/styles/year distribution and later become generated copy.

**Axis:** Editorial voice

**Basis:** `direct:` STRATEGY names natural-language summaries of collections as part of the digger's algorithm track. `reasoned:` Picks are currently selected by score/diversity, but no sentence explains the set as a whole.

**Rationale:** Genre crates explain themselves by title. Featured crates explain themselves by freshness or theme. Picks need a sentence that says why these records belong together today.

**Downsides:** Weak generated text would be worse than no text; initial deterministic copy should be humble and factual.

**Confidence:** 80%

**Complexity:** Low-Medium

**Status:** Unexplored

### 6. Picks Entry Transition

**Description:** When a user taps a visible pick, animate or at least statefully preserve that cover as the starting point in `CrateView`, with the crate header retaining "Today's Pull" context. For reduced motion, use a simple immediate open with the same start index and header context.

**Axis:** Interaction into the crate

**Basis:** `direct:` `CrateShelf` already opens Picks with optional start indexes, and CrateView is the intended detail surface. `reasoned:` making the transition remember the tapped cover reinforces that the storefront surface and crate view are the same physical object.

**Rationale:** The surface feels more alive when entry has continuity. Tapping a cover should feel like pulling that record out of the display, not navigating to a generic crate.

**Downsides:** True shared-element animation adds complexity; a context/header continuity pass may be the practical first version.

**Confidence:** 72%

**Complexity:** Medium-High

**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Auto-advancing live cover riffle | Carousel/auto-forwarding risk on mobile; likely hurts clarity and accessibility. |
| 2 | One-tap shuffle | Undermines the daily curation premise and could make Picks feel random. |
| 3 | Infinite Picks | Scope overrun; turns Picks into browsing/search instead of a front-window surface. |
| 4 | Add Pile/Discogs actions to lead card | Too much transactional chrome for the first mobile browse surface. |
| 5 | Move Picks below Featured | Avoids the problem instead of making Picks worthy of its strategic first position. |
| 6 | Store owner quote slot | Better as future premium customization; not core to making current Picks alive. |
| 7 | Score/confidence meter | Too data-dense and anti-brand; exposes machinery instead of taste. |
| 8 | Dynamic cover-sampled background | Pretty but fragile; high visual risk against the design system's warm palette. |
| 9 | Full taste scatterplot | Interesting but too analytical and likely desktop-biased. |
| 10 | Haptic-only press tuning | Below ambition floor; useful polish but does not make Picks conceptually distinct. |
