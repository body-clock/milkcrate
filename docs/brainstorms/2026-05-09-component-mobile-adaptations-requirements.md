---
date: 2026-05-09
topic: component-mobile-adaptations
---

# Component-Level Mobile Adaptations

## Summary

Four targeted changes: replace the StoreFloor picks wall `isDesktop` ternary with CSS Grid `auto-fit / minmax(120px, 1fr)` using TactileCard wrappers on all tiers; improve the RecordCard flip gesture on mobile; audit the apply page for mobile; and add a stacked-card mobile layout to the admin waitlist page.

---

## Problem Frame

The StoreFloor picks wall is the only component with a JS-branched responsive layout. On desktop, it renders a `grid grid-cols-6` with TactileCard wrappers. On mobile, it renders a horizontal scroll row with raw `motion.button` wrappers and `w-[46vw]` cards that have no upper size bound — an iPad Mini at 744px (below the 768px `isDesktop` threshold) renders 342px-square cards. Both paths are wrong at the tablet breakpoint, and maintaining two separate markup trees makes any layout change twice the work.

The RecordCard flip gesture on mobile uses an 8px `movedSincePointerDown` threshold to distinguish a tap (flip) from a drag (swipe between records). On a touchscreen at 2x device pixel ratio, 8px is ~4 CSS millimeters — thumb tremor during a tap routinely exceeds this, causing the flip to fail silently. The back face shows metadata (genres, price, pile/add, Discogs link) but the text is sized for desktop and the pile button is a ~14px touch target.

A CSS Grid auto-fit handles all viewport sizes without any JS branch. A higher touch threshold makes the flip reliable on mobile. Together, these two changes eliminate the only JS-branched responsive component and make the primary mobile detail interaction trustworthy.

---

## Actors

- A1. **Mobile record browser**: Taps a record cover in the picks wall, expects it to flip and reveal details. Currently often gets a dead tap.
- A2. **Tablet user (iPad Mini)**: Currently sees comically large 342px cards in a horizontal scroll because the 744px viewport is below the 768px desktop threshold. After the change, sees a proper 3-4 column grid.

---

## Requirements

### Picks Wall — CSS Grid Auto-Fit

- R1. The `isDesktop` ternary in `store_floor.tsx` (lines 39-71) is removed. The picks wall renders a single markup tree for all viewport tiers.
- R2. The picks wall uses `grid-template-columns: repeat(auto-fit, minmax(120px, 1fr))` implemented via Tailwind classes. This naturally produces: compact (375px) → 2 columns, comfy (768px) → 3-4 columns, wide (1024px+) → 5-6 columns.
- R3. Every card in the picks wall is wrapped in a `TactileCard` component, matching the current desktop behavior. On touch devices, TactileCard degrades to binary hover (no proximity effect) via its existing `pointerType !== "mouse"` check.
- R4. The mobile-only horizontal scroll row (`flex gap-2 overflow-x-auto` with `w-[46vw] h-[46vw]` cards and raw `motion.button` wrappers) is deleted — it is replaced by the auto-fit grid.
- R5. The card slice limit unifies to `slice(0, 12)` for all tiers. The grid handles layout; no need for different counts.
- R6. Gap between cards uses Tailwind `gap-1 sm:gap-2` — 4px on compact, 8px on comfy/wide, giving cards slightly more breathing room on larger screens.

### RecordCard Flip — Mobile Improvement

- R7. The `movedSincePointerDown` threshold in `record_card.tsx` is increased from 8px to 16px when the pointer type is touch (`pointerType !== "mouse"`). Mouse clicks keep the 8px threshold (precision pointer).
- R8. The back face (`RecordCard` back side, revealed on flip) is reviewed for mobile legibility:
  - Text elements use a minimum of `text-xs` (12px) — no `text-[9px]` or `text-[10px]` on the back face.
  - The pile/add button target is a minimum of 44×44px (Apple HIG recommended touch target).
  - The Discogs link is a minimum of 44×44px touch target.
