---
title: "feat: Make Milkcrate Picks feel more alive and tactile on desktop"
type: feat
status: active
date: 2026-05-18
---

# feat: Make Milkcrate Picks feel more alive and tactile on desktop

## Summary

Enhance the desktop Milkcrate Picks browsing experience with richer cursor-responsive tactile animations — a glowing/lifting picks shelf on the store floor, parallax tilt on the active record card in CrateView, subtle hover animations on record thumbnails, and more organic spring-driven riffle transitions. All changes respect reduced-motion preferences and are scoped to the `wide` and `comfy` viewport tiers.

---

## Problem Frame

Milkcrate's strategy depends on online browsing feeling like a record shop. The picks wall (`CrateShelf`) and record browsing (`CrateView`) already have core interaction patterns, but on desktop they feel flat compared to the tactile richness mobile users get from drag/swipe gestures. The `useTactileHover` hook and `CrateCard` component demonstrate the codebase is invested in tactile feel — yet the picks shelf lacks the border glow and lift that `CrateCard` provides, the active record card doesn't respond to cursor position, and thumbnail tiles are static. Closing these gaps makes desktop browsing feel more alive without changing any functionality.

---

## Requirements

- R1. Picks wall CrateShelf on desktop responds to hover with border glow, gentle lift, and scale — matching the tactile treatment `CrateCard` gives featured/genre crates.
- R2. Active RecordCard in CrateView applies a subtle 3D parallax tilt toward the cursor on desktop viewports, giving the feel of holding a physical record.
- R3. RecordTile thumbnails within the picks shelf apply a gentle scale-up on individual hover, not just when the parent shelf is hovered.
- R4. CrateView card riffle transitions and RecordDetails panel animations use spring-driven motion with slight overshoot for a more organic feel.
- R5. All tactile enhancements are gated to desktop tiers (`wide`, `comfy`) — compact viewport behavior is unchanged.
- R6. All animations respect `prefers-reduced-motion` via existing `useReducedMotionContext` / `reducedMotionTransition`.
- R7. No backend, routing, data model, or functional behavior changes. Pure frontend presentation layer.

---

## Scope Boundaries

- No changes to mobile/compact viewport behavior.
- No changes to the riffle navigation contract, record flip behavior, pile actions, Discogs links, or keyboard navigation.
- No new breakpoint logic beyond existing viewport tiers.
- No broad storefront redesign or layout changes.
- No new external dependencies.

---

## Context & Research

### Relevant Code and Patterns

- `app/frontend/hooks/use_tactile_hover.ts` — cursor-proximity hover hook providing transform (scale, lift, tilt), transition, and pointer handlers.
- `app/frontend/components/tactile_card.tsx` — drop-in wrapper that applies `useTactileHover` to any content.
- `app/frontend/components/crate_card.tsx` — wraps `CrateShelf` with animated borderColor, scale, y, and rotate on hover. Pattern to follow for U1.
- `app/frontend/components/crate_shelf.tsx` — picks wall and genre shelf component. Uses `useTactileHover` internally for header animation. Will be enhanced in U1/U3.
- `app/frontend/components/record_card.tsx` — flip-capable record card used in CrateView. No tactile hover. Target for U2.
- `app/frontend/components/record_tile.tsx` — lightweight record cover thumbnail. Static. Target for U3.
- `app/frontend/components/crate_view.tsx` — riffle/swipe navigation with card stack. Target for U4.
- `app/frontend/components/record_details.tsx` — desktop detail panel beside the active card. Target for U4.
- `app/frontend/lib/motion_tokens.ts` — spring configs, scale constants (SCALE_HOVER, SCALE_PRESS, LIFT_HOVER, TILT_HOVER), and transition presets.
- `app/frontend/components/storefront_motion_config.tsx` — MotionConfig provider and `useReducedMotionContext` hook.

### External References

- Framer Motion spring physics: stiffness/damping values follow existing codebase conventions in `motion_tokens.ts`.

---

## Key Technical Decisions

- **Use existing `useTactileHover` + `TactileCard` where possible** — avoids new hooks for U1 and U3. The existing proximity-based hover system already provides the right primitives (scale, lift, tilt, borderColor).
- **Extend RecordCard with inline parallax for U2** rather than creating a generic `useCursorParallax` hook — keeps scoped to the one consumer that needs it. If a shared pattern emerges later, extraction is easy.
- **Override `transitionCrate` spring for desktop in U4** — use the existing `springTactile` constants (stiffness 300, damping 26) rather than introducing new spring configs, keeping the motion vocabulary consistent.

---

## Open Questions

### Resolved During Planning

- *Should U2 use a new hook or inline logic?* → Inline in RecordCard. The parallax is a single-axis concern computed in one handler. Extraction to a shared hook is premature.
- *Should U3 use `TactileCard` or CSS `:hover`?* → CSS `:hover` with `transition` is simpler and avoids the complexity of pointer-event handlers on 30+ thumbnail elements. `TactileCard` is for proximity-based effects; a simple `hover:scale-[1.04]` class is sufficient for thumbnails.

