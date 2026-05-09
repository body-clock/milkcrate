# Storefront Animation Refactor — Implementation Guide

Compounded from two ideation rounds (2026-05-07 and 2026-05-08).
Start from clean `development` branch. Build in phases; verify after each.

---

## What already exists (partial migration — keep as-is)

These files were created during the first migration pass and should be preserved as the foundation:

- `app/frontend/lib/motion_tokens.ts` — spring configs, duration tokens, magnitudes, reduced-motion overrides
- `app/frontend/components/storefront_motion_config.tsx` — MotionConfig provider + reduced-motion context
- `app/frontend/hooks/use_tactile_hover.ts` — binary hover hook (pointer enter/leave, press tracking)
- `app/frontend/components/tactile_card.tsx` — wrapper component consuming useTactileHover

These already import their tokens correctly. The existing codebase modifications (pile_sheet using transitionDrawer, record_card using transitionFlip, etc.) are correct partial adoptions — keep them.

---

## Phase 1: Cleanup (zero-risk, immediate)

### 1a. Remove dead `wall.tsx`
- `app/frontend/components/wall.tsx` has zero imports anywhere in the codebase
- Contains a WallCard with its own flip that duplicates RecordCard's transitionFlip
- Delete the file entirely

### 1b. Unify press-down scales
- `motion_tokens.ts` defines `SCALE_PRESS = 0.97` — it's not imported by consumers
- `use_tactile_hover.ts` duplicates it as a local `PRESS_SCALE` constant → delete local, import from tokens
- `crate_view.tsx` paginator buttons use `whileTap: { scale: 0.92 }` → change to `SCALE_PRESS`, add `transition={springPress}` (400/28 spring, snappier than tactile 300/26)
- `store_floor.tsx` mobile picks use `whileTap: { scale: 0.97 }` → import `SCALE_PRESS` instead of hardcoding

---

## Phase 2: Foundation (token system — build first, use later)

### 2a. CSS custom properties
Add to `app/assets/tailwind/application.css` at `:root`:
```css
--mc-spring-stiffness: 300;
--mc-spring-damping: 26;
--mc-scale-press: 0.97;
--mc-scale-hover: 1.05;
--mc-tilt-hover: 1.5deg;
--mc-lift-hover: 3px;
--mc-duration-hover: 0.2s;
--mc-duration-press: 0.12s;
```
These make animation values inspectable in DevTools and usable by non-React CSS.

### 2b. Add `springPress` usage
`springPress` (400/28) is defined but never consumed. Wire it into `useTactileHover`'s press-down path so the press response is snappier than the hover response. Currently the hook uses the same `transitionHover` (300/26) for both hover and press — they should feel different.

---

## Phase 3: Core upgrade — continuous cursor proximity

This is the highest-leverage single change. It makes every TactileCard respond to cursor approach rather than binary snap.

### What to change in `use_tactile_hover.ts`:

1. **Add a `proximity` state** (number, 0–1) alongside `isHovered`/`isPressed`
2. **Fill the no-op `onPointerMove`**: read cursor position relative to element center via `getBoundingClientRect()`, compute distance → proximity, update via `setProximity`
3. **Throttle with rAF**: cancel the previous rAF before scheduling the next, so rapid pointer moves don't flood React with state updates
4. **Touch detection**: check `e.pointerType === "mouse"` in `onPointerEnter`. On touch, fall back to binary behavior (proximity = 1 on enter, 0 on leave)
5. **Proximity computation**:
   - Element center: `(rect.left + rect.width/2, rect.top + rect.height/2)`
   - Distance from cursor to center → `Math.hypot(dx, dy)`
   - Max distance: `Math.hypot(width, height) * 0.6` (cards are "aware" of cursor within ~60% of their diagonal)
   - Proximity: `clamp(1 - dist / maxDist, 0, 1)`
6. **Transform interpolation** in `computeTransform(proximity, isPressed)`:
   - `rotate = restingTilt * (1 - proximity)` — straightens as cursor approaches
   - `y = -maxLift * proximity` — lifts as cursor approaches
   - `scale = pressed ? SCALE_PRESS : 1 + (maxScale - 1) * proximity` — scales up as cursor approaches
