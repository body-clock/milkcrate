---
title: "feat: Add adaptive display refresh rate detection to Framer Motion config"
type: feat
status: invalidated
date: 2026-05-15
origin: docs/brainstorms/2026-05-15-adaptive-refresh-rate-frame-rate-requirements.md
corrected: 2026-05-15
correction: |
  Verified-false premise in origin ideation and requirements doc. Framer Motion
  12.38 has no frameRate prop on MotionConfig. The animation loop already
  schedules via requestAnimationFrame (native refresh rate). The 1000/60
  constant is only the first-frame delta bootstrap. This plan is unbuildable
  as written and is superseded by corrected analysis.
---

# feat: Add adaptive display refresh rate detection to Framer Motion config

## Summary

Detect the display's native refresh rate at app boot via rAF sampling and pass it to Framer Motion's `MotionConfig` `frameRate` prop so every animation renders at the device's actual capability instead of being silently capped at 60fps. Two new files (lib utility + React hook), one prop added to an existing component.

## Problem Frame

Framer Motion defaults `frameRate` to 60 when the prop is absent. `StorefrontMotionConfig` only sets `reducedMotion="user"` — no `frameRate` is passed. Every spring, `AnimatePresence` transition, and gesture animation is capped at 60fps regardless of display capability. Setting the native rate is a one-prop change that upgrades the entire animation stack. (See origin: `docs/brainstorms/2026-05-15-adaptive-refresh-rate-frame-rate-requirements.md`)

## Requirements

- R1. Detect native refresh rate via rAF interval sampling, with `matchMedia('(update: fast)')` fallback and 60fps default
- R2. Pass detected rate as `frameRate` prop on `MotionConfig` in `StorefrontMotionConfig`
- R3. `prefers-reduced-motion` still takes full precedence
- R4. SSR defaults to 60fps; detection runs client-side on mount
- R5. Detection failure is silent — no console warning, no user-facing indicator
- R6. No regression on 60Hz devices; native-rate rendering on high-refresh displays
- R7. Detection adds imperceptible startup cost (< 300ms before first paint)

## Scope Boundaries

- Spring retuning for perceptual feel at 120Hz — out of scope
- Frame budget monitoring, degradation ladder, thermal-throttle response — out of scope
- GPU layer lifecycle management or tokenization — out of scope
- Interaction cadence strategy (what runs at 120Hz vs 60Hz in JS) — out of scope
- Verification pipeline, FPS overlay, CI lint rules — out of scope

## Context & Research

### Relevant Code and Patterns

- `app/frontend/components/storefront_motion_config.tsx` — injection point; wraps `MotionConfig` at app root with `reducedMotion="user"`. Adding `frameRate` is a natural second prop.
- `app/frontend/lib/motion_tokens.ts` — established `lib/` pattern for pure animation constants and presets. New detection utility follows this placement convention.
- `app/frontend/hooks/use_tactile_hover.ts` — canonical hook pattern: rAF usage with cancel-before-schedule, `useRef<number|null>` for rAF ID, `typeof window` SSR guard, explicit return type interface, `useCallback` for handlers.
- `app/frontend/contexts/viewport_context.tsx` — closest analog for detection architecture: SSR-safe `useState` initializer, browser API in `useEffect`, cleanup on unmount.
- `app/frontend/hooks/use_viewport.ts` — thin context-wrapper hook, demonstrates simple value-return interface.
- `app/frontend/test/setup.ts` — global `matchMedia` stub returning `matches: false`. Tests that need specific `matchMedia` behavior override per-test.

### Institutional Learnings

- **Animation token system** (`docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md`): Four-layer architecture (tokens → provider → hook → wrappers). New animation infra adds to `StorefrontMotionConfig`, not as a separate top-level concern. Bug #2 (provider not wired into component tree) warns: ensure the hook result actually reaches the `MotionConfig` JSX. Bug #4 (rAF callbacks after unmount) warns: include a mounted ref guard and cancel pending rAF on cleanup.
- **Viewport responsive architecture** (`docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`): Use named constants for defaults. Test by injection, not real hardware. Consumer interface should be a simple value read.
- **Conditional hook pitfall** (`docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md`): Never gate a hook call behind a condition. The hook always runs; the output (whether `frameRate` is passed) can be conditional.

### External References

Skipped — the codebase has strong local patterns for hooks, providers, and rAF usage.

## Key Technical Decisions

