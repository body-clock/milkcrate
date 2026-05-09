---
title: feat: Create storefront animation foundation files (Phase 0)
type: feat
status: completed
date: 2026-05-08
origin: docs/brainstorms/2026-05-08-storefront-animation-phase-0-requirements.md
---

# feat: Create Storefront Animation Foundation Files (Phase 0)

## Summary

Create the four foundation files that the storefront animation refactor plan assumes exist — `motion_tokens.ts`, `storefront_motion_config.tsx`, `use_tactile_hover.ts`, and `tactile_card.tsx` — at minimum viable contracts so later phases have importable surfaces. Zero existing files are modified.

---

## Problem Frame

The implementation guide references four foundation files as "existing" but none exist on disk. A developer executing the plan hits `import` errors immediately. Phase 0 closes this bootstrap gap before any cleanup or upgrade work begins.

---

## Requirements

- R1. `app/frontend/lib/motion_tokens.ts` exports spring configs, scale constants, transition presets, and reduced-motion overrides
- R2. `app/frontend/components/storefront_motion_config.tsx` exports a MotionConfig provider + reduced-motion context
- R3. `app/frontend/hooks/use_tactile_hover.ts` exports a hook returning `{ isHovered, isPressed, transform }` with binary hover behavior
- R4. `app/frontend/components/tactile_card.tsx` exports a `motion.div` wrapper consuming the hook, accepting `restingTilt`, `disableTilt`, `children`
- R5. Zero existing files modified
- R6. Phase 0 does not include cleanup work (dead-code removal, press-scale unification)
- R7. Files created in dependency order: tokens → config → hook → component
- R8. `tsc --noEmit` passes
- R9. Existing test suite passes with zero modifications

**Origin actors:** Developer executing the animation refactor plan

---

## Scope Boundaries

- No continuous cursor proximity tracking (Phase 3)
- No wall card porting to TactileCard (Phase 4)
- No crate-as-container identity (Phase 5)
- No token enforcement, lint rules, or `motionPreset` factory (Phase 6)
- No dead-code removal or existing component cleanup (Phase 1)

---

## Context & Research

### Relevant Code and Patterns

- **Lib files:** `app/frontend/lib/crate_window.ts` — named exports, TypeScript interfaces, snake_case filename
- **Hooks:** `app/frontend/hooks/use_theme.ts` — named export, object return, SSR guard, snake_case filename
- **Context providers:** `app/frontend/contexts/pile_context.tsx` — default export, `Props` interface, `children: React.ReactNode`
- **Components:** `app/frontend/components/crate_card.tsx` — default export, `interface Props`, destructured params, `@/` path alias for cross-directory imports
- **Framer Motion patterns:** Existing components use `whileHover`/`whileTap`, spring configs inline (300/22 for hover, 260/24 for flip, 300/32 for sheet), `useReducedMotion()` in `crate_view.tsx`
- **Path aliases:** `@/` → `app/frontend/` (configured in `tsconfig.json` and `vite.config.ts`)

### Institutional Learnings

- No prior learnings in frontend animation, Framer Motion, or React hook patterns — this is greenfield for the knowledge base.

---

## Key Technical Decisions

- **Token values match the implementation guide's documented constants**: SCALE_PRESS 0.97, SCALE_HOVER 1.05, springTactile 300/26, springPress 400/28. The guide is the specification for initial values; tuning happens in later phases.
- **Hook returns object, not tuple**: Matches existing hook conventions (`useTheme`, `usePile`). Object return is extensible without breaking callers when Phase 3 adds `proximity`.
- **Binary hover only in hook**: `isHovered` and `isPressed` toggled by `onPointerEnter`/`onPointerLeave`/`onPointerDown`/`onPointerUp`. No proximity state. Phase 3 adds the `proximity` field and `onPointerMove` handler.
- **Reduced-motion via framer-motion's `useReducedMotion()`**: Matches the existing pattern in `crate_view.tsx`. When active: transforms collapse to identity, transitions use `duration: 0`, `whileHover`/`whileTap` disable.
- **MotionConfig provider wraps framer-motion's `<MotionConfig>` and adds reduced-motion context**: Provides a `useReducedMotionContext()` hook so descendant components don't each call `useReducedMotion()` directly. This centralizes the reduced-motion contract.

