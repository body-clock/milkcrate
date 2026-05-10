---
date: 2026-05-09
topic: gesture-primitives-library
---

# Unified Gesture Primitives Library

## Summary

Four reusable gesture hooks (`useSwipeable`, `useLongPress`, `useTapOrDrag`, `usePullToAction`) with a shared config file — no provider or wrapper layer. Two immediate applications: swipe-to-dismiss on the PileSheet and long-press-to-add-to-pile on record cards with haptic feedback.

---

## Problem Frame

The codebase has touch gesture patterns scattered across four separate components, each with its own detection logic, threshold values, and pointer-event wiring:

- `useTactileHover` detects touch vs. mouse (`pointerType !== "mouse"`) but only uses it internally to degrade hover proximity — the detection isn't reusable.
- `crate_view.tsx` defines `DRAG_THRESHOLD = 72` and a `handleDragEnd` for swiping between records — but no other component can use swipe detection.
- `record_card.tsx` disambiguates tap from drag with an 8px `movedSincePointerDown` check — but it's embedded in the flip handler.
- `pile_sheet.tsx` renders a visual drag handle (`w-12 h-1.5` pill) that signals "swipe me" — but no drag prop is wired, so the gesture does nothing.

Adding a new touch interaction today means re-implementing pointer-event wiring, threshold tuning, and tap-vs-drag disambiguation from scratch. The product's two core engagement metrics — items added to pile and pile interaction — are directly hurt by this: adding to pile requires a card flip + precision tap on a 14px button, and dismissing the pile requires locating a small × button.

---

## Actors

- A1. **Component author**: Uses a gesture hook to add a touch interaction to a component without writing pointer-event handlers, threshold logic, or touch detection.
- A2. **Mobile record browser**: Long-presses a record card to add it to their pile — one-handed, no flip required.
- A3. **Mobile pile user**: Swipes the PileSheet down to dismiss it instead of locating the × button.

---

## Key Flows

- F1. **User long-presses a record card to add to pile**
  - **Trigger:** User touches and holds a record card for 500ms without moving.
  - **Actors:** A2
  - **Steps:** `useLongPress` detects the 500ms hold → fires haptic feedback via `navigator.vibrate(10)` → calls `addToPile(record)` from `PileContext` → the existing `onClick` (flip) is suppressed for this pointer sequence.
  - **Outcome:** Record is added to the pile. The card does not flip. Haptic confirms the action.
  - **Covered by:** R3, R4, R7, R8

- F2. **User swipes the PileSheet down to dismiss**
  - **Trigger:** User places a finger on the PileSheet drag handle and drags downward past the swipe threshold.
  - **Actors:** A3
  - **Steps:** `useSwipeable` tracks the downward drag → when offset exceeds `SWIPE_THRESHOLD` (72px), fires `onSwipe` → calls the existing `onClose` → PileSheet animates out via its existing `springDrawer` exit animation.
  - **Outcome:** PileSheet closes. The user did not need to locate or tap the × button.
  - **Covered by:** R1, R6

- F3. **Component author adds a swipe interaction to a new element**
  - **Trigger:** Author wants a swipe-left action on a list item.
  - **Actors:** A1
  - **Steps:** Author imports `useSwipeable` → calls `useSwipeable(ref, { direction: 'left', threshold: 72, onSwipe })` → spreads the returned `handlers` on the target element → no manual pointer-event wiring, no threshold tuning.
  - **Outcome:** The element responds to swipe-left gestures. One hook call replaced ~30 lines of pointer-event boilerplate.
  - **Covered by:** R1, R9

---

## Requirements

### Gesture Hooks

- R1. **useSwipeable**: Accepts `{ direction: 'up' | 'down' | 'left' | 'right', threshold: number, onSwipe: () => void }`. Returns `{ handlers: object, isSwiping: boolean, offset: number }`. Detects a unidirectional drag past `threshold` px and fires `onSwipe` once per gesture. `handlers` includes `onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel` — the consumer spreads them on the target element.
- R2. **useTapOrDrag**: Accepts `{ onTap: () => void, onDrag: (info: { dx: number, dy: number }) => void, moveThreshold?: number }`. Returns `{ handlers: object, isDragging: boolean }`. Tracks cumulative pointer movement since `pointerdown`. If total movement < `moveThreshold` (default 10px from config), fires `onTap` on `pointerup`. If movement exceeds threshold, fires `onDrag` and sets `isDragging = true` for the remainder of the gesture.
- R3. **useLongPress**: Accepts `{ duration?: number, onLongPress: () => void, haptic?: boolean }`. Returns `{ handlers: object, isPressed: boolean, isLongPressing: boolean }`. Starts a timer on `pointerdown`. If the pointer is released or moves more than 10px before `duration` (default 500ms from config), the timer is cleared and `onLongPress` does not fire. If the timer completes, fires `onLongPress`. If `haptic` is true (default), fires `navigator.vibrate(10)` on long-press start when available.
- R4. **usePullToAction**: Accepts `{ threshold?: number, onPull: () => void }`. Returns `{ handlers: object, pullProgress: number }`. Tracks a downward drag on a scrollable container that is already at its scroll limit (top). `pullProgress` is 0–1 representing how far past `threshold` (default 100px) the user has pulled. Fires `onPull` when progress reaches 1.0. Designed for pull-to-refresh patterns.

