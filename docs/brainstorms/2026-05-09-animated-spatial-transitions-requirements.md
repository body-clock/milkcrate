---
date: 2026-05-09
topic: animated-spatial-transitions
---

# Animated Spatial Transitions (Enfilade)

## Summary

Wrap the StoreFloor ↔ CrateView page transition in Framer Motion `AnimatePresence` with shared-element `layoutId` zoom transitions. Tapping a crate card expands it into the full CrateView; navigating back scales the CrateView back down to the card. Falls back to a fade when no source card exists.

---

## Problem Frame

The StoreFloor → CrateView transition in `pages/stores/featured.tsx` is a plain ternary: `activeSlug === null ? <StoreFloor /> : <CrateView />`. When a user taps a crate card, the floor unmounts and the crate view mounts — an instant replacement with no animation. Going back is the same instant swap in reverse. This breaks the product's spatial metaphor ("walking into a record store") at the most critical moment — the transition from the store overview into a specific crate.

The codebase already has Framer Motion `AnimatePresence` wired in `pile_sheet.tsx` with `springDrawer` transitions. The animation tokens (`springTactile`, `springDrawer`) are defined and proven. The only missing piece is wrapping the ternary in `AnimatePresence` and adding `layoutId` to the crate card and crate view.

---

## Actors

- A1. **Crate browser**: Taps a crate card on the StoreFloor, sees it expand into the full CrateView — spatially understands they went deeper into the store.
- A2. **Deep-link visitor**: Arrives at a CrateView URL directly — no source card exists, so a simple fade-in is used.

---

## Key Flows

- F1. **User taps a crate card → CrateView zooms in**
  - **Trigger:** User taps a `CrateCard` on the StoreFloor.
  - **Actors:** A1
  - **Steps:** `handleSelectCrate` sets `activeSlug` → `AnimatePresence` detects StoreFloor exiting and CrateView entering → `layoutId` matching the crate slug connects the card and the view → Framer Motion animates the card expanding to fill the screen while StoreFloor fades out.
  - **Outcome:** CrateView is visible. The transition felt like diving into that specific crate.
  - **Covered by:** R1, R2, R4

