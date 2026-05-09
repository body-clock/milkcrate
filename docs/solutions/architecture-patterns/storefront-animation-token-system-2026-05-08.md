---
title: Centralized Framer Motion design token system with progressive migration
date: 2026-05-08
category: docs/solutions/architecture-patterns/
module: storefront
problem_type: architecture_pattern
component: development_workflow
severity: medium
applies_when:
  - Adding or refactoring frontend animations in the storefront
  - Migrating inline animation values to centralized tokens
  - Setting up CI enforcement for frontend conventions
  - Supporting OS reduced-motion accessibility
  - Introducing a new animated element type
tags: [animation, framer-motion, design-tokens, react, typescript, lint, accessibility, storefront]
---

# Centralized Framer Motion Design Token System

## Context

The storefront had 5+ components with scattered inline Framer Motion values — `stiffness: 300, damping: 22` in wall cards, `stiffness: 260, damping: 24` in record flips, `stiffness: 300, damping: 32` in the pile drawer. No two components shared configurations consistently. Reduced-motion was handled in exactly one component (`crate_view.tsx`). An implementation guide existed for a phased refactor, but the foundation files it assumed (`motion_tokens.ts`, `use_tactile_hover.ts`, etc.) had zero filesystem presence — they were ideas, not code.

## Guidance

The refactor established a four-layer architecture that makes animation consistency mechanical rather than aspirational:

### Layer 1 — Design tokens (`motion_tokens.ts`)

Single source of truth for all animation values. Named by perceptual quality, not numbers:

```ts
export const springTactile = { type: "spring" as const, stiffness: 300, damping: 26 }
export const springPress = { type: "spring" as const, stiffness: 400, damping: 28 }
export const springFlip = { type: "spring" as const, stiffness: 260, damping: 24 }
export const springDrawer = { type: "spring" as const, stiffness: 300, damping: 32 }

export const SCALE_PRESS = 0.97
export const SCALE_HOVER = 1.05
export const LIFT_HOVER = 3
```

A `motionPreset(kind)` factory lets developers declare element identity instead of hand-picking springs:

```ts
type MotionKind = "wall-card" | "crate-bin" | "crate-thumbnail" | "drawer" | "press" | "card-flip"
motionPreset("crate-bin") // → { spring, scale: 1.05, lift: 3, tilt: -0.5 }
```

### Layer 2 — MotionConfig provider (`storefront_motion_config.tsx`)

Wraps framer-motion's `<MotionConfig reducedMotion="user">` and surfaces OS preference via React context. Placed at the app layout root so every descendant inherits reduced-motion behavior without per-component conditionals:

```tsx
<StorefrontMotionConfig>
  <PileProvider>
    <AppLayoutInner />
  </PileProvider>
</StorefrontMotionConfig>
```

### Layer 3 — Tactile hover hook (`use_tactile_hover.ts`)

The engine. Returns `{ isHovered, isPressed, proximity, transform, transition, handlers }`:

- **Continuous cursor proximity** — computes distance from cursor to element center via `getBoundingClientRect()`, mapped to 0–1 with `maxDist = diagonal * 0.6`. Throttled by `requestAnimationFrame` with cancel-before-schedule.
- **Touch fallback** — `pointerType !== "mouse"` snaps to binary (proximity = 1 on enter, 0 on leave).
- **State-dependent transition** — returns `springPress` when pressed, `springTactile` otherwise, so press-down feels snappier without the consumer knowing about it.
- **Reduced-motion** — collapses to identity transform, proximity stays binary.
- **Mouse enter computes proximity immediately** — extracted math into shared `updateProximity()` called from both `onPointerEnter` and `onPointerMove`, so hovering a stationary cursor still responds.

### Layer 4 — TactileCard wrapper (`tactile_card.tsx`)

Drop-in `motion.div` wrapper for simple cases. Consumes the hook internally, spreads handlers, wires `animate={transform}` and `transition={transition}`:

```tsx
<TactileCard restingTilt={1.5}>
  <RecordCard listing={record} />
</TactileCard>
```

### Advanced — Direct hook usage for multi-element coordination

When a single wrapper can't express the behavior (e.g., crate cards with lid-lift header, sliding label, and grouped thumbnails all responding to one hover state), use the hook directly:

```tsx
const { isHovered, isPressed, handlers } = useTactileHover({ restingTilt: -0.5 })

return (
  <motion.button animate={{ scale: isPressed ? SCALE_PRESS : isHovered ? SCALE_HOVER : 1 }} {...handlers}>
    <motion.div animate={{ y: isHovered ? -2 : 0 }}>  {/* lid lift */}
      <motion.span animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -4 }}>DIG →</motion.span>
    </motion.div>
    <motion.div animate={{ scale: isHovered ? SCALE_HOVER : 1 }}>  {/* grouped thumbnails */}
      {thumbnails}
    </motion.div>
  </motion.button>
)
```