- **Two-file split (`lib/` + `hooks/`)**: Pure detection math in `lib/` (testable with `node:test`, no React dependency) + thin React wrapper in `hooks/` (lifecycle, SSR guard). Follows the existing `lib/motion_tokens.ts` + `hooks/use_tactile_hover.ts` separation pattern.
- **No separate context provider**: The hook is called directly inside `StorefrontMotionConfig` and the result is a plain `number` passed to `MotionConfig`. No new context or provider — avoids provider sprawl in `AppLayout` and keeps the detection local to the component that needs it.
- **Detection once at boot**: `useEffect` fires on mount, samples rAF for ~200ms, sets state once, and tears down. No runtime response to adaptive refresh rate changes — that belongs to the degradation ladder (out of scope).
- **Test by injection, not hardware**: The lib utility is a pure function accepting `performance.now`-like timestamps — tests pass known sequences. The hook can be overridden via module mock or a test-only prop. No test depends on real display hardware.
- **Named constant for default**: `DEFAULT_FRAME_RATE = 60` rather than a bare `60` — follows the `motion_tokens.ts` convention of named magic numbers.

## Open Questions

### Deferred to Implementation

- [Affects R1] Exact mapping from `matchMedia('(update: fast)')` to Hz — treat `fast` as 120Hz or 90Hz? Start with 120Hz and adjust if evidence suggests otherwise.
- [Affects R2] Does Framer Motion accept non-integer Hz values (e.g., 59.94) or must it be rounded? Test in dev with `frameRate={59.94}`.
- [Affects R4] Does changing `frameRate` from 60 (SSR) to native (hydration) cause a visible flash? Validate on a ProMotion device.

## Implementation Units

### U1. Detection library — rAF sampling and fallback logic

**Goal:** Pure function that samples rAF intervals and returns the detected refresh rate in Hz, falling back through matchMedia to 60fps.

**Requirements:** R1, R7

**Dependencies:** None

**Files:**
- Create: `app/frontend/lib/display_refresh_rate.ts`
- Test: `app/frontend/lib/display_refresh_rate.test.ts`

**Approach:**
- Export `detectFrameRate(sampleWindowMs: number): Promise<number>` — samples rAF deltas over the given window, computes average interval, rounds to nearest standard rate (60, 90, 120, 144, 165, 180, 240).
- Export `DEFAULT_FRAME_RATE = 60` as a named constant.
- Export `STANDARD_RATES: readonly number[]` for the rounding target list.
- The function takes an optional `now` parameter (defaults to `performance.now`) so tests can inject fake timestamps.
- Fallback chain: rAF sampling → `matchMedia('(update: fast)')` → `DEFAULT_FRAME_RATE`.
- If rAF is unavailable (SSR, jsdom), immediately resolve to `DEFAULT_FRAME_RATE` — no sample window delay.
- Rounding: compute average frame duration, derive Hz, snap to nearest standard rate within tolerance (±5Hz).

**Patterns to follow:**
- `app/frontend/lib/motion_tokens.ts` — named constants, pure functions, `node:test` test file
- `app/frontend/lib/riffle_navigation.ts` — lib utility style, no React dependency

**Test scenarios:**
- Happy path: 120Hz simulation — pass timestamps at ~8.33ms intervals, expect 120
- Happy path: 60Hz simulation — pass timestamps at ~16.67ms intervals, expect 60
- Happy path: 144Hz simulation — pass timestamps at ~6.94ms intervals, expect 144
- Edge case: rAF unavailable (no `requestAnimationFrame` on global) — should resolve to `DEFAULT_FRAME_RATE` without delay
- Edge case: `matchMedia` unavailable — should resolve to `DEFAULT_FRAME_RATE`
- Edge case: implausible interval (0ms, negative, > 100ms) — should fall through to next strategy
- Edge case: borderline rate (62Hz average) — should round to 60 (nearest standard within tolerance)
- Edge case: exact midpoint (75Hz — halfway between 60 and 90) — should round to nearest (60, since 75-60 < 90-75)

**Verification:**
- Lib function returns a standard rate (60, 90, 120, 144, 165, 180, or 240) for any valid input
- Returns `DEFAULT_FRAME_RATE` (60) when no detection mechanism is available
- All tests pass with `npx tsx --test app/frontend/lib/display_refresh_rate.test.ts`

### U2. React hook — `useDisplayRefreshRate`

**Goal:** Thin React wrapper around the lib detection function — manages lifecycle, SSR guard, mounted ref, and state.

**Requirements:** R1, R4, R5, R7

**Dependencies:** U1

**Files:**
- Create: `app/frontend/hooks/use_display_refresh_rate.ts`
- Test: `app/frontend/hooks/use_display_refresh_rate.test.tsx`