### Deferred to Implementation

- *Exact spring feel for desktop CrateView transitions* — tune by feel during implementation against real record data, then lock in values.

---

## Implementation Units

### U1. Enhance picks CrateShelf with tactile hover border/lift

**Goal:** Apply the same `CrateCard` hover treatment (border glow, lift, scale) to the picks wall `CrateShelf` on desktop viewports, making it feel responsive as the cursor approaches.

**Requirements:** R1, R5, R6

**Dependencies:** None

**Files:**
- Modify: `app/frontend/components/crate_shelf.tsx`
- Modify: `app/frontend/components/store_floor.tsx`
- Test: `app/frontend/components/storefront_shell.test.tsx`
- Test: `app/frontend/components/crate_shelf.test.tsx`

**Approach:**
- In `StoreFloor`, wrap the picks wall `CrateShelf` in a `motion.div` with the same animated `borderColor`, `scale`, `y`, and `rotate` pattern as `CrateCard`, but only when the viewport is not compact.
- The wrapper uses `useTactileHover()` directly (like `CrateCard` does) to drive the animate props: `borderColor` transitions between `"var(--mc-border)"` and `"var(--mc-accent)"`, while `scale`, `y`, and `rotate` respond to hover/press state.
- Pass the wrapper's hover state through to `CrateShelf`'s existing `isHovered` prop so the inner open-label animation and thumbnail scale-shift chain correctly.
- On compact viewport, render `CrateShelf` directly without the wrapper.

**Patterns to follow:**
- `app/frontend/components/crate_card.tsx` — the exact animate props (`borderColor`, `scale`, `y`, `rotate`) and transition pattern (`isPressed ? springPress : springTactile`)

**Test scenarios:**
- Happy path: picks wall CrateShelf renders within a motion.div with border animation classes on wide viewport
- Happy path: CrateShelf isHovered prop is driven from the wrapper's tactile hover state
- Edge: hover animation is suppressed on compact viewport (no TactileCard wrapper)
- Edge: reduced motion preference suppresses transform animations
- Happy path: existing crate_shelf.test.ts behavior is preserved (interactive mode, non-interactive mode, empty state, keyboard navigation)

**Verification:**
- `crate_shelf.test.tsx` and `storefront_shell.test.tsx` pass
- Manual: hovering the picks shelf on desktop shows border glow, lift, and thumbnail scale-shift

---

### U2. Add cursor-parallax tilt to RecordCard on desktop

**Goal:** The active RecordCard in CrateView tilts subtly toward the cursor position on desktop, giving a 3D tactile feel like holding a physical record cover.

**Requirements:** R2, R5, R6

**Dependencies:** U1 (for pattern familiarity)

**Files:**
- Modify: `app/frontend/components/record_card.tsx`
- Modify: `app/frontend/lib/motion_tokens.ts` (add TILT_DESKTOP constant if needed)
- Test: Create `app/frontend/components/record_card.test.tsx`

**Approach:**
- Add pointer-move tracking to RecordCard on desktop viewports.
- Compute `rotateX` and `rotateY` from cursor position relative to the card center, clamped to ±3–5 degrees.
- Apply the rotation as a CSS `perspective()` + `rotateX()` + `rotateY()` transform on the card's outermost container.
- Use `requestAnimationFrame` throttling (matching `useTactileHover` pattern) to avoid layout thrash.
- Gate to non-compact viewports via a prop (`disableParallax={isCompact}`) passed from CrateView.
- Respect reduced-motion: collapse to identity when `useReducedMotionContext` is true.
- The tilt `3D` transform should layer on top of the existing `rotateY: 180` flip — when flipped, tilt is suppressed (flipped state resets tilt to 0).

**Patterns to follow:**
- `app/frontend/hooks/use_tactile_hover.ts` — rAF throttling pattern for pointer-move handlers
- `app/frontend/components/crate_view.tsx` — drag rotation via `--drag-rotate` CSS var pattern

**Test scenarios:**
- Happy path: RecordCard renders with parallax tilt handler on wide viewport
- Happy path: tilt angle varies with cursor position within the card bounds
- Edge: parallax is suppressed on compact viewport
- Edge: parallax is suppressed when reduced motion is active
- Edge: parallax is suppressed when card is flipped (rotateY = 180)
- Error: null/undefined cursor position doesn't throw
- Happy path: exiting and re-entering the card resets tilt to 0

**Verification:**
- `record_card.test.tsx` tests pass
- Manual: hovering over the active record card on desktop shows subtle 3D tilt following the cursor

---

### U3. Add hover scale animation to RecordTile thumbnails

**Goal:** Record thumbnails in the picks shelf gently scale up on individual hover, making each cover feel responsive rather than static.

**Requirements:** R3, R5, R6

**Dependencies:** None

**Files:**
- Modify: `app/frontend/components/record_tile.tsx`
- Test: `app/frontend/components/record_tile.test.tsx`

