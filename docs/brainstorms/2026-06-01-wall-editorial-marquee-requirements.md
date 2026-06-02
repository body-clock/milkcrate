---
date: 2026-06-01
topic: wall-editorial-marquee
---

# Wall as Editorial Marquee — Mobile-First Requirements

## Summary

Transform the Wall from a bordered `CrateShelf` card into a borderless, full-width 6-record grid that owns the mobile viewport — an editorial threshold inviting entry into the core crate-browsing loop. Entry is the grid itself (tap any cover), taught through a one-time ghost cue and confirmed by press-down feedback, with no persistent CTA label. Minimal implementation: prop differentiation on `CrateShelf` through the existing `PicksShelf` wrapper.

---

## Problem Frame

The store floor renders three vertically stacked sections — Wall, Featured, Genre — all using the same bordered-card visual primitive. On a phone, a first-time shopper sees a uniform scroll of identical rectangles. The Wall, which the product model names as the store's primary taste signal and the first mode after store orientation, is visually indistinguishable from the crate navigation below it. The cohesion audit scored the Wall's hierarchy and copy at 2/4.

The cost of this sameness is editorial absence. The Wall is supposed to communicate "this is what this store is about" before the shopper enters any crate. Instead, it reads as the first item in a list. A shopper who scrolls past without entering has missed the store's taste signal entirely.

The product strategy's "Digital storefront character" track calls for translating the personality of a physical shop into a digital space. The Wall is the surface that carries that personality. Today it carries none.

---

## Actors

- A1. **Shopper (first-time):** Lands on a store page for the first time on a phone. Has no prior knowledge of Milkcrate's interaction model. Needs to understand where to start and what the store's taste is.
- A2. **Shopper (returning):** Has visited the store before. Knows the Wall changes daily. Wants a quick taste read before entering a crate or scrolling to a specific genre.
- A3. **System (curation pipeline):** Regenerates the Wall's picks daily via `CrateStrategies::Picks`. The Wall renders whatever the pipeline produces — it does not control curation.

---

## Key Flows

- F1. **First-visit Wall orientation**
  - **Trigger:** Shopper lands on a store page with no prior visit flag in `localStorage`.
  - **Actors:** A1, A3
  - **Steps:** The Wall renders as a borderless 6-record grid below the store header. A one-time ghost cue (soft animated attention line or glow) fires across the grid, then dissolves on first tap or after 3 seconds. The shopper sees a visually distinct, open surface that reads differently from the bordered cards below.
  - **Outcome:** The shopper understands the Wall is an interactive entry point, even if they don't tap immediately. The ghost cue does not fire again on subsequent visits.
  - **Covered by:** R2, R3, R7

- F2. **Wall entry — tap a cover**
  - **Trigger:** Shopper taps any record cover in the Wall grid.
  - **Actors:** A1, A2
  - **Steps:** On touch-down, the grid area gives a subtle scale-down feedback (using `springPress`). On release, navigation proceeds into the Wall crate at the tapped record's position. The crate opens in the standard `CrateView` card stack.
  - **Outcome:** The shopper is browsing the Wall crate, starting at the selected record. The store header updates to show crate context.
  - **Covered by:** R1, R4, R8

- F3. **Returning visit — Wall as taste read**
  - **Trigger:** Shopper returns to a store page on a subsequent day.
  - **Actors:** A2, A3
  - **Steps:** The ghost cue does not fire. The Wall renders today's new picks. The crate name and "Today" date are visible above the grid. The shopper scans the 6 covers, forms a taste impression, then either taps to enter or scrolls down to Featured/Genre.
  - **Outcome:** The shopper gets a quick taste read from the Wall without friction. The daily rotation is legible via the date marker.
  - **Covered by:** R5, R6

---

## Requirements

**Grid treatment**
- R1. The Wall renders as a borderless, full-width grid with no card container (`border-0`, `rounded-none`, transparent background). It is the only unbordered surface on the store floor.
- R2. The grid displays 6 record covers (2 columns × 3 rows) on compact viewports (≤767px).
- R3. Covers are rendered at 1.5× the standard `RecordTile` thumbnail size used in Featured/Genre crate cards.

**Entry and affordance**
- R4. Tapping any record cover in the grid enters the Wall crate at that record's position in the card stack.
- R5. On touch-down (press start) anywhere on the grid area, a subtle scale-down feedback is applied. On release, the feedback releases and navigation proceeds. The feedback uses the existing `springPress` animation token.
- R6. On a shopper's first visit to any store page (tracked via `localStorage` flag), a one-time ghost cue fires on the Wall — a soft radial or edge glow in the warm accent color that breathes once across the grid area (~2 second duration), then dissolves. Also dissolves on first tap. The cue never fires again for that browser. The pattern reuses the existing `GhostFingerCue` lifecycle mechanism from `CrateView` (one-shot, dissolve-on-interaction) with a glow shape instead of a swipe arrow.

**Header**
- R7. The Wall's header consists of the crate name (e.g., "Milkcrate Picks") and today's date (e.g., "Jun 1") displayed above the grid. No section description paragraph. No persistent CTA label ("DIG →" or "Enter →").

**Responsive adaptation**
- R8. At comfy (768–1023px) and wide (≥1024px) viewports, the grid expands to 3 columns × 2 rows, and hover enrichment (deeper lift via `springTactile`, subtle sample cue) is applied to the grid area. The ghost cue and tap-down feedback still function at compact but tap-down is not the primary affordance on pointer-based devices.