### Shared Config

- R5. A config file exports named constants used by all hooks and available for direct import by components: `SWIPE_THRESHOLD` (72px), `LONG_PRESS_DURATION` (500ms), `TAP_MOVE_THRESHOLD` (10px), `PULL_THRESHOLD` (100px). These are the defaults; each hook accepts per-instance overrides.
- R6. The config file lives alongside `motion_tokens.ts` in the `lib/` directory, following the established pattern of centralized design constants.

### Immediate Application: PileSheet Swipe-to-Dismiss

- R7. The PileSheet's existing visual drag handle (the `w-12 h-1.5` pill) becomes a functional swipe target. `useSwipeable` is applied with `direction: 'down'`, `threshold: SWIPE_THRESHOLD`, and `onSwipe` calling the existing `onClose` prop.
- R8. The swipe gesture only fires from the drag handle area, not from the scrollable pile content. This avoids a conflict between vertical scroll (to browse pile items) and vertical swipe (to dismiss). The drag handle is the dedicated dismiss affordance.
- R9. The existing backdrop-tap-to-close and ×-button-to-close remain supported. Swipe-to-dismiss is additive, not replacement.

### Immediate Application: Long-Press-to-Pile

- R10. Each `RecordCard` rendered in `StoreFloor`'s picks wall section supports a long-press gesture to add the record to the pile. `useLongPress` is applied with `duration: LONG_PRESS_DURATION` and `onLongPress` calling `addToPile(record)` from `PileContext`.
- R11. When a long-press is detected during a pointer sequence, the card's existing `onClick` (flip) is suppressed — the user either long-presses (add to pile) or taps (flip), never both from the same touch.
- R12. Haptic feedback fires on long-press start (`navigator.vibrate(10)`), providing physical confirmation that the hold was registered, before the 500ms timer completes.
- R13. Long-press-to-pile applies to record cards in the mobile picks wall (compact tier). Desktop record cards keep the existing hover + click pattern (TactileCard proximity + flip). The gesture hook accepts the tier or a `disabled` flag so it can be gated per viewport.

### Events