**Approach:**
- `useState<number>(() => DEFAULT_FRAME_RATE)` — SSR-safe initializer
- `useEffect` on mount: start detection, set state on resolution, cleanup cancels pending rAF
- Mounted ref (`useRef(true)`) checked before `setState` to prevent post-unmount updates
- Return type: `number` (Hz)
- The hook always runs — no conditional call site. Returns `DEFAULT_FRAME_RATE` until detection completes.

**Patterns to follow:**
- `app/frontend/hooks/use_tactile_hover.ts` — rAF lifecycle, `useRef` for mutable state, cleanup pattern
- `app/frontend/contexts/viewport_context.tsx` — SSR-safe `useState`, `useEffect` for browser-only work
- `app/frontend/hooks/use_viewport.ts` — simple value-return interface

**Test scenarios:**
- Happy path: hook returns 60 initially, then updates to detected rate after async detection completes
- SSR safety: hook renders without `window` (jsdom without browser APIs), returns 60
- Unmount safety: unmount during detection — no state update after unmount (no console warning)
- Cleanup: pending rAF is cancelled on unmount
- Fallback: mock `matchMedia('(update: fast)')` returning `false` — hook returns 60

**Verification:**
- `npx vitest run app/frontend/hooks/use_display_refresh_rate.test.tsx` passes
- Hook never throws "called outside provider" — it has no context dependency
- Hook returns a number in all cases

### U3. Integration — `frameRate` prop on `MotionConfig`

**Goal:** Wire the detected frame rate into the existing `MotionConfig` wrapper.

**Requirements:** R2, R3

**Dependencies:** U2

**Files:**
- Modify: `app/frontend/components/storefront_motion_config.tsx`
- Modify: `app/frontend/components/storefront_motion_config.test.tsx`

**Approach:**
- Import `useDisplayRefreshRate` from `@/hooks/use_display_refresh_rate`
- Call hook inside `StorefrontMotionConfig` (same level as `useReducedMotion`)
- Pass result to `<MotionConfig frameRate={frameRate} reducedMotion="user">`
- No structural change — one additional import, one hook call, one prop
- `reducedMotion="user"` still takes precedence — Framer Motion handles the interaction

**Patterns to follow:**
- Existing `StorefrontMotionConfig` component shape — the hook call mirrors `useReducedMotion()` placement

**Test scenarios:**
- Existing tests continue to pass (wrapper renders children, provides `ReducedMotionCtx`)
- New test: `MotionConfig` receives a `frameRate` prop — spy on `MotionConfig` or assert via component inspection
- reduced-motion test: when `prefers-reduced-motion` is true, `frameRate` prop is still passed but animations collapse to instant (Framer Motion behavior — we pass the prop regardless)

**Verification:**
- `npx vitest run app/frontend/components/storefront_motion_config.test.tsx` passes
- Manual verification on a 120Hz ProMotion device: animations visibly smoother
- Manual verification on a 60Hz device: no regression

## System-Wide Impact

- **Interaction graph:** Every component using Framer Motion (`motion.div`, `AnimatePresence`, `whileHover`, `whileTap`) inherits the frame rate change automatically — no per-component changes needed.
- **Unchanged invariants:** `reducedMotion` behavior is unchanged. `ReducedMotionCtx` provider and `useReducedMotionContext()` hook are unchanged. The animation token system (`motion_tokens.ts`) is unchanged. All existing spring configurations are unchanged.
- **State lifecycle risks:** None — the detection runs once at mount with mounted ref guard. No persistent state beyond the resolved frame rate number.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Springs tuned at 60fps feel perceptually different at 120Hz (more visible oscillation frames) | Out of scope for this plan — retuning follows separately. The change is net-positive (smoother rendering) even without retuning. |
| Framer Motion's `frameRate` prop may behave unexpectedly with non-integer values | Round to nearest standard rate in U1. The deferred question about non-integer support is answered by the rounding strategy. |
| Changing `frameRate` between SSR (60) and hydration (native) could cause a visible flash | Deferred to implementation validation. If it flashes, the hook can delay the first render until detection completes (blocking hydration). |

## Sources & References

- **Origin document:** `docs/brainstorms/2026-05-15-adaptive-refresh-rate-frame-rate-requirements.md`
- **Ideation source:** `docs/ideation/2026-05-15-high-refresh-animation-optimization-ideation.md`
- Related code: `app/frontend/components/storefront_motion_config.tsx`, `app/frontend/lib/motion_tokens.ts`, `app/frontend/hooks/use_tactile_hover.ts`, `app/frontend/contexts/viewport_context.tsx`
- Institutional: `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md`, `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`, `docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md`