---

## Implementation Units

### U1. Create `motion_tokens.ts`

**Goal:** Establish the single source of truth for animation constants.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Create: `app/frontend/lib/motion_tokens.ts`

**Approach:**
- Named exports for spring configs, scale constants, transition presets, and reduced-motion overrides
- Spring configs use `{ type: "spring" as const, stiffness, damping }` matching Framer Motion's `Transition` type
- Transition presets for hover, drawer, and flip map to the three spring configs already used in the codebase (but do not wire them into existing components in this phase)
- Export a `reducedMotionTransition` constant (`{ duration: 0 }`) and a `reducedMotionScale` constant (`1`) for consumers to use in reduced-motion ternaries
- Export a `ReducedMotionTokens` interface grouping the reduced-motion-safe alternatives

**Patterns to follow:**
- `app/frontend/lib/crate_window.ts` — named exports, interfaces, snake_case filename

**Test scenarios:**
- Happy path: Import `springTactile` — value is `{ type: "spring", stiffness: 300, damping: 26 }`
- Happy path: Import `SCALE_PRESS` — value is `0.97`
- Happy path: Import `transitionHover` — value is `{ type: "spring", stiffness: 300, damping: 26 }`
- Happy path: Import `reducedMotionTransition` — value is `{ duration: 0 }`
- Edge case: All spring configs type-check as Framer Motion `Transition` values

**Verification:**
- `tsc --noEmit` passes
- `node --import tsx --test app/frontend/lib/motion_tokens.test.ts` passes

---

### U2. Create `storefront_motion_config.tsx`

**Goal:** Provide a MotionConfig provider that surfaces reduced-motion preference to the component tree.

**Requirements:** R2

**Dependencies:** U1 (imports from motion_tokens)

**Files:**
- Create: `app/frontend/components/storefront_motion_config.tsx`