- R14. All hooks use `pointer` events (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`) for unified mouse + touch handling, consistent with `useTactileHover`'s established pattern.
- R15. All hooks call `event.preventDefault()` on `pointerdown` to prevent the browser's default touch behavior (scroll, zoom, text selection) on the target element, matching the existing `touchAction: "none"` convention.

### Testing

- R16. Each hook has unit tests that simulate pointer event sequences using Testing Library's `fireEvent` or `userEvent`. Long-press tests use Vitest's fake timers. Haptic tests mock `navigator.vibrate`.

---

## Acceptance Examples

- AE1. **Covers R1.** Given a `div` with `useSwipeable(ref, { direction: 'down', threshold: 72, onSwipe })` applied, when the user pointerdowns on the div, moves downward 80px, and pointerups, then `onSwipe` is called exactly once. When the same gesture moves only 50px, `onSwipe` is not called.

- AE2. **Covers R3.** Given a `div` with `useLongPress({ duration: 500, onLongPress })` applied, when the user pointerdowns and holds for 500ms without moving, then `onLongPress` is called. When the user pointerdowns and releases after 300ms, `onLongPress` is not called. When the user pointerdowns, moves 15px, and holds, `onLongPress` is not called (cancelled by movement).

- AE3. **Covers R7, R8.** Given the PileSheet is open on a compact-tier viewport, when the user drags the drag handle downward past 72px and releases, then the PileSheet closes. When the user scrolls the pile content (below the drag handle), the sheet does not close — vertical scroll of pile items is unaffected.

- AE4. **Covers R10, R11.** Given a record card in the mobile picks wall, when the user long-presses for 500ms, then the record is added to the pile, haptic feedback fires, and the card does NOT flip. When the user taps (pointerdown + pointerup < 500ms, < 10px movement), the card flips as normal.

- AE5. **Covers R13.** Given a record card in the desktop picks wall, when the user hovers and clicks, the existing TactileCard hover + flip behavior is unchanged. Long-press does not fire (disabled on non-compact tiers).

- AE6. **Covers R2.** Given a `div` with `useTapOrDrag({ onTap, onDrag })`, when the user pointerdowns, moves 5px, and pointerups, `onTap` is called and `onDrag` is not. When the user pointerdowns, moves 15px, and pointerups, `onDrag` is called and `onTap` is not.

---

## Success Criteria

- Adding a swipe, long-press, or tap-vs-drag interaction to a new component is a one-liner hook call — no pointer-event wiring, no threshold tuning, no touch detection boilerplate.
- A user on mobile can add a record to their pile by holding the cover image for half a second — no flip, no precision tap required.
- A user on mobile can dismiss the pile by swiping the drag handle down — the affordance that already exists visually now works.
- All four hooks have unit tests exercising correct detection, cancellation, and edge cases (rapid taps, multi-touch, pointer cancel).

---

## Scope Boundaries

- Momentum scroll + snap points on horizontal crate rows — deferred. The `.mc-crate-row` dead CSS and scroll-snap fix are separate work.
- Instruction text removal on CrateView — deferred.
- `GestureProvider` or wrapper components — not included. The hooks + config pattern is the deliverable. If patterns emerge from usage that justify a provider (e.g., global haptic toggle, gesture debug mode), that's a follow-up.
- Refactoring `useTactileHover` to use the new hooks internally — not included. The hook stays as-is. New hooks are independent.
- RecordCard flip gesture zone splitting or listening station detail sheet — covered by Survivor #4.
- Accessibility: focus management, screen reader announcements, gesture alternatives for keyboard users — deferred to planning. The hooks provide the gesture detection; accessibility is a consumer responsibility.
- E2E gesture tests (Playwright/Cypress) — unit tests only. Real-device gesture testing is deferred.

---

## Key Decisions

- **Hooks + config, no provider**: The animation token architecture uses a provider because many components need shared reduced-motion awareness and centralized spring defaults. Gestures don't have an equivalent cross-cutting concern — each instance has its own thresholds and callbacks. A config file gives centralized defaults without the ceremony of a provider.
- **Immediate applications are additive**: Swipe-to-dismiss doesn't remove the × button or backdrop-tap. Long-press-to-pile doesn't remove the flip-to-reveal-pile-button path. Both gestures are additional interaction channels that make the existing actions faster, not mandatory new paths that break existing muscle memory.
- **Long-press suppressed on desktop**: Desktop users have hover + click for precision. Long-press on a mouse (click-and-hold) is a rare and ambiguous gesture. Gating it to compact tier avoids false positives.
- **Swipe-to-dismiss only from the drag handle**: Common bottom-sheet patterns allow swiping from anywhere, but the PileSheet has scrollable content. Swipe-from-content vs. scroll is a hard disambiguation problem. Restricting the swipe to the dedicated drag handle is simpler and matches the existing visual affordance.

---

## Dependencies / Assumptions

- Survivor #1 (ViewportContext) — the `useViewport()` hook is needed to gate long-press-to-pile to compact tier (R13). Without it, the feature can ship with a simpler `useIsDesktop()` check and migrate later.
- `PileContext` (already in use) — long-press-to-pile calls `addToPile` from the existing pile context.
- `navigator.vibrate` — available on Android Chrome and Samsung Internet. On iOS Safari, `vibrate` is not supported — the call silently no-ops. This is acceptable; iOS users get the long-press without haptic feedback.
- Framer Motion (already in use) — the PileSheet swipe-to-dismiss uses the existing `springDrawer` exit animation. The swipe detection itself is raw pointer events, not Framer Motion drag.

---

## Outstanding Questions

### Resolve Before Planning

(None — all scope-shaping decisions are resolved.)

### Deferred to Planning

- [Affects R11][Technical] How is the long-press → flip suppression implemented? Options: a shared ref flag on the card element, a context value set during the pointer sequence, or a callback that `useLongPress` provides (`onLongPressDetected`) that the card's `onClick` checks before flipping.
- [Affects R8][Technical] The PileSheet drag handle area needs to be a distinct element from the scrollable content. The current implementation renders the drag handle as a `<div>` inside the scrollable container. Planning should verify this structure works with `useSwipeable` or restructure the PileSheet to separate the drag handle from the scroll area.
- [Affects R16][Needs research] Testing Library's `fireEvent.pointerDown` + `pointerMove` + `pointerUp` sequence may not trigger Framer Motion's gesture recognition in tests. Planning should determine whether gesture hook tests use raw DOM events or need additional Framer Motion test utilities.
