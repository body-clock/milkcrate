---
date: 2026-05-08
topic: storefront-animation-refactor-plan-ideation
focus: docs/ideation/storefront-animation-refactor-implementation-guide.md
mode: repo-grounded
---

# Ideation: Storefront Animation Refactor Implementation Plan

## Grounding Context

### Codebase Context
- **Project:** Rails 8.1 + Inertia + React/TypeScript + Vite + Tailwind + Framer Motion. Frontend in `app/frontend/`. Deployed via Kamal to Hetzner.
- **Strategy:** "Make online record browsing feel like walking into a record store" — tactile character is a strategic priority, not cosmetic.
- **Partial animation migration does NOT exist:** `motion_tokens.ts`, `storefront_motion_config.tsx`, `use_tactile_hover.ts`, `tactile_card.tsx` are described in the plan as "existing foundation" but have zero filesystem presence.
- **Pain points:** Binary hover only (no cursor proximity), `springPress` defined but unused (in the non-existent token file), dead `wall.tsx`, no token enforcement, hardcoded spring values in 5+ locations.

### Past Learnings
- Backend's `CrateStrategies` consolidation validated patterns: single constant no duplication, strategy objects with common interface, score-once-filter-per-category. These transfer directly to the motion refactor.
- `crate-animation-spec.md` defines precise drag thresholds (80px) and depth scales (0.92/0.84/0.76) that must be preserved.

### Topic Context
The subject is the implementation guide itself — a 6-phase plan derived from two prior ideation rounds. The "What NOT to do" section rejects: `useMotionValue`/`useSpring`, ambient breathing, scroll choreography, declarative animation intents.

## Topic Axes
1. Risk, failure modes & rollback
2. Ordering, sequencing & dependencies
3. Verification strategy & test coverage
4. Completeness & edge cases
5. Clarity, documentation & maintainability

## Ranked Ideas

### 1. Foundation files don't exist — add explicit Phase 0
**Description:** The implementation guide lists four files as "created during the first migration pass and should be preserved as the foundation." None of these files exist in the codebase. Phase 1b instructs importing from `motion_tokens.ts` but there is no file to import from. The plan either needs an explicit Phase 0 to create the foundation from scratch, or Phases 1-2 must acknowledge they *are* the foundation creation steps, not a cleanup pass.
**Axis:** Risk, failure modes & rollback
**Basis:** `direct:` — `find` for `motion_tokens.ts`, `use_tactile_hover.ts`, `tactile_card.tsx`, `storefront_motion_config.tsx` returns zero results across the entire codebase.
**Rationale:** A developer executing this plan cold will hit file-not-found errors on their first edit. The plan's estimated timings (Phase 1: 10 minutes) are off by an order of magnitude because they assume the foundation exists. Every phase from 1b onward references at least one of these files.
**Downsides:** Straightforward to fix — just add the bootstrap work. No architectural change required.
**Confidence:** 100%
**Complexity:** Low
**Status:** Explored

### 2. Move `motionPreset` factory from Phase 6 to Phase 2
**Description:** The `motionPreset(kind)` factory (Phase 6a) encodes the mapping from element kind to spring config. It's deferred to the last phase, but it should be built in Phase 2 immediately after tokens exist. This makes Phases 3-5 consume presets rather than hand-picking springs, matching the backend's strategy-interface pattern.
**Axis:** Ordering, sequencing & dependencies
**Basis:** `external:` — Backend `CrateStrategies` consolidation pattern: `select()` interface was built first, then consumed by all strategies.
**Rationale:** Deferring the factory to Phase 6 means Phases 3-5 build against raw spring configs and must be revisited later. Building it in Phase 2 means every subsequent phase is faster and less error-prone.
**Downsides:** Slight upfront work to define the MotionKind union before all consumers are known.
**Confidence:** 85%
**Complexity:** Low
**Status:** Unexplored

### 3. `useMotionValue` prohibition needs an explicit carve-out
**Description:** The "What NOT to do" section flatly rejects `useMotionValue` / `useSpring`, but `crate_view.tsx` actively uses both for the front-riffle drag system. A developer interpreting the prohibition literally could break the drag gesture — the most sophisticated animation in the app.
**Axis:** Risk, failure modes & rollback
**Basis:** `direct:` — `crate_view.tsx:157-158`: `const dragX = useMotionValue(0); const activeRotate = useTransform(dragX, [-120, 0, 120], [-8, 0, 8])`.
**Rationale:** The prohibition's intent is scoped to hover tracking (Phase 3), but the language is dangerously broad. A one-line scope clause prevents accidental breakage.
**Downsides:** None. Trivial fix.
**Confidence:** 95%
**Complexity:** Trivial
**Status:** Unexplored

