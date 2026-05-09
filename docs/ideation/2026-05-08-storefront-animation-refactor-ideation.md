---
date: 2026-05-08
topic: storefront-animation-refactor
focus: Ground-up refactor of storefront animations based on the prior animation-cohesion ideation, guided by a direct codebase assessment of what was and wasn't implemented.
mode: repo-grounded
---

# Ideation: Storefront Animation Refactor

## Grounding Context

**Codebase:** Rails 8 + Inertia.js + React 19 + TypeScript + Framer Motion 12.38. Dark-mode-first design with warm charcoals, oxblood accent, serif typography. Storefront page (`StoreFloor`) has three sections: picks wall (cover grid with scattered ±tilts + scale on hover, no flip in current layout), featured crates (`CrateCard` with thumbnail grid scaling 1.05 on hover), and genre grid (same `CrateCard`). `CrateView` has a complex riffle-stack animation with drag navigation. The STRATEGY.md "Digital storefront character" track calls for a spatial, character-driven experience.

**Assessment of prior implementation state** (from `docs/ideation/2026-05-07-storefront-animation-cohesion-ideation.md`):

| Prior Idea | Status |
|---|---|
| #5 Motion Design Token System | ✅ Implemented but underleveraged — `motion_tokens.ts` exists (4 spring configs), `storefront_motion_config.tsx` wraps with `MotionConfig` + reduced-motion context. CSS custom properties never created. Tokens bypassed by inline values in wall. |
| #1 Unified Tactile Object Language | ⚠️ Surface-only — `TactileCard` + `useTactileHover` exist but only crate thumbnails use them (with `disableTilt`). Wall picks, record cards, crate wrappers don't. |
| #2 Cursor Proximity Gravity Field | ❌ Not implemented — `useTactileHover.onPointerMove` is a no-op. Binary hover only. |
| #3 Press-Down → Commit Gesture Chain | ❌ Not implemented — only where `TactileCard` is used. Wall flips, crate nav, and crate view transition are instant. |
| #4 Crate-as-Container Motion Identity | ❌ Actively rejected — code comments say "Crates are stationary containers — the crate itself stays planted." |
| #6 Ambient Store Aliveness | ❌ Not implemented |
| #7 Spatial Scroll Choreography | ❌ Not implemented |

**Key architectural findings:**
- `wall.tsx` is dead code (never imported) — contains a duplicate flip implementation inferior to `RecordCard`
- Wall picks in `store_floor.tsx` use inline `stiffness: 300, damping: 22-28` (staggered) — not the token's `springTactile: 300/26`
- Crate view paginator buttons use hardcoded `whileTap: { scale: 0.92 }` — differs from `SCALE_PRESS: 0.97`
- `useTactileHover` duplicates `SCALE_PRESS` as a local `PRESS_SCALE` constant
- `springPress` (400/28) is defined but never consumed
- The wall's scattered-tilt character (hardcoded arrays) is the most distinctive animation but the least tokenized

**External context:** Apple HIG motion as meaning-maker; Material Design motion tokens; Stripe pointer-relative card tilt; Linear unified hover-scaling; cardistry flourishes (press-down → overshoot settle); pinball attract mode (subtle ambient pulses); museum vitrine design (container-as-character); DJ crate digging physics.

## Topic Axes

1. **Adoption architecture** — Which components get shared tactile treatment, dead code cleanup, the migration path from partial to complete
2. **Physics backbone** — Spring token enforcement, CSS custom properties, reduced-motion coverage, eliminating inline magic numbers
3. **Crate identity** — How crates express "container" distinct from covers as "flat objects"
4. **Interaction depth** — Binary hover → cursor proximity, press-down chain, ambient aliveness
5. **Wall character** — Scattered tilts, overlap patterns, preserving what works while fitting into unified physics

## Ranked Ideas

### 1. Continuous Cursor Proximity in `useTactileHover`
**Description:** Upgrade the `useTactileHover` hook from binary hover (enter/leave) to continuous cursor-proximity tracking. The current `onPointerMove` handler is a literal no-op with the comment `// No-op: hover is binary`. Fill it: read pointer position relative to the element center, compute a `proximity` value (0–1), and interpolate tilt, lift, and scale continuously. Cards respond to cursor approach — not just arrival. Multiple nearby cards respond simultaneously. Touch devices fall back to the existing binary press behavior. This is a one-hook change that upgrades every TactileCard consumer (crate thumbnails, and after refactor, wall cards and crate bins) for free.
**Axis:** Interaction depth
**Basis:** `direct:` `use_tactile_hover.ts` lines 87–91 — `onPointerMove: () => { // No-op: hover is binary, no continuous computation needed. }` — handler body is empty; pointer tracking infrastructure already wired. `external:` Stripe's pointer-relative card tilt (widely referenced Framer Motion pattern); Apple visionOS gaze-proximity spatial UI.
**Rationale:** Binary hover is the root cause of the "mechanical" feeling. Wall cards snap from scattered-tilt to straight. Crate thumbnails snap from 100% to 105% scale. Continuous proximity replaces snap with approach — the element "pays attention" before you touch it. This is the single highest-leverage change: one hook upgrade makes the entire storefront feel alive.
**Downsides:** Slightly more expensive than binary hover (pointermove listener). Needs a dead zone to prevent vibration from micro-movements. Touch fallback already in place.
**Confidence:** 90%
**Complexity:** Medium
**Status:** Unexplored