**Approach:**
- Add a CSS-only hover scale to RecordTile: `hover:scale-[1.04]` + `transition-transform duration-150 ease-out` classes on the wrapper div.
- The `transition` should be fast enough (150ms) to feel snappy, matching the `springTactile` feel without a Framer Motion dependency for each tile.
- Gate via a new prop `tactileHover?: boolean` (default: false) so RecordTile in other contexts (like CrateView hint cards) doesn't get unwanted hover effects.
- When `tactileHover` is true, add the hover scale classes.
- Respect reduced motion: if `useReducedMotionContext` is true, skip the hover scale.

**Patterns to follow:**
- Existing `overflow-hidden` + `rounded-sm` + `border` class composition on RecordTile wrapper
- CSS transition pattern used elsewhere in the codebase (e.g., `transition-all duration-150`)

**Test scenarios:**
- Happy path: RecordTile with `tactileHover` has hover scale CSS class
- Happy path: RecordTile without `tactileHover` does not have hover scale class
- Edge: reduced motion context suppresses hover scale class
- Happy path: existing RecordTile tests continue to pass (no regression from new prop)

**Verification:**
- `record_tile.test.tsx` tests pass
- Manual: hovering a record thumbnail in the picks shelf shows gentle scale-up

---

### U4. Polish desktop CrateView transitions

**Goal:** Card riffle transitions and RecordDetails panel animations feel organic with spring-driven motion on desktop.

**Requirements:** R4, R5, R6

**Dependencies:** U2 (RecordCard changes area)

**Files:**
- Modify: `app/frontend/components/crate_view.tsx`
- Modify: `app/frontend/components/record_details.tsx`
- Test: `app/frontend/components/crate_view.test.tsx`

**Approach:**
- Tune `transitionCrate` to use a slightly bouncier spring on desktop (`stiffness: 280, damping: 22` instead of current `stiffness: 350, damping: 30`). This gives a subtle overshoot that feels organic on larger viewports. Keep it in a new export `transitionCrateDesktop` in `motion_tokens.ts`.
- Switch the active card's entry/exit to `transitionCrateDesktop` on non-compact viewports.
- Update RecordDetails to use `springTactile` (stiffness 300, damping 26) for its enter/exit Y translation, matching the overall tactile motion vocabulary.
- Gate both changes with `isCompact` — compact keeps the existing faster transitions for responsiveness.
- All changes collapse to `reducedMotionTransition` when the user prefers reduced motion.

**Patterns to follow:**
- Existing `transitionCrate` usage in `crate_view.tsx`
- Existing `RecordDetails` AnimatePresence usage with exit/enter Y translation

**Test scenarios:**
- Happy path: CrateView on wide viewport uses `transitionCrateDesktop` for card entry/exit
- Happy path: RecordDetails on wide viewport uses `springTactile` transition
- Edge: compact viewport still uses original `transitionCrate`
- Edge: reduced motion collapses all transitions to instant
- Happy path: existing CrateView riffle navigation still works correctly

**Verification:**
- `crate_view.test.tsx` tests pass
- Manual: riffle navigation on desktop shows slightly bouncy spring feel; detail panel slides with tactile motion

---

## System-Wide Impact

- **Interaction graph:** U2 modifies RecordCard's pointer event handling. Must not interfere with the existing flip animation (pointer-down tracking, movedSincePointerDown check) or drag rotation in CrateView. The parallax tilt is a separate transform layer appended to the card's outer container, not the inner motion.div.
- **Error propagation:** All animation enhancements are visual only — failures in pointer tracking or transform computation should silently degrade (no throw), matching the `useTactileHover` error-tolerance pattern.
- **State lifecycle risks:** U2's rAF cleanup must happen in useEffect return to avoid stale pointer handlers on unmount.
- **Unchanged invariants:** Record flip behavior, pile add/remove, Discogs link clicks, keyboard navigation, drag-to-riffle, and empty-state rendering are unchanged.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| U2 parallax tilt conflicts with RecordCard flip animation | Tilt is on the outer container's CSS perspective transform; flip is an inner motion.div rotateY. They operate on different layers. Tilt resets to 0 when flipped state is true. |
| U3 CSS hover scale conflicts with CrateShelf's existing inner hover scale | CrateShelf applies `innerHoverScale` to all tiles via a motion.div wrapper when the shelf is hovered. U3's CSS hover is on the tile itself. The CSS hover is a separate effect that should layer cleanly — test both simultaneously to verify. |
| Performance: 30+ RecordTile CSS hover transitions | CSS transitions run on the compositor thread and are GPU-accelerated. No JS overhead. Acceptable at this scale. |
| Performance: U2 rAF on pointer-move | Single rAF handler per RecordCard instance. Only one active card in CrateView. Same pattern as `useTactileHover`. No measurable cost. |

---

## Sources & References

- Related code: `app/frontend/components/crate_card.tsx` — hover pattern to follow for U1
- Related code: `app/frontend/hooks/use_tactile_hover.ts` — rAF throttle pattern for U2
- Related code: `app/frontend/lib/motion_tokens.ts` — spring constants reference