### Enforcement

- **CSS custom properties** mirror TypeScript tokens at `:root` (`--mc-spring-stiffness: 300`, `--mc-scale-press: 0.97`, etc.) — inspectable in DevTools.
- **Lint scanner** (`scripts/lint-motion-tokens.ts`) flags inline `stiffness`/`damping`, raw `whileHover`/`whileTap` scales, and inline spring transitions. Run in CI. Exits 0 when clean.

## Why This Matters

- **Consistency becomes mechanical** — the lint scanner catches regressions. Developers can't accidentally write inline values without CI failing.
- **Perceptual naming** — "springTactile" and "springPress" tell you how they *feel*, not what numbers they use. Tuning changes propagate from one file.
- **Systemic reduced motion** — one provider at the app root covers every component. No more ad-hoc `useReducedMotion()` ternaries scattered across files.
- **Continuous proximity** replaces binary snap — cards respond to cursor *approach*, not just on/off, with sub-frame rAF throttling. Touch devices degrade gracefully to binary.

## When to Apply

- When 3+ components use inline animation values (spring configs, scale constants, transition presets) that should be unified.
- When reduced-motion handling is inconsistent or absent across components.
- When you need CI enforcement to prevent regression back to inline values.
- Do **not** apply for 1–2 components with simple animations — the token overhead isn't worth it. Do **not** use for rapid prototyping where values are still being tuned.

## Examples

### Before → After: Wall cards (`store_floor.tsx`)

Before (inline):
```tsx
<motion.div
  whileHover={{ rotate: tilt, y: -3, scale: 1.05, zIndex: 10 }}
  transition={{ type: "spring", stiffness: 300, damping: 22 }}
/>
```

After (tokenized):
```tsx
<TactileCard restingTilt={tilt}>
  <RecordCard listing={record} />
</TactileCard>
```

### Before → After: Crate card (`crate_card.tsx`)

Before: plain `<button>` with CSS `transition-colors`. Thumbnails each had independent `motion.button` with `whileHover={{ scale: 1.05 }}`. DIG label used CSS `group-hover:opacity-100`.

After: `useTactileHover` drives coordinated animation — crate tilts, header lifts, label slides in, thumbnails scale as a group. Single hover state, five animated children.

### Before → After: Inline spring → token

```tsx
// Before
transition={{ type: "spring", stiffness: 260, damping: 24 }}

// After
import { springFlip } from "@/lib/motion_tokens"
transition={springFlip}
```

### Lint scanner output (clean)

```
$ npx tsx scripts/lint-motion-tokens.ts
✓ No motion token violations in 37 files.
```

## Bugs Encountered During Migration

Four implementation bugs surfaced during the refactor that tests didn't catch:

1. **Foundation files didn't exist** — The implementation guide described `motion_tokens.ts` and friends as "existing." They weren't. Phase 0 had to be created from scratch before any other phase could execute.

2. **StorefrontMotionConfig not wired into AppLayout** — The provider was created but never added to the component tree. `TactileCard` → `useTactileHover` → `useReducedMotionContext` threw at runtime. The existing test suite never hit this path because `matchMedia` mock always returned `false`, so `useIsDesktop` always rendered the mobile branch (which used raw `motion.button`, not `TactileCard`).

3. **Mouse enter didn't compute proximity** — The `onPointerEnter` handler only set proximity for touch. For mouse, it waited for `onPointerMove`. If the cursor entered and stayed still, nothing happened. Fixed by extracting proximity math into a shared function called from both handlers.

4. **rAF callbacks fired after unmount** — `requestAnimationFrame` callbacks in `onPointerMove` accessed `e.currentTarget.getBoundingClientRect()` after the component unmounted. Fixed with a null guard on `e.currentTarget`.

## Related

- [Backend crate strategies consolidation](../architecture-patterns/crate-strategies-pattern-2026-05-07.md) — The architectural pattern parallel: backend's `CrateStrategies::select()` interface directly inspired the frontend's `motionPreset()` factory. Both follow "single constant, no duplication → strategy objects with common interface → enforce via shared engine."
- [Implementation guide](../../ideation/storefront-animation-refactor-implementation-guide.md) — 6-phase execution plan.
- [Phase 0 plan](../../plans/2026-05-08-001-feat-storefront-animation-phase-0-plan.md) — Bootstrap plan for foundation files.
