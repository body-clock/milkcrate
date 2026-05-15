---
date: 2026-05-15
topic: record-riffle-engine
---

# Record Riffle Engine

## Summary

Define a shared riffle interaction contract for crate browsing: pulling down moves forward/deeper into the crate, and pushing up moves backward/front. Drag, buttons, keyboard, reduced-motion behavior, and accessible labels should all use that same language and navigation contract so the interaction is easier to tune and harder to let drift.

---

## Problem Frame

Milkcrate's storefront strategy depends on online browsing feeling like flipping through records in a physical shop. The current crate view already has a front-riffle stack, vertical drag, arrow-key navigation, image preloading, reduced-motion handling, a progress bar, and a gesture hint.

The interaction contract is still scattered. Drag commitment, direction state, thresholds, bounds, hint dismissal, reduced-motion decisions, and button/keyboard navigation all live close to rendering concerns. The current drag behavior also chooses the dominant axis, so horizontal movement can navigate even though the desired mental model is vertical: down means deeper into the crate, up means back toward the front.

That makes the experience harder to teach and harder to tune. A future planner should not have to infer whether "next," "forward," "down," and "deeper" mean the same thing across drag, buttons, keyboard, and accessibility labels.

---

## Actors

- A1. Mobile crate browser: Uses one hand to browse records by dragging the active sleeve through the crate.
- A2. Keyboard or assistive-tech browser: Uses keys, buttons, labels, and progress language instead of relying on touch gestures.
- A3. Frontend implementer: Tunes crate navigation without re-solving direction, threshold, bounds, and reduced-motion behavior in multiple places.

---

## Key Flows

- F1. Mobile user riffles forward
  - **Trigger:** A1 drags the active sleeve downward past the commitment threshold.
  - **Actors:** A1
  - **Steps:** The crate recognizes the gesture as forward/deeper, changes to the next record when available, resets the active sleeve to rest, and keeps the direction language consistent with buttons and progress.
  - **Outcome:** The next record is active, and the user learns that down means going deeper into the crate.
  - **Covered by:** R1, R2, R4, R5

- F2. Mobile user riffles backward or hits an edge
  - **Trigger:** A1 drags upward, or tries to drag beyond the first or last record.
  - **Actors:** A1
  - **Steps:** Upward drag maps to backward/front. If movement would leave the crate bounds, no record change occurs and the sleeve returns without teaching a contradictory direction.
  - **Outcome:** The current record remains valid, and boundaries feel like crate edges rather than broken navigation.
  - **Covered by:** R1, R3, R4

- F3. Alternate controls follow the same contract
  - **Trigger:** A2 uses arrow keys or visible navigation buttons.
  - **Actors:** A2
  - **Steps:** Down/forward controls move deeper, up/back controls move toward the front, disabled states reflect crate bounds, and accessible labels use the same front/deeper language.
  - **Outcome:** Non-drag browsing matches the tactile model instead of becoming a separate "previous/next" system.
  - **Covered by:** R5, R6, R7

---

## Requirements

**Direction contract**
- R1. The crate browsing contract defines two semantic directions: forward/deeper and backward/front.
- R2. A downward committed drag moves forward/deeper by one record when another record exists.
- R3. An upward committed drag moves backward/front by one record when a previous record exists.
- R4. Drag gestures never move outside the crate bounds. At the first or last record, the active record remains unchanged and the interaction communicates that navigation is unavailable.
- R5. Horizontal drag is not an equal teaching model for crate browsing. If horizontal movement remains supported for tolerance, it must not override or confuse the primary down/up contract.

**Shared behavior**
- R6. Drag, navigation buttons, keyboard controls, hint dismissal, direction state, and record-change animation all use the same forward/deeper and backward/front contract.
- R7. Reduced-motion behavior preserves the same direction and bounds semantics while simplifying or removing springy movement.
- R8. Commitment thresholds are defined in a way that can be tuned from one place and tested without rendering the full crate surface.
- R9. The contract supports one-record-at-a-time navigation per committed gesture, so a single drag cannot skip through multiple records.