- R9. If the listing data includes a back cover image URL, it is displayed on the back face. If no back cover image is available, the back face renders metadata only (current behavior). No API changes are required — the data exists or it doesn't.
- R10. The flip transition animation (`springFlip` preset from `motion_tokens.ts`) is unchanged.
- R11. These mobile improvements apply only to the compact viewport tier (detected via `pointerType` for R7, via `useViewport` or `useIsDesktop` for R8/R9). Desktop keeps the current flip behavior and relies on the inline details panel for primary detail access.

### Coexistence with Survivor #3

- R12. The improved flip threshold (R7) and the long-press-to-pile gesture (Survivor #3, R10) coexist on the same RecordCard element. The long-press timer (500ms) takes priority: if a long-press is detected, the flip is suppressed for that pointer sequence. The higher move threshold for flip applies to taps that are not long-presses.

---

## Acceptance Examples

- AE1. **Covers R1, R2.** Given a viewport width of 375px (compact tier), when StoreFloor renders the picks wall, then a 2-column grid of cards is displayed with TactileCard wrappers. No horizontal scroll row is present. Given a viewport width of 800px (comfy tier), the same markup renders a 3-4 column grid.

- AE2. **Covers R1, R4.** Searching the `store_floor.tsx` file for `isDesktop` returns zero results. The `useIsDesktop` import is removed (or migrated to `useViewport` as part of Survivor #1).

- AE3. **Covers R7.** Given a touch device, when a user taps a record card with thumb tremor causing 12px of movement during the tap, then the card flips (the 16px threshold was not exceeded). When the same movement occurs with a mouse, the flip may not fire (the 8px threshold applies).

- AE4. **Covers R8.** Given a RecordCard back face on a 375px viewport, when inspecting the pile/add button, then its rendered dimensions are ≥44×44 CSS pixels.

- AE5. **Covers R9.** Given a listing with `back_cover_image_url: "https://..."`, when the card flips, then the back cover image is displayed. Given a listing without a back cover image URL, when the card flips, then metadata-only is displayed (no broken image).

- AE6. **Covers R12.** Given a record card with both improved flip threshold and long-press-to-pile, when the user holds for 500ms, then the record is added to the pile and the card does NOT flip. When the user taps (press + release < 500ms, movement < 16px on touch), then the card flips.

---

## Success Criteria

- The picks wall renders a correct column count at every viewport width from 320px to 2560px — no manual breakpoint tuning, no dead zone at tablet widths.
- A touch-device user can reliably flip a record card with a normal tap — thumb tremor does not cause silent failures.
- The back face is legible and tappable on a 375px phone — all interactive elements meet minimum touch target sizes.
- The apply page renders without horizontal overflow at 375px — no zoom-out required to use the form.
- The admin waitlist page is readable and navigable on a phone — no horizontal scrolling required to see all fields.

---

### Apply Page — Mobile Audit

- R13. The apply page (`pages/apply.tsx`) is audited for mobile at 375px width. The page already uses `max-w-md mx-auto` with stacked form fields and a 44px+ submit button. The audit verifies: the Turnstile widget does not overflow the viewport on narrow screens, all form inputs have adequate touch targets, and the `MarketingLayout` header is visually consistent with `AppLayout` changes from Survivor #2.
- R14. No structural changes are required — the page is already mobile-friendly. Any findings from the audit (e.g., Turnstile iframe clipping at 320px) are treated as bugs and fixed.

### Admin Waitlist Page — Stacked Cards on Mobile

- R15. The admin waitlist page (`app/views/admin/waitlists/index.html.erb`) currently renders a 6-column HTML table with inline styles. On the compact tier (≤767px), each table row becomes a stacked card. On comfy and wide tiers (≥768px), the table renders as-is.
- R16. Each stacked card displays the same fields as the table row, with visible labels: Store name (bold heading), then labeled rows for Email, Discogs username, Inventory size, Notes, and Submitted date. Matching the existing dark theme (#111 background, #ddd text, #333 borders).
- R17. The responsive switch uses a CSS `@media (max-width: 767px)` query: the `<table>` is hidden (`display: none`) on compact; the card list is hidden on comfy/wide. The existing inline `<style>` block in the HTML is extended with these rules.
- R18. The admin page already has `<meta name="viewport" content="width=device-width, initial-scale=1">` — this is preserved.

### Acceptance Examples (Apply + Admin)

- AE7. **Covers R13.** Given a viewport width of 375px, when the apply page renders, then the Turnstile widget fits within the viewport, all form inputs are tappable, and the submit button is ≥44px tall.

- AE8. **Covers R15, R16.** Given a viewport width of 375px, when the admin waitlist page renders with 3 applications in the database, then a stacked list of 3 cards is displayed (no horizontal overflow). Each card shows the store name as a heading and labeled fields for all columns. Given a viewport width of 800px, the HTML table is displayed (no cards).

## Scope Boundaries

- Detail sheet — removed. The flip is the primary mobile detail surface.
- Back cover art data — the implementation displays the image if the URL exists in the listing data. No new API endpoints, no Discogs API changes.
- Featured crates row and genre grid — unchanged. The grid auto-fit only applies to the picks wall.
- CrateView card stack flip behavior — the RecordCard flip improvements apply wherever RecordCard is used, but the card stack navigation (drag to advance) in CrateView is unchanged.
- Using `useTapOrDrag` from Survivor #3 to replace the inline flip logic — planning-level decision. The threshold increase (R7) can be a simple inline change or a migration to the new hook.
- Apply page — audit only. If the audit finds no issues, no code changes are made.
- Admin page — only the waitlist index page is mobilized. Other admin pages (if added later) are out of scope.
- Admin authentication / access control — unchanged.
- MarketingLayout — not refactored in this pass. The audit verifies visual consistency but does not unify MarketingLayout with AppLayout.

---

## Key Decisions

- **Grid auto-fit, not container queries**: CSS Grid `auto-fit` is simpler than container queries and achieves the same outcome for this use case — the picks wall always fills the available width. Container queries would be overkill for a single grid.
- **TactileCard on all tiers**: TactileCard's existing touch fallback means there's no cost to including it on mobile — it renders a plain `motion.div` on touch devices. One markup tree is worth the minor abstraction.
- **Flip improved, not replaced**: The user pushed back on the detail sheet as an abstraction away from the tactile crate-digging metaphor. The flip IS the metaphor — pulling a record out and turning it over. Fixing the gesture preserves the metaphor while solving the reliability problem.
- **16px touch threshold**: Double the current 8px. This is conservative — most thumb tremors during tapping stay within 2-3mm (6-12px at 2x DPR). 16px gives a generous margin without capturing intentional drags.

---

## Dependencies / Assumptions

- Survivor #1 (ViewportContext) — the `useViewport()` hook is used to gate mobile-specific behavior (R8, R9). Without it, `useIsDesktop()` or `pointerType` detection can substitute.
- Survivor #3 (Gesture Primitives) — long-press-to-pile coexists with the improved flip (R12). The interaction between the two gestures is specified here; Survivor #3 owns the long-press implementation.
- `pointerType` detection — already used in `useTactileHover` (`e.pointerType !== "mouse"`). The same pattern applies to the flip threshold.
- Back cover image data — the Inertia page props or listing data may or may not include a back cover URL. This requirement is conditional on data availability; no data work is required.

---

## Outstanding Questions

### Resolve Before Planning

(None — all scope-shaping decisions are resolved.)

### Deferred to Planning

- [Affects R7][Technical] Should the touch threshold (16px) be configurable via `gesture_tokens.ts` from Survivor #3, or hardcoded? If configurable, it belongs in the shared config alongside `SWIPE_THRESHOLD` and `TAP_MOVE_THRESHOLD`.
- [Affects R9][Needs research] Does the current listing data type include a `back_cover_image_url` field? Planning should verify the data shape and determine if the field needs to be added to the Inertia props or if it's already present.