### 2. Wall Character as Reusable Personality Tokens + `WallStage` Component
**Description:** The wall's scattered-tilt character — currently three hardcoded arrays (`tilts`, `overlaps`, inline `damping` variance) inside `store_floor.tsx` — becomes a named **personality token** (`scatteredDisplay`) and a reusable **`WallStage`** layout component. The personality token encodes: tilt range/distribution, overlap curve, damping variance, and whether cards straighten to 0° on hover. `WallStage` accepts `children`, a `personality` token, and optional grid config — it internally computes per-card scatter and wires hover interaction. No more inline arrays.
**Axis:** Wall character / Adoption architecture
**Basis:** `direct:` `store_floor.tsx` lines 43–63 — `const tilts = [2, -1.5, 1, 3, -2.5, -1, 2.5, -3, 1.5, -2]`, `const overlaps = [-10, -16, -12, -18, -14, -14, -10, -18, -16, -12]`, `const damping = 22 + (i % 4) * 2` — three hardcoded arrays with no parameterization. `direct:` `wall.tsx` is dead code — a prior attempt at a Wall component without a personality concept.
**Rationale:** The wall is the storefront's visual anchor and the user's favorite piece. If its character is lost in a refactor, no amount of infrastructure recovers it. `WallStage` + personality tokens make the scattered-tilt language a design primitive that survives refactors and can be reused (e.g., a "Recently Played" section with tighter scatter).
**Downsides:** Adds an abstraction layer. The personality token schema needs to cover enough parameters without over-generalizing.
**Confidence:** 95%
**Complexity:** Medium
**Status:** Unexplored

### 3. `CrateBin` — Container Identity as a Component
**Description:** A dedicated `CrateBin` wrapper component that encodes the "container" motion identity — distinct from the "flat object" identity of wall covers. On hover: the crate tilts slightly (using the same `useTactileHover` hook), its header row lifts 2-3px like a lid opening via `transformOrigin: "top"` and `scaleY`, the inner thumbnails shift as a group with subtle parallax (not independently), and the "DIG →" label slides in. On click: a press-down beat from `springPress` fires before navigation. Every future crate section inherits container identity automatically.
**Axis:** Crate identity
**Basis:** `direct:` `crate_card.tsx` lines 13, 18–19 — the crate outer shell is a plain `<button>` with CSS `hover:border-mc-accent transition-colors`; the comment explicitly states "Crates are stationary containers — the crate itself stays planted." `direct:` `crate_card.tsx` line 77 — thumbnails are individual `TactileCard` instances, each scaling independently.
**Rationale:** Crates are the primary navigation affordance and currently have no physics at all — this is the #1 source of the "disconnected" feeling. `CrateBin` makes the distinction between "wall cover" (flat object) and "crate bin" (volumetric container) encoded in the component API.
**Downsides:** The lid-lift effect needs to work at multiple card sizes. Parallax group shift may require custom orchestration beyond framer-motion's built-in patterns.
**Confidence:** 75%
**Complexity:** Medium-High
**Status:** Unexplored

