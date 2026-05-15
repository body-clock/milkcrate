---
title: Fix crate swipe direction and drag animation quality
type: fix
status: active
date: 2026-05-14
---

# Fix crate swipe direction and drag animation quality

## Summary

Fix the spatially-inverted entry/exit animation direction in CrateView's card transitions (next record should enter from below, previous from above), unblock the card's drag constraint so it follows the thumb during swipe, add velocity-aware release gating for a natural feel, fix the missing StorefrontMotionConfig provider on the marketing page, and migrate CrateView's inline transition constants to the centralized motion token system.

---

## Problem Frame

The crate card-stack browser in `CrateView` is Milkcrate's flagship interaction, but it has three active bugs and one accessibility gap:

1. **Spatially inverted animation**: `navigate(1)` (next record) enters from the top (y: -78) and exits toward the bottom (y: 66) — reversed for a vertical crate stack where the next record is underneath the current one
2. **Card doesn't follow the thumb**: `dragConstraints={{ left:0, right:0, top:0, bottom:0 }}` locks the card in place during drag — the user's finger moves while the card stays pinned, making the gesture feel broken
3. **Binary threshold without velocity awareness**: Drag ignores info.velocity.y, so a slow drag to 73px and a fast flick to 73px feel identical — no momentum, no snap-back, no dead-zone feedback
4. **Marketing page ignores reduced-motion preference**: `MarketingLayout` doesn't include `StorefrontMotionConfig`, so the home page's CrateView preview (and any future shared animated component) ignores the user's OS-level reduced-motion setting

A past fix (commit `1db0fe0`) removed the `releaseDelta` animation pipeline that used to animate the card off-screen before navigation — swipes now call `navigate()` directly. This was the right direction but didn't address the root cause of the direction inversion or the locked drag.

---

## Requirements

- R1. `navigate(1)` (next record / swipe DOWN / ↓ button) must animate the new card entering from **below** (y: +78) and the current card exiting toward **above** (y: -66)
- R2. `navigate(-1)` (previous record / swipe UP / ↑ button) must animate the new card entering from **above** (y: -78) and the current card exiting toward **below** (y: +66)
- R3. `RecordDetails` text entry/exit direction must match the card animation direction
- R4. During a drag gesture, the active card must visually track the finger's vertical position with a generous movement range (not locked at origin)
- R5. The card position must spring back to center on release when the drag distance is below threshold
- R6. Drag release must consider both offset distance AND release velocity to decide whether to navigate or snap back
- R7. The MarketingLayout must wrap children with `StorefrontMotionConfig` so the home page respects OS reduced-motion preference
- R8. Card entry/exit transitions must use spring presets from `motion_tokens.ts` instead of inline duration/ease constants
- R9. Existing behavior must be preserved for keyboard arrow navigation and paginator button clicks (only drag behavior and entry/exit animation change)

---

## Scope Boundaries

- No horizontal swipe axis changes (Tinder-style horizontal navigation is a separate feature)
- No tilt-to-browse (device orientation integration is out of scope)
- No two-phase lift-then-browse gesture
- No continuous scrubbing with peel/bend deformation
- No elastic depth compression for hint cards during active card drag
- No trackpad swipe support (separate ideation track — see `docs/ideation/2026-05-14-trackpad-swipe-riffle-ideation.md`)
- Existing `dragMomentum={false}` remains disabled (velocity gate replaces momentum entirely)
- The progress bar (left=front, right=back) is unchanged — fixing it would require a product decision beyond this bug fix
- The paginator button symbols (↑=previous, ↓=next) are unchanged

---

## Context & Research

### Relevant Code and Patterns

- **`app/frontend/components/crate_view.tsx`** — primary target; contains drag gesture (lines ~364-398), AnimatePresence variants (lines ~350-374), inline transitions (lines ~14-16), and handleDragEnd (lines ~287-293)
- **`app/frontend/layouts/marketing_layout.tsx`** — secondary target; missing StorefrontMotionConfig wrapper
- **`app/frontend/layouts/app_layout.tsx`** — reference pattern for StorefrontMotionConfig placement
- **`app/frontend/components/storefront_motion_config.tsx`** — provider to add to MarketingLayout
- **`app/frontend/lib/motion_tokens.ts`** — token system to adopt for card transitions
- **`docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md`** — documents the token system architecture and the four-layer pattern

### Institutional Learnings

