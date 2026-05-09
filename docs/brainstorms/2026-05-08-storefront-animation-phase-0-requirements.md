---
date: 2026-05-08
topic: storefront-animation-phase-0-bootstrap
---

# Phase 0: Foundation File Bootstrap

## Summary

Add a Phase 0 to the storefront animation refactor plan that creates the four foundation files (`motion_tokens.ts`, `storefront_motion_config.tsx`, `use_tactile_hover.ts`, `tactile_card.tsx`) at their minimum viable contracts, so Phases 1b–6 have importable surfaces rather than hitting file-not-found errors. Phase 0 changes zero existing component behavior.

---

## Problem Frame

The implementation guide (`docs/ideation/storefront-animation-refactor-implementation-guide.md`) describes four files as "created during the first migration pass and should be preserved as the foundation." None of these files exist in the codebase. A developer starting the plan will hit `import` errors on their first edit — Phase 1b instructs importing `SCALE_PRESS` from `motion_tokens.ts`, which doesn't exist. The plan's time estimates assume these files are present, making every phase's estimate off by an order of magnitude. Phase 0 closes this bootstrap gap before any cleanup or upgrade work begins.

---

## Requirements

### File contract

- R1. `app/frontend/lib/motion_tokens.ts` must export spring configs (`springTactile`, `springPress`), scale constants (`SCALE_PRESS`, `SCALE_HOVER`), transition presets (`transitionHover`, `transitionDrawer`, `transitionFlip`), and reduced-motion overrides matching the values documented in the implementation guide.
- R2. `app/frontend/components/storefront_motion_config.tsx` must export a `MotionConfig`-wrapped provider that surfaces reduced-motion preference to descendant components, and a `useReducedMotionContext` hook for reading that preference.
- R3. `app/frontend/hooks/use_tactile_hover.ts` must export a hook returning `{ isHovered, isPressed, transform }` using binary hover behavior (pointer enter/leave toggles). The hook must consume the motion tokens for its spring configs and the reduced-motion context for accessibility. Proximity tracking is deliberately absent — it arrives in Phase 3.
- R4. `app/frontend/components/tactile_card.tsx` must export a component that wraps `motion.div`, consumes `useTactileHover`, and accepts `restingTilt`, `disableTilt`, `children`, and optionally `className` and `style` props. It wires the hook's `transform` output to framer-motion's `animate` prop and uses token-defined transitions.

### Bootstrap contract

- R5. Phase 0 must not modify any existing component (`store_floor.tsx`, `crate_card.tsx`, `crate_view.tsx`, `record_card.tsx`, `pile_sheet.tsx`, `wall.tsx`). Existing components continue using their current inline spring configs and direct `motion.div` wrappers.
- R6. Phase 0 must not delete `wall.tsx` or unify press-down scales — that is Phase 1 cleanup work.
- R7. The four files must be created in dependency order: tokens → config → hook → component. Each file imports from the ones before it; none may import from files after it in the chain.

### Verification

- R8. Phase 0 is complete when `tsc --noEmit` passes without errors (all imports resolve, all exports type-check) with zero changes to existing files.
- R9. The existing test suite (`storefront_shell.test.tsx`, `crate_window.test.ts`, `use_pile.test.ts`, `accessibility.test.tsx`, page smoke tests) must continue to pass with zero modifications.

---

## Acceptance Examples

- AE1. **Covers R1, R3, R5.** Given Phase 0 has been completed and `motion_tokens.ts` exports `SCALE_PRESS = 0.97`, when `crate_view.tsx` (unchanged) continues to render with its inline `whileTap: { scale: 0.92 }`, the storefront shell test still passes — Phase 0 added files but changed nothing that existing code consumes.
- AE2. **Covers R7.** Given the four files exist, when `tactile_card.tsx` is opened, its import of `useTactileHover` resolves, which imports from `storefront_motion_config.tsx`, which imports from `motion_tokens.ts`. No circular dependencies.
- AE3. **Covers R8.** Given Phase 0 is complete, when `npx tsc --noEmit` runs, it exits 0 — all new exports are type-correct and no existing file has been modified to introduce errors.

---

## Success Criteria

- A developer running the plan from a clean `development` branch can begin Phase 1 without creating files from scratch or reverse-engineering import paths.
- Phase 1's estimated time (10 minutes for cleanup) is achievable as described because the files it references exist on disk.
- The Phase 0 diff touches exactly four new files and zero existing files, making it trivially reviewable.

---

## Scope Boundaries

- No continuous cursor proximity tracking (Phase 3).
- No wall card porting to TactileCard (Phase 4).
- No crate-as-container identity animations (Phase 5).
- No token enforcement, lint rules, or `motionPreset` factory (Phase 6, though the ideation recommends moving `motionPreset` into Phase 2).
- No dead-code removal, press-scale unification, or existing component cleanup (Phase 1).

---

## Key Decisions

- **Token values match the implementation guide's documented constants**: SCALE_PRESS 0.97, SCALE_HOVER 1.05, springTactile 300/26, springPress 400/28. The guide is treated as the specification for these values. If any value is wrong for its intended use, it will surface during Phase 3 (proximity) or Phase 4 (wall porting) when consumers wire to the token system.
- **Binary hover only in the hook's Phase 0 version**: The hook returns `isHovered` and `isPressed` booleans with no proximity state. Phase 3 will add the proximity field and `onPointerMove` handler. This keeps Phase 0's surface minimal — just enough for later phases to build on without designing the proximity API before its requirements are fully understood.
- **Reduced-motion context exists from Phase 0**: Even though no existing component consumes it yet, the MotionConfig provider and context hook are created now because Phase 3 requires them and building the infrastructure in Phase 2 (Foundation) is more logical than deferring it to Phase 3 (Core upgrade).

---

## Dependencies / Assumptions

- The implementation guide's token values (spring configs, scale constants) are correct as specified. If they need tuning, that happens later — Phase 0 encodes the guide's values as-is.
- The project uses Framer Motion and already has it in `package.json` (confirmed: imported by 5 existing components).
- The project uses React 18+ (automatic batching in rAF callbacks — relevant when Phase 3 adds the rAF-throttled pointer move handler, but not required for Phase 0).
- `app/frontend/lib/` and `app/frontend/hooks/` directories already exist and are valid TypeScript source paths (confirmed: `crate_window.ts` lives in `lib/`, multiple hooks in `hooks/`).