### 4. Token Enforcement Layer (Lint Rule + Typed Presets)
**Description:** Two complementary mechanisms that make the motion token system *enforceable*. **(a)** A lint rule that scans `.tsx` files for inline `stiffness`/`damping`, raw `whileHover` scale numbers, and hardcoded `whileTap` scales — flagging any value not sourced from `@/lib/motion_tokens`. **(b)** A `motionPreset(kind)` factory — `motionPreset("wall-card")`, `motionPreset("crate-bin")`, `motionPreset("crate-thumbnail")` — that returns the correct token combination for each element kind. Developers declare *what kind of thing this is*, not *which spring parameters*.
**Axis:** Physics backbone / Adoption architecture
**Basis:** `direct:` Five locations contain inline motion values bypassing tokens: `store_floor.tsx:62–68` (whileHover scale 1.06, stiffness 300, per-card damping 22-30), `store_floor.tsx:174–175` (whileHover 1.05, whileTap 0.97 — values match tokens but don't reference them), `crate_view.tsx:327,342` (whileTap 0.92 vs SCALE_PRESS 0.97), `use_tactile_hover.ts:32` (PRESS_SCALE 0.97 duplicated from SCALE_PRESS).
**Rationale:** The token system is currently documentation, not constraint. The lint rule + preset factory create a gravity well: the right path is easy (presets), the wrong path is hard (lint catches you). This is the difference between "another partial migration" and "done, forever."
**Downsides:** Lint rule adds build-tool maintenance. Preset factory needs careful naming to stay intuitive.
**Confidence:** 90%
**Complexity:** Low-Medium
**Status:** Explored

### 5. Remove Dead `wall.tsx` + Consolidate Flip into `RecordCard`
**Description:** Delete `wall.tsx` entirely. Its internal `WallCard` has its own flip implementation with no drag support, no pile context, no keyboard handling, and no reduced-motion awareness — all things `RecordCard` already handles. Removing `wall.tsx` ensures every flip in the app uses the same `springFlip` token.
**Axis:** Adoption architecture
**Basis:** `direct:` `wall.tsx` is never imported — grep returns zero results. `direct:` `record_card.tsx` implements the canonical flip via `transitionFlip` with full feature support.
**Rationale:** Dead code with duplicate mechanics is a maintenance hazard. Zero-risk cleanup that removes a decision point.
**Downsides:** None. Zero consumers, zero test coverage.
**Confidence:** 100%
**Complexity:** Trivial
**Status:** Explored

### 6. Press-Down Scale Unification (0.92 → `SCALE_PRESS`)
**Description:** Import `SCALE_PRESS` into all three consumers (`store_floor.tsx` mobile picks, `crate_view.tsx` paginators, `use_tactile_hover.ts`), delete the local `PRESS_SCALE` in the hook, and use `springPress` (400/28) as the transition for all `whileTap` interactions.
**Axis:** Physics backbone
**Basis:** `direct:` `motion_tokens.ts` line 94 — `export const SCALE_PRESS = 0.97`. `direct:` `crate_view.tsx` lines 327, 342 — `whileTap={{ scale: 0.92 }}` differs from token. `direct:` `use_tactile_hover.ts` line 32 — duplicates token locally. `reasoned:` A design token no one imports isn't a token. The paginator's 0.92 is likely design drift.
**Rationale:** Press-down is sub-200ms — users perceive inconsistency instantly. Every press should feel like the same material deforming.
**Downsides:** If 0.92 was deliberate for circles vs rectangles, it should be a variant token, not an inline override.
**Confidence:** 95%
**Complexity:** Trivial
**Status:** Unexplored

### 7. CSS Custom Properties for Cross-Stack Motion Tokens
**Description:** Extend `motion_tokens.ts` to also emit CSS custom properties at `:root`: `--mc-spring-stiffness`, `--mc-scale-press`, `--mc-duration-hover`, etc. Non-React parts of the stack — Rails views, CSS `transition` declarations — can reference these. Completes the three-layer token system the prior ideation envisioned.
**Axis:** Physics backbone
**Basis:** `direct:` Prior ideation Idea #5 called for CSS custom properties alongside TS constants and MotionConfig provider. Only the TS layer was implemented. `reasoned:` A motion design system that only works in React isn't a system — it's a React pattern. CSS custom properties bridge this at zero runtime cost.
**Rationale:** Completes the token architecture. TS tokens exist — the CSS layer is the missing piece that makes the design language platform-wide.
**Downsides:** CSS custom properties can't encode spring curves — only scalar values. Framer Motion still needs JS tokens.
**Confidence:** 85%
**Complexity:** Low
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Full spring-mass-damper simulation | Over-engineered for current scope; framer-motion springs suffice |
| 2 | Animation-free storefront (pure layout) | Contradicts user intent — "things should move around and feel fun" |
| 3 | 3D z-space spatial navigation | Scope overrun — navigation paradigm, not animation refactor |
| 4 | Multi-stage physics pipeline | Over-engineered; adds complexity without proven need |
| 5 | Zero distinction covers vs crates | Explicitly rejected in prior ideation — user wants element identity |
| 6 | Pressure-responsive via PointerEvent.pressure | Niche API; most devices don't support it |
| 7 | Per-element spring via visual density | Over-engineered; implausible |
| 8 | Declarative animation intents (no framer-motion imports) | Over-abstracts for current scale |
| 9 | Origata staged unwrapping | Too theatrical for casual store vibe; high complexity |
| 10 | Leaning Stack (DJ sequential tilt chain) | High complexity; CrateBin covers the identity need |
| 11 | Attract Mode Conductor (ambient timeline) | Absorbed into wall personality tokens |
| 12 | 3-zone Gaze-Proximity Gradient | Overly complex; continuous proximity handles the need |
| 13 | Fly System Controller / AnimationDirector | Over-architected; preset factory + MotionConfig is sufficient |
| 14 | Pegboard Mount Model | Too many abstraction layers |
| 15 | Type-level token enforcement (branded types) | Lint rule achieves same enforcement with less ceremony |
| 16 | Invert to press-only interaction | Premature; continuous proximity addresses binary hover |
| 17 | Remove TactileCard (hook-only) | Would scatter boilerplate; TactileCard is a useful wrapper |
| 18 | TactileCard mandatory for every element | Forced universality adds friction |
| 19 | Wall as single composed surface | Absorbed into WallStage; independent scatter is the distinctive feature |
| 20 | Crate as framed window metaphor | Container metaphor is clearer and more visceral |
