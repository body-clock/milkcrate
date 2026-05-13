---
date: 2026-05-13
topic: crate-view-mobile-space
---

# Crate View Mobile Space

## Summary

Tighten the mobile CrateView without changing its core card-stack interaction: reclaim header space, adapt the stack footprint to viewport height, and reduce the permanent paginator/instruction footprint. This pass keeps the tactile crate metaphor intact and defers heavier detail-tray and crate-switcher redesigns.

---

## Problem Frame

Mobile CrateView is where a buyer slows down from browsing the store floor into flipping through records. It needs to feel like a focused crate-digging surface, but the current layout spends too much phone-height on chrome around the records: a standalone back button, a full horizontal crate tab row, a fixed-height stack region, large paginator buttons, and persistent gesture instruction copy.

The pain is most visible on small screens, where the active record competes with controls that are either larger than their current value warrants or permanently present after the user has learned the gesture. The store description also does not need to persist inside this view; the buyer is already inside a crate, and the task has shifted from store orientation to record browsing.

---

## Actors

- A1. **Mobile crate browser:** Enters a crate from the store floor and wants to move through records comfortably with one thumb.
- A2. **Returning mobile browser:** Already understands the crate gesture and should not keep paying vertical space for instructional copy.
- A3. **Desktop/tablet browser:** Uses the existing larger CrateView layout and should not be affected by this mobile-focused pass.

---

## Key Flows

- F1. **Mobile user enters a crate**
  - **Trigger:** User opens a crate or a record position from the store floor.
  - **Actors:** A1
  - **Steps:** CrateView renders with a compact mobile header, the active crate context is visible, the store-floor description is absent, and the card stack occupies the available viewport without forcing controls unnecessarily far below the fold.
  - **Outcome:** The user can immediately start browsing records with minimal top chrome.
  - **Covered by:** R1, R2, R4, R5

- F2. **Mobile user advances through records**
  - **Trigger:** User swipes/drags the active record or uses visible navigation controls.
  - **Actors:** A1, A2
  - **Steps:** The card-stack gesture remains primary, progress stays visible, and secondary controls remain tappable without dominating the layout.
  - **Outcome:** Record movement remains discoverable and accessible while using less vertical space.
  - **Covered by:** R6, R7, R8

- F3. **User has learned the gesture**
  - **Trigger:** User interacts with the crate navigation successfully.
  - **Actors:** A2
  - **Steps:** The persistent instruction copy gives way to a lighter hint pattern or disappears after interaction.
  - **Outcome:** The interface stops re-explaining itself and returns space to the crate.
  - **Covered by:** R9, R10

---

## Requirements

**Mobile header**

- R1. On compact/mobile viewport, CrateView uses a compact header rather than a standalone large back button followed by separate visual chrome.
- R2. The compact header preserves an easy-to-hit back control with an accessible name and visible press/focus states.
- R3. The compact header communicates the active crate context at a glance, such as crate name and/or record count, without requiring the full horizontal crate list to be visually dominant.
- R4. Store description or other store-floor orientation copy does not persist inside CrateView.
- R5. Desktop and tablet CrateView header behavior remains unchanged unless a responsive rule explicitly targets compact/mobile viewport.

**Adaptive stack**

- R6. On compact/mobile viewport, the card stack sizes itself against available viewport height rather than relying on a fixed large minimum height.
- R7. The active record cover remains the visual center of CrateView; adaptive sizing must not collapse the stack into a list-like or thumbnail-like experience.
- R8. The progress indicator remains visible and associated with the stack, but it should not add unnecessary vertical spacing.

**Controls and instruction cleanup**

- R9. Mobile record navigation keeps the existing swipe/drag gesture as the primary interaction and keeps accessible visible controls as a secondary path.
- R10. Visible navigation controls on compact/mobile viewport use less visual space while preserving reliable touch targets.
- R11. Permanent gesture instruction copy is replaced with a lighter pattern: first-use hint, contextual hint, short-lived cue, or equivalent non-persistent affordance.
- R12. The hint pattern must not leave users without a discoverable way to learn that dragging/swiping changes records and tapping can reveal card details.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3, R4.** Given a 375px-wide mobile viewport, when a user opens CrateView, then the top area shows a compact crate header with a back control and active crate context, and no store description is rendered in the crate view.
- AE2. **Covers R5.** Given a desktop-width viewport, when a user opens CrateView, then the existing desktop/tablet header and two-column CrateView behavior are unchanged.
- AE3. **Covers R6, R7, R8.** Given a short mobile viewport, when CrateView renders, then the active record stack remains prominent and the progress indicator remains visible without a fixed stack minimum pushing controls unnecessarily below the fold.
- AE4. **Covers R9, R10.** Given a mobile user who does not use gestures, when they use visible next/previous controls, then they can still move through records using reliable touch targets.
- AE5. **Covers R11, R12.** Given a new mobile user opens CrateView, when they have not yet interacted with the stack, then a lightweight cue teaches the available gesture. Given they successfully navigate, the cue no longer occupies permanent layout space.

---

## Success Criteria

- A mobile user sees more of the active record experience above the fold than before, with less vertical space spent on persistent chrome.
- Back navigation remains obvious and tappable despite the smaller visual treatment.
- The card-stack metaphor remains intact: browsing still feels like flipping through a crate, not scanning a list.
- Record movement remains accessible to both gesture users and users who rely on visible controls.
- A downstream plan can separate the work into header, stack sizing, and control/hint units without inventing product behavior.

---

## Scope Boundaries

- Bottom record detail tray is out of scope.
- Bottom-sheet crate or genre switcher is out of scope.
- Major StoreFloor navigation changes are out of scope.
- Backend, curation, and data model changes are out of scope.
- Replacing CrateView with a list, carousel, or non-crate browsing model is out of scope.
- Desktop/tablet redesign is out of scope.
- Full visual redesign of RecordCard is out of scope beyond what is needed to preserve stack fit.

---

## Key Decisions

- **Mobile-only pass:** The user specifically wants to address mobile space inefficiency without disturbing broader CrateView behavior.
- **Header and stack before trays/sheets:** The highest-value near-term move is reclaiming space and improving layout efficiency; deeper detail and crate-switching surfaces can be evaluated later.
- **Gesture remains primary, controls remain available:** The tactile stack is core to the product metaphor, but visible controls are still needed for accessibility and discoverability.
- **No persistent store description in CrateView:** Store description belongs to store orientation on the floor, not the focused record-browsing state.

---

## Dependencies / Assumptions

- The existing viewport tiering or equivalent compact/mobile detection is available for mobile-only behavior.
- Existing motion and tactile interaction patterns should be reused where they fit.
- Existing card drag/swipe navigation remains functional and is not replaced in this pass.
- Existing crate tabs can remain in place unless the compact header requires minor accommodation; a full replacement with a sheet is deferred.

---

## Outstanding Questions

### Resolve Before Planning

(None.)

### Deferred to Planning

- [Affects R1, R3][Technical] Determine whether the compact header should absorb the current crate tabs, visually compress them, or simply sit above the existing tab behavior on mobile.
- [Affects R6, R7][Technical] Define the exact viewport-height sizing rule and test it across small phone, large phone, standalone PWA, and browser address-bar states.
- [Affects R10][Design] Choose the final visual treatment for secondary navigation controls while preserving touch target size.
- [Affects R11, R12][Design] Choose the hint pattern: first-use nudge, temporary copy, gesture icon, or another low-space cue.