- F2. **User navigates back from CrateView → zooms out**
  - **Trigger:** User taps back button, taps Browse tab (Survivor #2), or triggers `history.back()`.
  - **Actors:** A1
  - **Steps:** `activeSlug` is set to `null` via `popstate` → `AnimatePresence` detects CrateView exiting and StoreFloor entering → `layoutId` connects in reverse → CrateView scales back down to the original card position while StoreFloor fades in.
  - **Outcome:** User is back on the StoreFloor. The transition felt like stepping back out of the crate.
  - **Covered by:** R1, R2, R5

- F3. **User deep-links to a CrateView URL**
  - **Trigger:** Page loads with `activeSlug` already set (no transition from StoreFloor).
  - **Actors:** A2
  - **Steps:** No source `layoutId` exists → CrateView enters with a simple fade + subtle scale-up (`opacity: 0 → 1, scale: 0.97 → 1`).
  - **Outcome:** CrateView is visible with a subtle entrance. No jarring instant mount.
  - **Covered by:** R6

---

## Requirements

### Transition Setup

- R1. The `activeSlug === null` ternary in `pages/stores/featured.tsx` (lines 64-72) is wrapped in Framer Motion's `<AnimatePresence mode="wait">`. `mode="wait"` ensures the exiting component fully animates out before the entering component animates in.
- R2. A `layoutId` is assigned to the outermost motion container of both `CrateCard` (in `StoreFloor`, `FeaturedCratesRow`, or `GenreGrid`) and `CrateView`. The `layoutId` is `crate-${slug}` — unique per crate, stable across the transition boundary.

### Zoom-In Transition

- R3. **StoreFloor exit**: When `activeSlug` transitions from `null` to a slug, StoreFloor exits with `{ opacity: 0, scale: 0.95 }` over a spring transition matching `springTactile` (stiffness 300, damping 26, ~300ms).
- R4. **CrateView enter**: CrateView inherits the zoom animation from the `layoutId` match with the tapped `CrateCard`. Framer Motion automatically interpolates position and size from the card's layout to the view's full-screen layout. No manual position tracking is required.

### Zoom-Out Transition

- R5. **CrateView exit / StoreFloor enter**: When `activeSlug` transitions from a slug to `null` (back navigation), the animation reverses: CrateView scales down to the card position, StoreFloor fades in from `{ opacity: 0, scale: 1.05 }` (reverse of exit). Framer Motion handles the reversal automatically via `AnimatePresence`.

### Fallback (No Source Element)

- R6. When no source `layoutId` exists — the page loaded directly at a CrateView URL, or navigation occurred from a non-card element — CrateView enters with `{ opacity: 0, scale: 0.97 }` over `springTactile`, and exits with `{ opacity: 0 }`. No zoom, no position tracking.

### Motion Tokens

- R7. The transition uses the existing `springTactile` preset from `motion_tokens.ts`. No new animation presets are defined. The exit/enter duration is ~300ms — fast enough to not feel sluggish, slow enough to register as spatial.

### State Management

- R8. The existing `history.pushState` / `popstate` / `activeSlug` state management in `featured.tsx` is unchanged. `AnimatePresence` is purely additive — it wraps the existing ternary and reads `activeSlug` as the key.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R4.** Given the user is on the StoreFloor and taps a `CrateCard` with slug `"jazz-fusion"`, when `activeSlug` changes to `"jazz-fusion"`, then the card visually expands to fill the screen while the StoreFloor fades out and shrinks slightly. The CrateView is now visible.

- AE2. **Covers R5.** Given the user is in CrateView and triggers back navigation, when `activeSlug` changes to `null`, then the CrateView scales back down to the card position while the StoreFloor fades back in.

- AE3. **Covers R6.** Given the page loads with `activeSlug = "jazz-fusion"` already set (deep link), when CrateView mounts, then it fades in with a subtle scale-up. No zoom from a card position occurs (no source element exists).

- AE4. **Covers R8.** Given the user navigates StoreFloor → CrateView → StoreFloor → CrateView (two round trips), when inspecting browser history, then `history.back()` and `history.forward()` work correctly. `AnimatePresence` re-triggers the animation on each transition.

---

## Success Criteria

- Navigating into a crate feels like diving into that specific bin — the transition has spatial continuity.
- Navigating back out feels like stepping back — the crate shrinks back to its card.
- The transition is smooth (60fps) on a mid-range mobile device (iPhone SE 2022 or equivalent).
- Deep-linked CrateView pages have a polished entrance even without a source card.

---

## Scope Boundaries

- Record card (picks wall) → CrateView transitions — only `CrateCard` elements participate in the shared-element zoom. Individual record cards in the picks wall are not crate cards; they navigate to a specific position within a crate, not a crate-level transition.
- Cross-tier layout animations (phone rotation, browser resize) — covered by Survivor #1's deferred layout animations.
- Non-crate page transitions (e.g., StoreFloor → home page) — out of scope.
- The `layoutId` approach relies on Framer Motion's built-in shared-element animation. If it doesn't produce the desired visual result (e.g., cards in a grid don't animate smoothly to a full-screen view), fall back to a simpler fade + scale without the shared element — but that determination is deferred to planning/implementation.

---

## Key Decisions

- **`layoutId` over manual position tracking**: Framer Motion's `layoutId` handles the position/size interpolation automatically. Manual `getBoundingClientRect` + `animate` from/to would be more code for the same outcome. The tradeoff is that `layoutId` requires both elements to be motion components and the IDs to match — which is already the case (CrateCard uses motion, CrateView uses motion).
- **`mode="wait"`**: Ensures StoreFloor fully exits before CrateView enters. Without it, both components would animate simultaneously, creating visual overlap. "Wait" mode is the standard for page transitions.
- **Fade fallback for deep links**: A zoom from "nowhere" would be disorienting. A simple fade is the correct default when no spatial source exists.

---

## Dependencies / Assumptions

- Framer Motion (already in use) — `AnimatePresence`, `layoutId`, and `motion.div` are already in the dependency tree.
- `motion_tokens.ts` (already exists) — `springTactile` preset is used.
- `CrateCard` is already a `motion` component — if it uses a plain `<div>` in some variants, it needs to be wrapped in `motion.div` for `layoutId` to work. Planning verifies this.
- The crate slug is stable and unique — already the case.

---

## Outstanding Questions

### Resolve Before Planning

(None — all scope-shaping decisions are resolved.)

### Deferred to Planning

- [Affects R2][Technical] Does the `CrateCard` in `GenreGrid`, `FeaturedCratesRow`, and `StoreFloor` already use a `motion` component? If any variant uses a plain `<div>`, it needs a `motion.div` wrapper with the `layoutId` prop.
- [Affects R4][Technical] Does Framer Motion's `layoutId` crossfade work smoothly when the source element is inside a CSS Grid and the target is a full-screen element? Grid layout may cause the source position to be reported differently than expected. Planning validates with a prototype and falls back to fade + scale if the grid context interferes.