- **Token system gap** (learnings doc #1): CrateView uses inline `ease`/`reducedCardEase` transition constants instead of token presets. The lint scanner (`scripts/lint-motion-tokens.ts`) only flags `stiffness`/`damping` and `whileHover`/`whileTap` — it won't catch locally-defined transition constants
- **Guard-condition drift** (learnings doc #5): A past `isCompact` refactor silently dropped the `!hideTabs` guard from the desktop path. The fix is applied but there's still no test for `hideTabs` on wide viewports — a regression risk
- **StorefrontMotionConfig gap** (learnings doc #4): `MarketingLayout` lacks the provider that `AppLayout` has; this affects any animated component shared across surfaces
- **Past swipe fix** (commit `1db0fe0`): Removed the `releaseDelta` animation pipeline that used to animate the card off screen before navigation. Swipes now call `navigate()` directly via AnimatePresence — simpler but made the spatial inversion more noticeable

---

## Key Technical Decisions

- **Y-sign convention**: `navigate(1)` (delta >= 0) → positive Y values for entering (from below), negative Y values for exiting (toward above). This matches the crate stack metaphor where "next record" is physically behind/below the current one
- **Drag constraint range**: `top: -180, bottom: 180` for vertical freedom during drag with spring snap-back. This is generous enough for mobile viewports (cards are ~300-400px) while preventing the card from drifting entirely off-screen
- **Velocity threshold**: 300px/s release velocity combined with 40px minimum offset for navigation commit. Below 40px, always snap back regardless of velocity. Between 40-72px, navigation only triggers if velocity exceeds 300px/s. Above 72px, always navigate
- **Motion token preset**: Use `springFlip` (stiffness 260, damping 24) as the closest existing token for card entry/exit transitions. Add a `transitionCrate` convenience export preset for the riffle character if the springFlip feel doesn't match
- **MarketingLayout provider position**: Add `StorefrontMotionConfig` as the outermost wrapper, outside `ViewportProvider`, matching the `AppLayout` pattern

---

## Implementation Units

### U1. Fix entry/exit spatial direction

**Goal:** Swap the Y-sign convention in AnimatePresence variants and RecordDetails so navigate(1) (next record / DOWN) enters from below and exits upward, and navigate(-1) (previous record / UP) enters from above and exits downward.

**Requirements:** R1, R2, R3

**Dependencies:** None

**Files:**
- Modify: `app/frontend/components/crate_view.tsx`
- Test: `app/frontend/components/crate_view.test.tsx`

**Approach:**
- In the AnimatePresence `variants` block, swap Y values so `d >= 0` uses `initial: { y: 78 }` (enter from below) and `exit: { y: -66 }` (exit upward). `d < 0` uses `initial: { y: -78 }` (enter from above) and `exit: { y: 66 }` (exit downward)
- In `RecordDetails`, swap enterY/exitY constants to match: `direction >= 0` → enterY: 16 (from below), exitY: -16 (upward)
- Apply the same inversion to the reduced-motion variant branches: `d >= 0` reduced initial changes from `y: -42` to `y: 42`, reduced exit from `y: 54` to `y: -54`

**Test scenarios:**
- Happy path: `navigate(1)` results in new card `y` starting at positive value (entering from below)
- Happy path: `navigate(-1)` results in new card `y` starting at negative value (entering from above)
- Happy path: pressing ↓ button calls `navigate(1)` — exit/enter directions match
- Happy path: pressing ↑ button calls `navigate(-1)` — exit/enter directions match
- Reduced motion: with `useReducedMotion()` returning true, reduced variants still invert correctly
- RecordDetails: with `direction >= 0`, text enters from below (positive enterY) and exits upward (negative exitY)

**Verification:**
- Unit tests pass for direction-based variant values
- Visual verification: navigate forward through a crate — each new card appears to rise from below the current card

---

### U2. Add StorefrontMotionConfig to MarketingLayout

**Goal:** Wrap the MarketingLayout component tree with StorefrontMotionConfig so OS reduced-motion preferences are respected on the marketing page (home, apply, etc.).

**Requirements:** R7

**Dependencies:** None

**Files:**
- Modify: `app/frontend/layouts/marketing_layout.tsx`

**Approach:**
- Import `StorefrontMotionConfig` from `@/components/storefront_motion_config`
- Wrap the existing `ViewportProvider > MilkcrateShell` tree with `<StorefrontMotionConfig>` as the outermost provider (matching AppLayout's pattern)
- No other changes needed — the children already have the correct structure

**Patterns to follow:**
- `app/frontend/layouts/app_layout.tsx` lines 109-115 — exact provider placement pattern

**Test scenarios:**
- Happy path: rendering MarketingLayout with StorefrontMotionConfig does not throw
- Edge case: `useReducedMotionContext()` called inside a marketing page returns the correct OS preference

**Verification:**
- TypeScript compilation passes with the new import
- Visual verification with OS-level reduced motion enabled: marketing page CrateView should respect the preference

---

### U3. Unlock drag constraints for finger tracking

**Goal:** Expand `dragConstraints` to allow vertical finger tracking during drag, so the card visually follows the user's thumb and springs back on sub-threshold release.

**Requirements:** R4, R5

**Dependencies:** U1 (optional — independent fixes, but testing direction at the same time is cleaner)

**Files:**
- Modify: `app/frontend/components/crate_view.tsx`
- Test: `app/frontend/components/crate_view.test.tsx`

**Approach:**
- Change `dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}` to `dragConstraints={{ left: 0, right: 0, top: -180, bottom: 180 }}` — vertical freedom only, horizontal still locked
- Add `dragSnapToOrigin={true}` on the inner motion.div so the card springs back to its origin position when released below the navigation threshold
- On over-threshold navigation, reset the inner motion.div's Y position to 0 before the AnimatePresence exit animation plays, to avoid nested transform composition (outer AnimatePresence y × inner drag y) corrupting the exit path. This can be done by setting the drag motion value to 0 in `onDragEnd` before calling `navigate()`
- Remove the manual `--drag-rotate` reset in `onDragEnd` (rotation resets via the motion value)
- Verify the existing `whileDrag={{ scale: 0.985 }}` works correctly with the new constraints and snap-to-origin

**Patterns to follow:**
- Framer Motion's built-in `dragSnapToOrigin` behavior — when `dragConstraints` has a non-zero range, the card naturally springs back to its starting position on release below threshold

**Test scenarios:**
- Happy path: dragging the card 50px downward translates the card's y position by ~50px
- Happy path: releasing the card below threshold (30px drag) springs back to y: 0
- Happy path: with momentum disabled, the card stops immediately on release (no inertial drift)
- Edge case: dragging beyond the constraint limit (200px) clamps to the boundary
- Integration: the card's y-offset at release is available to handleDragEnd for threshold calculation

**Verification:**
- Manual drag test: card visually tracks finger movement in both directions
- Release below threshold: card springs back to origin smoothly

---

### U4. Add velocity-aware release gating

**Goal:** Modify `handleDragEnd` to consider both release offset AND release velocity when deciding whether to navigate, so fast flicks past a small offset commit navigation while slow drags below maximum offset snap back.

**Requirements:** R6

**Dependencies:** U3 (needs the card's y-offset to be meaningful — with locked constraints, offset was always 0)

**Files:**
- Modify: `app/frontend/components/crate_view.tsx`
- Test: `app/frontend/components/crate_view.test.tsx`

**Approach:**
- Widen the `handleDragEnd` type signature to accept framer-motion's full `PanInfo` type (import from `framer-motion`) instead of the current inline type `{ offset: { x: number; y: number } }`
- Destructure both `info.offset` and `info.velocity` from the PanInfo argument
- Implement a three-zone decision function:
  - If the dominant axis absolute offset < 40px: always snap back (return without navigating)
  - If 40px <= offset < DRAG_THRESHOLD (72px): navigate only if release velocity exceeds 300px/s on that axis
  - If offset >= 72px: always navigate
- Keep `dragMomentum={false}` so the card stops immediately on release — the velocity is read from the last frame's velocity data in PanInfo, not from a momentum animation
- The direction of navigation is determined by the sign of `dominantOffset` (same as current logic: positive = navigate(1), negative = navigate(-1))

**Test scenarios:**
- Happy path: fast flick with 50px offset and 400px/s velocity → navigate
- Happy path: slow drag with 80px offset → navigate (exceeds 72px)
- Happy path: slow drag with 50px offset and 50px/s velocity → snap back
- Edge case: fast flick with 30px offset and 500px/s velocity → snap back (below 40px minimum)
- Edge case: dominant axis ambiguous (x and y both ~50px) → no navigation (current behavior preserved)
- Integration: navigating via drag triggers the corrected directional animation from U1

**Verification:**
- Fast flick past 50px navigates to next record
- Slow drag to 50px that stops there does NOT navigate (card snaps back)
- Slow drag past 75px navigates regardless of velocity

---

### U5. Migrate CrateView to motion_tokens.ts presets

**Goal:** Replace CrateView's three locally-defined transition constants (`ease`, `reducedEase`, `reducedCardEase`) with exported presets from `motion_tokens.ts`, and adopt the `useReducedMotionContext()` hook pattern.

**Requirements:** R8

**Dependencies:** U1 (the direction fix changes the same code area — apply after U1 to avoid conflicts)

**Files:**
- Modify: `app/frontend/components/crate_view.tsx`
- Modify: `app/frontend/lib/motion_tokens.ts` (optional — add a `transitionCrate` preset if needed)
- Test: `app/frontend/components/crate_view.test.tsx`
- Test: `app/frontend/lib/motion_tokens.test.ts` (if a new preset is added)

**Approach:**
- Replace `const ease = { duration: 0.2, ease: "easeOut" }` with `springFlip` / `transitionFlip` from `motion_tokens.ts` (stiffness 260, damping 24)
- Replace `const reducedEase = { duration: 0.16, ease: "easeOut" }` with `reducedMotionTransition` from tokens
- Replace `const reducedCardEase = { duration: 0.24, ease: "easeOut" }` with `reducedMotionTransition`
- Optionally: replace `useReducedMotion()` (framer-motion hook) with `useReducedMotionContext()` from `storefront_motion_config.tsx` for consistency with the team's provider pattern
- Add a `transitionCrate` preset to `motion_tokens.ts` if the springFlip feel doesn't match the riffle character, and register it in the `motionPreset` factory

**Test scenarios:**
- Happy path: card entry/exit uses the tokenized spring config (verify via motion_tokens import)
- Happy path: reduced-motion path uses `reducedMotionTransition` (0s duration)
- Edge case: no token change for non-card animations (progress bar, paginator buttons — these already use their own transitions)
- Integration: all transitions still produce correct visual behavior after the swap
- Integration: reduced-motion path on both MarketingLayout (now wrapped) and AppLayout produces identical behavior

**Verification:**
- No inline `const ease`, `const reducedEase`, or `const reducedCardEase` remain in crate_view.tsx
- All card transitions reference `motion_tokens.ts` exports
- TypeScript compilation passes
- Visual verification: card entry/exit feel matches the product's tactile character

---

## System-Wide Impact

- **Interaction graph:** The CrateView is used in two pages — `home.tsx` (marketing preview) and `featured.tsx` (demo store). Both are affected by U1, U3, U4, U5. U2 (MarketingLayout config) only affects the home page
- **Error propagation:** If drag constraint expansion causes the card to escape its container visually, the fallback is reverting to zero constraints (current behavior) — a proven safe state
- **State lifecycle risks:** The `direction` ref (set by `navigate()` and read by AnimatePresence) must remain synchronous with the index state. U4 adds velocity state but only during drag — no long-lived state changes
- **Unchanged invariants:** The keyboard arrow handlers (`ArrowUp`/`ArrowDown` calling `navigate(-1)`/`navigate(1)`) are unchanged. The paginator button labels (↑/↓) are unchanged. The progress bar direction (left/right) is unchanged. The `buildCrateWindow` function returning 5-slot visible windows is unchanged. The hint card CSS transitions are unchanged

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Expanded drag constraints cause layout overflow on small viewports | The container already has `touchAction: "none"` and `overscrollBehavior: "contain"`. The 180px limit is ~half the card height on mobile, leaving enough buffer |
| Velocity gate tuning feels wrong | Threshold values (40px min, 300px/s velocity) are initial targets — tune during testing if the feel doesn't match the product's tactile character |
| MarketingLayout provider double-wrapping | StorefrontMotionConfig renders a MotionConfig provider — adding it to a page that already has it (if shared components are later extracted) creates nested providers. Framer Motion handles this gracefully (innermost wins), no risk |
| U5 token swap changes animation feel compared to U1-tuned values | Use existing tokens (`springFlip`, `transitionDrawer`) that were tuned for similar use cases. Fine-tune the preset in a follow-up if needed |
| Reduced-motion path regression | Test both with and without OS-level reduced motion enabled to verify collapse-to-minimal works correctly |

---

## Sources & References

- **Ideation output:** This plan's 7 survivor ideas were produced by the `ce-ideate` workflow in this conversation
- **Related code:** `app/frontend/components/crate_view.tsx`, `app/frontend/layouts/marketing_layout.tsx`
- **Past fix commit:** `1db0fe0` ("fix: use button animation path for swipes")
- **Learnings doc:** `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md`
- **Learnings doc:** `docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md`
- **Learnings doc:** `docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md`