**Accessibility**
- R9. The Wall section retains its existing `role="region"` and `aria-label` describing its purpose. Each cover in the grid is a focusable, keyboard-accessible element with an `aria-label` indicating the record title and the action ("Open [crate name] at [record title]").

**Integration**
- R10. The Wall is implemented through the existing `PicksShelf` wrapper in `StoreFloor`, which passes differentiated props (`borderless`, `previewCount`, tap handler) to `CrateShelf`. No dedicated `WallMarquee` component is introduced at this stage.
- R11. No changes to `CrateCard` — the Wall does not use it. Featured and Genre sections are unchanged.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R4.** On a phone (375px wide), a first-time shopper sees the store header, then a borderless 2×3 grid of 6 record covers filling most of the viewport. Tapping the third cover enters the Wall crate at the third record. Featured crates are partially visible below.
- AE2. **Covers R5, R6.** On first visit, a soft glow traces across the Wall grid and dissolves after 3 seconds. The shopper taps a cover: on touch-down, the grid area scales down slightly; on release, the crate opens. On the next visit, the glow does not fire, but tap-down feedback still works.
- AE3. **Covers R3, R8.** At 1024px wide, the Wall grid shows 3 columns × 2 rows with larger covers. Hovering the grid area triggers a subtle lift. Tap-down feedback still functions but is not the primary affordance.
- AE4. **Covers R7, R9.** A screen reader encounters the Wall region and announces: "Wall — Today's picks, the store's taste at a glance. Milkcrate Picks, June 1." Each cover is announced as "Open Milkcrate Picks at [record title]."

---

## Success Criteria

- A first-time compact shopper can identify the Wall as visually distinct from the card-based sections below it without reading any section label.
- A first-time compact shopper discovers that the Wall is an interactive entry point within 3 seconds of the ghost cue firing, or through tap-down feedback on first touch.
- The Wall's borderless grid treatment reads as an editorial surface — the shopper perceives the store's curation intent before perceiving inventory.
- The implementation stays within the existing `CrateShelf`/`PicksShelf` primitive system — no parallel visual system is introduced.
- The ghost cue is implemented such that it never interferes with navigation (dissolves before or on interaction, never blocks).
- All existing Wall behavior (crate entry, record navigation, `aria-label`, viewport adaptation) continues to function.

---

## Scope Boundaries

- No dedicated `WallMarquee` component — deferred until the borderless grid concept is validated in production.
- No single hero record with editorial copy — the 6-record grid IS the taste statement.
- No horizontal scroll, carousel, or swipe interaction — the grid is static, tap-to-enter.
- No "Fresh Today" animated temporal reveal — the date is shown as static text.
- No changes to Featured or Genre sections — this work is Wall-only.
- No changes to the crate entry transition or `CrateView` behavior.
- No backend, curation pipeline, or data model changes.
- No persistent CTA label — the grid communicates interactivity through the ghost cue and tap feedback.

---

## Key Decisions

- **Grid-as-entry:** The Wall grid is the entry point — tapping any cover enters the crate. No separate CTA button. Rationale: preserves editorial purity; the covers themselves are the invitation.
- **No persistent label:** Interactivity is taught through the one-time ghost cue and tap-down feedback, not a permanently visible text label. Rationale: a persistent label competes with the visual moment; the ghost cue + contrast with card-based sections below is sufficient teaching.
- **2×3 on compact:** 2 columns × 3 rows produces a taller, more commanding presence on a vertical phone screen than 3×2. Rationale: fills the viewport more effectively and creates a stronger editorial threshold before the Featured section appears.
- **Minimal implementation:** Prop differentiation on `CrateShelf` through `PicksShelf`. No new component. Rationale: validates the concept with the fewest lines changed before committing to architectural extraction.

---

## Dependencies / Assumptions

- The `GhostFingerCue` pattern from `CrateView` (`app/frontend/components/crate_view/ghost_finger_cue.tsx` or similar) is extractable or reusable for the Wall. If it is tightly coupled to the crate view, a lightweight equivalent will be built for the store floor.
- `localStorage` is available and acceptable for the first-visit flag. An alternative (session cookie, server-side flag) can be evaluated at planning if `localStorage` introduces concerns.
- The curation pipeline continues to produce 6+ records for the Wall. If a store has fewer than 6 picks, the grid renders with whatever is available (no minimum enforcement in this change).
- The `CrateShelf` component can accept a `borderless` prop and a tap-down handler without introducing breaking changes to its existing interactive/static contract.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R5][Technical] How does the tap-down scale feedback interact with `CrateShelf`'s existing interactive mode, which already handles press states via `useTactileHover`? The integration point needs careful design to avoid conflicting gesture handlers.
- [Affects R7][Technical] Does the crate name come from `CuratedCrate#name` (already available in props) or should it use a fixed "Milkcrate Picks" label? The current code uses `crate.name`.
- [Affects R8][Technical] At what breakpoint does the grid switch from 2×3 to 3×2? The current viewport tiers (compact ≤767px, comfy 768–1023px, wide ≥1024px) provide natural thresholds, but the exact breakpoint for the grid layout change is a planning detail.
- [Affects R6][Needs research] Is the `GhostFingerCue` component in `CrateView` sufficiently decoupled to reuse on the store floor, or does a new cue component need to be built? The planner should read the existing implementation and assess.