### 4. Wall description doesn't match actual code
**Description:** The plan describes a wall with 10-element tilt and overlap arrays, per-card staggered damping, and absolute-positioned scattered cards. The actual code uses a simple alternating tilt pattern (`i % 2 === 0 ? 1.5 : -1.5`) and a CSS grid with uniform spacing — no overlap array exists.
**Axis:** Completeness & edge cases
**Basis:** `direct:` — `store_floor.tsx:43`: simple alternating pattern. Wall uses `grid grid-cols-6 gap-1`, not absolute positioning.
**Rationale:** If the implementer follows Phase 4 literally, they'll design for scatter/overlap patterns that don't exist, wasting implementation effort.
**Downsides:** The plan needs reconciliation with actual code. May affect the staggered damping discussion.
**Confidence:** 95%
**Complexity:** Low
**Status:** Unexplored

### 5. Add proximity math pure-function tests
**Description:** The plan says "test after each phase" but the test suite has zero animation assertions and references a `storefront_full_render.test.tsx` that doesn't exist. Minimum viable: extract proximity math as a pure function (`computeProximity(rect, x, y): number`) and unit-test it. Stop referencing non-existent test files.
**Axis:** Verification strategy & test coverage
**Basis:** `direct:` — `storefront_shell.test.tsx` has 10 tests, all text/click assertions. `storefront_full_render.test.tsx` doesn't exist.
**Rationale:** Phase 3's core logic (distance → proximity → transform) is untestable as written. Extracting the math makes it testable without a browser.
**Downsides:** JSDOM can't test visual behavior. Real verification still needs manual review. But math tests catch structural errors.
**Confidence:** 75%
**Complexity:** Medium
**Status:** Unexplored

### 6. ESLint `no-restricted-imports` instead of custom AST scanner
**Description:** Phase 6b proposes a custom script scanning `.tsx` for inline `stiffness`/`damping` numbers. Replace it with ESLint's built-in `no-restricted-imports` rule blocking `framer-motion` in `store_floor.tsx` and `crate_card.tsx`. Simpler, maintained by ESLint, and catches the same violation class.
**Axis:** Risk, failure modes & rollback
**Basis:** `external:` — ESLint's `no-restricted-imports` is widely used for import boundary enforcement. A custom script adds build-tool maintenance that ESLint already handles.
**Rationale:** The custom scanner would false-positive on the token file itself and adds a new build dependency. The two files that should use TactileCard can be enforced with one ESLint config line.
**Downsides:** Doesn't catch inline spring configs in files that legitimately use framer-motion (`crate_view.tsx`, `pile_sheet.tsx`). But those files need raw access — the enforcement belongs at the import level, not the value level.
**Confidence:** 80%
**Complexity:** Low
**Status:** Unexplored

### 7. Touch-first crate identity design
**Description:** Phase 5's crate identity effects (`whileHover` tilt, lid lift, DIG label slide-in) activate only on cursor hover. On touch devices — likely 60%+ of sessions — they silently fall back to plain CSS buttons. Redesign the crate interaction for touch: bind the lid-opening preview to press-and-hold, commit navigation on release.
**Axis:** Completeness & edge cases
**Basis:** `direct:` — Phase 5 uses `whileHover` exclusively. Phase 3 handles touch for proximity (pointerType check) but Phase 5 never revisits crate identity through a touch lens.
**Rationale:** The biggest visual-impact phase delivers zero improvement to the majority of users if touch isn't addressed.
**Downsides:** Adds design complexity. Press-and-hold vs tap disambiguation needs care. But the `crate-animation-spec.md` already establishes a drag-vs-tap disambiguation pattern (80px threshold) that can be adapted.
**Confidence:** 80%
**Complexity:** Medium
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| - | Phase 3/5 contradiction | Plan already resolves it — Phase 5's group-override is explicit. Documentation note only. |
| - | Feature flag gating | Overengineered for solo-dev; phased commits are the right-weight rollback. |
| - | Reduced motion inconsistency | Genuine but scope expansion beyond the plan. Worth doing during implementation. |
| - | CSS dual-system hazard | Footnote, not a plan gap. |
| - | Remove CSS custom properties | Premature; solvable with generation from TS source. |
| - | Auto-fix lint rule | Subsumed by ESLint no-restricted-imports approach (#6). |
| - | One-pass proximity | Premature optimization; rAF throttling already handles perf. |
| - | Runtime motion budget | Too expensive; reduced-motion path already covers this. |
| - | Dual-write A/B mode | Overengineered for solo-dev project. |
| - | Calibrated values registry | Premature — token system doesn't exist yet. |
| - | wall.tsx 3D pattern extraction | Pattern already lives in record_card.tsx. |
| - | Staggered damping as reusable pattern | Based on plan's description, not actual code (wall is simpler). |
| - | Motion catalog / vocabulary docs | Interesting but secondary to structural issues. |