**Approach:**
- Default export a `StorefrontMotionConfig` component accepting `{ children }`
- Internally calls `useReducedMotion()` from framer-motion and exposes it via React context
- Wraps children in framer-motion's `<MotionConfig>` — pass `reducedMotion` prop so framer-motion handles spring→instant degradation natively
- Export a `useReducedMotionContext()` hook that reads from the context (convenience wrapper so consumers don't import both `useContext` and the context object)

**Patterns to follow:**
- `app/frontend/contexts/pile_context.tsx` — context provider pattern, `children` prop, exported hook
- `app/frontend/components/crate_view.tsx` — `useReducedMotion()` usage pattern

**Test scenarios:**
- Happy path: Render a child component — it renders without error
- Happy path: Call `useReducedMotionContext()` inside the provider — returns boolean
- Edge case: Call `useReducedMotionContext()` outside the provider — should throw or return a safe default

**Verification:**
- `tsc --noEmit` passes
- Component renders in a smoke test without crashing

---

### U3. Create `use_tactile_hover.ts`

**Goal:** Provide a reusable binary hover hook that components can consume for tactile behavior.

**Requirements:** R3

**Dependencies:** U1 (imports from motion_tokens), U2 (imports useReducedMotionContext)

**Files:**
- Create: `app/frontend/hooks/use_tactile_hover.ts`

**Approach:**
- Named export `useTactileHover(options?: { restingTilt?: number; disableTilt?: boolean })` returning `{ isHovered, isPressed, transform, handlers }`
- `isHovered` toggled by `onPointerEnter` / `onPointerLeave` (pointer events, not mouse events — works with touch emulation)
- `isPressed` toggled by `onPointerDown` / `onPointerUp`
- `transform` computed as a `MotionStyle` object: rotate from `restingTilt` when not hovered, 0 when hovered (unless `disableTilt`); scale from `SCALE_PRESS` when pressed, `SCALE_HOVER` when hovered, 1 otherwise; y-lift when hovered
- `handlers` is an object bundling the four pointer event handlers for spreading onto a `motion.div`
- SSR guard: skip pointer event registration if `typeof window === "undefined"`
- Reduced-motion: when context reports active, `transform` returns identity (`{ rotate: 0, scale: 1, y: 0 }`) and handlers are no-ops

**Patterns to follow:**
- `app/frontend/hooks/use_theme.ts` — named export, object return, SSR guard, useState for state

**Test scenarios:**
- Happy path: Hook returns `{ isHovered: false, isPressed: false }` initially
- Happy path: Simulate `onPointerEnter` → `isHovered` becomes `true`, `transform.scale` reflects `SCALE_HOVER`
- Happy path: Simulate `onPointerLeave` → `isHovered` becomes `false`
- Happy path: Simulate `onPointerDown` → `isPressed` becomes `true`, `transform.scale` reflects `SCALE_PRESS`
- Happy path: With `disableTilt: true`, `transform.rotate` is always `0`
- Edge case: With `restingTilt: 3`, idle `transform.rotate` is `3`, hovered `transform.rotate` is `0`

**Verification:**
- `tsc --noEmit` passes
- Hook test passes via `renderHook` from `@testing-library/react`
- TypeScript enforces the return type — `transform` is assignable to framer-motion's `MotionStyle`

---

### U4. Create `tactile_card.tsx`

**Goal:** Provide a drop-in `motion.div` wrapper that makes any content tactile without per-component boilerplate.

**Requirements:** R4

**Dependencies:** U3 (consumes useTactileHover)

**Files:**
- Create: `app/frontend/components/tactile_card.tsx`

**Approach:**
- Default export `TactileCard` accepting `Props`: `restingTilt?: number`, `disableTilt?: boolean`, `children: React.ReactNode`, `className?: string`, `style?: React.CSSProperties`
- Internally calls `useTactileHover({ restingTilt, disableTilt })` and spreads the returned `handlers` onto a `motion.div`
- `motion.div` uses `animate={transform}` for the motion target and `transition={transitionHover}` / `transition={springPress}` from tokens
- `className` and `style` are forwarded to the `motion.div` for layout control
- The `motion.div` renders `{children}` inside

**Patterns to follow:**
- `app/frontend/components/crate_card.tsx` — default export, `interface Props`, destructured params, `motion` element
- `app/frontend/components/pile_sheet.tsx` — `motion.div` with `AnimatePresence`, `transition` prop from spring configs

**Test scenarios:**
- Happy path: Renders children inside a `motion.div`
- Happy path: Passing `restingTilt={2}` — idle state shows tilt in the computed transform
- Happy path: Passing `disableTilt` — tilt is disabled
- Happy path: `className` and `style` are forwarded to the motion element
- Happy path: `onClick` on the wrapper triggers the handler passed by the parent (click-through)

**Verification:**
- `tsc --noEmit` passes
- Component renders in a smoke test
- Storefront shell test passes unchanged (TactileCard is created but not yet wired into existing components — per R5)

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `tsc --noEmit` regression from new imports | U1–U4 each verified independently with `tsc --noEmit` before proceeding to the next unit |
| Export shape mismatch between hook and component | U4 depends on U3; verify after each unit. TypeScript enforces the contract between them |
| Reduced-motion context not available to hook in test | Mock the context in hook tests; component tests can wrap in a real StorefrontMotionConfig provider |
| Framer Motion types drift from the token values | Token values use `as const` assertions so TypeScript catches mismatches if Framer Motion's `Transition` type changes |

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-08-storefront-animation-phase-0-requirements.md](../brainstorms/2026-05-08-storefront-animation-phase-0-requirements.md)
- **Implementation guide:** [docs/ideation/storefront-animation-refactor-implementation-guide.md](../ideation/storefront-animation-refactor-implementation-guide.md)
- Related patterns: `app/frontend/lib/crate_window.ts`, `app/frontend/hooks/use_theme.ts`, `app/frontend/contexts/pile_context.tsx`
- Framer Motion patterns: `app/frontend/components/crate_view.tsx` (useReducedMotion), `app/frontend/components/crate_card.tsx` (whileHover/whileTap spring configs)