7. **On leave**: set proximity to 0 (animate back to idle via the consumer's transition)
8. **Reduced motion**: when `prefersReducedMotion` is true, proximity stays binary (1 on enter, 0 on leave)

### No changes needed in `tactile_card.tsx`
The existing `animate={transform}` + `transition={transitionHover}` pattern already handles continuously-updating target values. Framer-motion's spring will smoothly interpolate between proximity changes.

### No changes needed in consumers
`CrateCard` thumbnails already use `TactileCard` with `disableTilt` — they automatically get continuous proximity scaling.

### Verification
After this phase, hovering a crate thumbnail should show the thumbnail scaling up as the cursor approaches the card's center, and settling back as it moves away — not snapping between 1.0 and 1.05 at the boundary.

---

## Phase 4: Wall character preservation

The wall is the user's favorite piece. It must survive the refactor intact.

### What the wall does now (in `store_floor.tsx`):
- Desktop: grid of 10 `motion.div` cards with:
  - Per-card resting tilts via hardcoded array `tilts = [2, -1.5, 1, 3, ...]`
  - Per-card overlap offsets via hardcoded array `overlaps = [-10, -16, ...]`  
  - Per-card staggered damping `damping = 22 + (i % 4) * 2`
  - `whileHover`: straighten (rotate: 0), lift (y: -4), scale (1.06), deeper shadow
  - `transition`: `{ type: "spring", stiffness: 300, damping }` (inline, not from tokens)
- Mobile: infinite horizontal scroll of cards with `whileHover: scale 1.05`, `whileTap: scale 0.97`, `transition: transitionHover`

### What to do:

1. **Port the wall cards to use `TactileCard`** instead of raw `motion.div`. Pass `restingTilt={tilts[i]}` to each TactileCard. TactileCard already handles the hover response (lift, scale, straighten).

2. **Keep the overlap/scatter**: the `x` and `y` offsets and drop-shadow are layout concerns, not tactile concerns. Keep them as inline styles on the wrapper.

3. **Keep the staggered damping**: pass it as a new optional prop to TactileCard (`springDamping?: number`) or add a `dampingVariance` option to `useTactileHover`. The wall's per-card personality is a design choice worth preserving.

4. **Use token values**: replace the hardcoded `scale: 1.06` with `SCALE_HOVER: 1.05` (the token value — the wall's 1.06 is slightly higher; if 1.06 is intentional, update the token instead). Replace inline `stiffness: 300` with the token's `springTactile.stiffness`.

5. **Mobile row**: already uses `transitionHover` — just add `SCALE_PRESS` import (from Phase 1b).

---

## Phase 5: Crate-as-container identity

This closes the biggest visual gap: crates currently have zero tactile identity (plain CSS buttons), while wall covers have rich character.

### What crates do now:
- Outer shell is a plain `<button>` with CSS `hover:border-mc-accent transition-colors`
- Inner thumbnails are `TactileCard` instances with `disableTilt` — each scales independently
- "DIG →" label fades in via CSS `opacity` transition on the button's hover state

### What to change in `crate_card.tsx`:

1. **Make the crate itself tactile**: wrap the outer button in `TactileCard` (or give the button the motion treatment directly). On hover, the entire crate tilts slightly and lifts. Use a `restingTilt` of -0.5° so crates have a subtle floor-leaning character distinct from wall cards.

2. **Header as a lid**: on hover, the header row (crate name + DIG label + count) translates upward 2-3px with `transformOrigin: "top"`. This creates the "lid opening" effect. Use the same `transitionHover` spring so the lid and crate body move in unison.

3. **Thumbnails as a group**: instead of each thumbnail having its own independent hover response, tie the thumbnail animations to the crate's hover state. When the crate is hovered, all thumbnails scale together as a unit. When the cursor moves off, they settle together. This communicates "these records are inside one container."

4. **"DIG →" label**: animate with framer-motion instead of CSS opacity. Use `animate={{ opacity: hovered ? 1 : 0, x: hovered ? 0 : -4 }}` with `transitionHover` so it slides in as the lid lifts — a single coordinated gesture.

5. **Press-down on click**: add `whileTap={{ scale: SCALE_PRESS }}` with `transition={springPress}` to the outer crate button. This gives a satisfying "I'm opening this" beat before navigation fires.

---

## Phase 6: Token enforcement (prevent regression)

This is the gravity well that keeps the system intact.

### 6a. Add `motionPreset` factory
Create a function in `motion_tokens.ts`:
```ts
type MotionKind = "wall-card" | "crate-bin" | "crate-thumbnail" | "drawer" | "press"

function motionPreset(kind: MotionKind) {
  // returns { spring, transition, scale, lift, tilt } for that kind
}
```
Developers call `motionPreset("crate-bin")` instead of hand-picking spring configs. The knowledge of which spring is right for which element lives in one place.

### 6b. Lint rule (simpler than ESLint plugin)
Write `scripts/lint-motion-tokens.ts` that scans `.tsx` files for:
- Inline `stiffness` or `damping` in object literals
- `whileHover` or `whileTap` with raw scale numbers
- `transition` with inline spring configs

Run it in CI. Flag any value not sourced from `@/lib/motion_tokens`. This makes the token file mechanically authoritative, not just documentation.

---

## What NOT to do (from both ideation rejection summaries)

- Do not use `useMotionValue` / `useSpring` for continuous tracking — use React state + rAF. The MotionValue approach caused browser rendering issues.
- Do not make every element a TactileCard (paginator buttons, pile sheet items don't need full tactile vocabulary).
- Do not add ambient breathing/pulsing animations yet — defer to a later phase after the core tactile system is stable.
- Do not add scroll choreography yet — same reason.
- Do not over-abstract with declarative animation intents or physics simulation — keep framer-motion's API as the direct surface.

---

## Order of operations

1. Phase 1 (cleanup) — 10 minutes
2. Phase 2 (foundation) — 15 minutes
3. Phase 3 (cursor proximity) — core change, verify carefully
4. Phase 4 (wall preservation) — must preserve existing look
5. Phase 5 (crate identity) — biggest visual impact
6. Phase 6 (enforcement) — prevents regression

Test after each phase. The existing test suite at `storefront_shell.test.tsx` covers basic rendering of all three sections. Add `storefront_full_render.test.tsx` (already written, available) for comprehensive coverage.