**Language and accessibility**
- R10. Visible control labels, aria labels, and progress language use consistent front/deeper/down/up wording.
- R11. Compact guidance teaches the unusual rule directly enough that a first-time user can understand down-forward and up-back without trial and error.
- R12. The active record count remains available to assistive technology and updates when the active record changes.

**Regression protection**
- R13. The direction, threshold, bounds, and reduced-motion contract is covered by pure or focused tests that do not depend on visual drag smoothness.
- R14. Responsive behavior keeps guard parity across compact and wide crate branches, including empty states and hidden-tab variants.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R6.** Given a crate with at least two records and the first record active, when the user drags the active sleeve downward past the commitment threshold and releases, then the second record becomes active and the direction state is forward/deeper.
- AE2. **Covers R1, R3, R6.** Given the second record is active, when the user drags upward past the commitment threshold and releases, then the first record becomes active and the direction state is backward/front.
- AE3. **Covers R4.** Given the first record is active, when the user performs a committed upward drag, then the active record does not change and the surface returns to a valid rest state.
- AE4. **Covers R5.** Given a compact user makes a mostly horizontal drag with little vertical movement, when the gesture ends, then the interface does not teach horizontal movement as the primary way to browse deeper into the crate.
- AE5. **Covers R7.** Given reduced motion is enabled, when a user moves forward or backward, then the record changes according to the same direction rules without exaggerated spring or sleeve motion.
- AE6. **Covers R10, R12.** Given a screen reader user reaches the crate controls, when the active record changes, then the available labels and progress state describe movement using the same front/deeper language as the visible controls.

---

## Success Criteria

- A first-time mobile user can infer that pulling down digs deeper and pushing up returns toward the front without contradicting hints or controls.
- A keyboard or assistive-tech user gets the same browsing model as a touch user.
- A planner can describe and test the riffle contract without inventing separate semantics for drag, buttons, keyboard, and reduced motion.
- Future tuning of thresholds or direction behavior happens through one shared contract rather than scattered component logic.

---

## Scope Boundaries

- First-swipe ghost animations, failed-gesture coaching, and mastery-based hint hiding are deferred to the First Swipe Lesson idea.
- Rich sleeve physics, detents, pressure shadows, and commit pulses are deferred to the Soundless Sleeve Physics idea.
- A vertical crate spine or replacement progress rail is deferred to a separate orientation/progress pass.
- Backend crate selection, ranking, payload shape, and `CratePresenter` behavior are unchanged.
- Search, filtering, sorting, and detail-card behavior are unchanged.

---

## Key Decisions

- Engine plus language: The shared contract includes concise visible and accessible language because the direction rule is unusual and must be consistent across input paths.
- Vertical contract first: Down/up is the mental model. Horizontal tolerance can remain only if it does not compete with that model.
- Contract before polish: This brief establishes the foundation for later animation polish without bundling first-use lessons or richer physics into the same scope.
- One record per committed gesture: The crate should feel like riffling through sleeves intentionally, not like momentum scrolling through a list.

---

## Dependencies / Assumptions

- `app/frontend/components/crate_view.tsx` remains the current crate browsing surface being refined.
- The existing animation-token and reduced-motion patterns are available for the implementation to reuse.
- The existing viewport context remains the source of compact versus wide behavior.
- Existing crate windowing behavior remains the basis for bounded nearby-record rendering.

---

## Outstanding Questions

### Resolve Before Planning

(None.)

### Deferred to Planning

- [Affects R5][Technical] Should horizontal drag be removed entirely on compact surfaces, or retained only as a forgiving tolerance when vertical movement is also present?
- [Affects R8][Technical] Should thresholds be absolute pixels, card-relative distance, velocity-assisted, or a combination?
- [Affects R11][Technical] What is the shortest guidance copy that teaches down-forward/up-back without cluttering the compact crate view?
