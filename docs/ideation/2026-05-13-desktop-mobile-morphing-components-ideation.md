---
date: 2026-05-13
topic: desktop-mobile-unification-morphing-components
focus: Unify desktop and mobile experience with self-contained morphing components; audit differences; create domain language for spatial adaptation; avoid overcomplication
mode: repo-grounded
---

# Ideation: Unifying Desktop & Mobile with Self-Contained Morphing Components

## Grounding Context

**Project:** Milkcrate — Rails 8 + Inertia React + TypeScript app for browsing Discogs seller inventories as curated crates.

**Current responsive state:** Three-tier ViewportProvider (compact ≤767px / comfy 768-1023 / wide ≥1024px) with useViewport() hook. Components use a mix of JS branching and Tailwind responsive utilities with no clear ownership boundary. --mc-viewport-tier CSS property is set on :root but unused. RecordCard flip disabled on mobile in CrateView but enabled on StoreFloor. PileSheet: right drawer on desktop, bottom sheet on mobile (two render paths). StoreFloor: grid vs horizontal scroll per tier. No responsive images. DESIGN.md has no responsive section.

**Product strategy:** "Make online record browsing feel like walking into a record store — spatial bins, walls, genre sections." Key metrics: outbound Discogs clicks, items added to pile, depth of exploration per session.

**Past learnings:** ViewportContext architecture doc (three-tier named tiers), animation token system (four-layer motion vocabulary), guard-condition drift bug cautionary tale, crate strategies pattern.

## Topic Axes

1. **Spatial vocabulary** — naming/domain language for how components describe their adaptation
2. **Component architecture** — how components own their responsive range (self-contained vs parent-driven)
3. **Interaction model** — touch vs pointer, flip vs panel, hover vs press
4. **Viewport infrastructure** — breakpoints, CSS bridge, provider patterns
5. **Visual adaptation** — layout, content density, imagery, sizing across tiers

## Ranked Ideas

### 1. Container-Query Adaptation Engine
**Description:** Replace viewport-tier JS branching with CSS Container Queries. Each component wraps itself in `container-type: inline-size` and uses `@container` queries to drive layout, visibility, and spacing. The ViewportProvider becomes read-only (for analytics/JS-only needs), not the layout decision-maker. Components adapt to their *own available width*, not the viewport width. This makes a RecordCard in a narrow sidebar, a modal, or a full-width grid behave correctly without any prop coordination.
**Axis:** Viewport infrastructure → Component architecture
**Basis:** `direct:` — `--mc-viewport-tier` exists but is unused; guard-condition drift bug is documented; components like RecordCard behave differently based on which parent renders them, a code smell container queries eliminate
**Rationale:** Kills the dual-system problem (JS context + Tailwind utilities) with one CSS mechanism. Components become truly portable — dropped anywhere, they adapt to that container. No more re-render cascades when crossing breakpoints. Container queries are stable across all target browsers (Chrome 105+, Firefox 110+, Safari 16+).
**Downsides:** Adoption means untangling existing JS branches; some layout decisions (like grid vs scroll) may still need a minimal JS wrapper; learning curve for devs unfamiliar with container queries
**Confidence:** 80%
**Complexity:** Medium
**Status:** Explored

### 2. Spatial Roles as Executable Vocabulary
**Description:** Surface the spatial language from STRATEGY.md (`wall`, `shelf`, `bin`, `display`) as CSS custom properties and component props. A `<Section role="wall">` wrapper tells child components what spatial role they inhabit. RecordCard reads `--mc-section-type` to decide its density, flip availability, and metadata treatment. The layout pattern per role is defined in one place (e.g., walls are scrollable on compact, grids on wide). This makes the product strategy executable in code.
**Axis:** Spatial vocabulary
**Basis:** `direct:` — STRATEGY.md says "spatial bins, walls, genre sections" but this vocabulary is absent from code; StoreFloor has 3+ bespoke section implementations that duplicate the same responsive pattern choices
**Rationale:** Closes the gap between product language and code. Adding a new section type (e.g., "listening station") becomes declaring the role and its per-tier layout — no new component needed. The `--mc-viewport-tier` property gains a sibling `--mc-section-type` that components already know how to read.
**Downsides:** Requires a migration pass on StoreFloor sections; the vocabulary must be maintained as code convention
**Confidence:** 75%
**Complexity:** Low
**Status:** Unexplored

### 3. Self-Adapting RecordCard
**Description:** RecordCard (and all content components) own their full responsive range internally via container queries. The card reads its own rendered width and selects between three modes: **cover** (narrow — art only), **peek** (medium — art + title/price overlay, tap to reveal back face as overlay), **full flip** (wide — existing Rotation3D with all metadata). No parent passes `disableFlip` or `compact` props. The card's adaptation is intrinsic to itself, not imposed by its parent.
**Axis:** Component architecture
**Basis:** `direct:` — RecordCard flip is disabled on mobile in CrateView but enabled on StoreFloor — an inconsistency that requires every parent to know about flip policy; the documented guard-condition drift bug proves this pattern fails under refactoring
**Rationale:** Eliminates the parent-child coupling that caused the documented bug. Components become portable: a RecordCard in search results, a wishlist, or a sidebar works correctly without wiring. The three-stage model (cover → peek → full) adds a middle ground that mobile users actually need — a lightweight detail interaction without jumping to a different view.
**Downsides:** Adds a new interaction pattern (peek) that needs UX validation; may feel different from the current binary flip behavior users are used to
**Confidence:** 70%
**Complexity:** Medium
**Status:** Unexplored

### 4. Unified Pointer Contract
**Description:** A single `useInteraction()` hook that normalizes touch, mouse, and pointer events into semantic actions: `onSelect(item)`, `onReveal(item)`, `onOpen(item)`. Components respond to the *semantic action*, not the device type. The hook reads viewport tier + pointer type to determine the right gesture mapping (tap = select on touch, click = select on mouse, hover = reveal, long-press = context). No component ever checks `isCompact` or `isTouchDevice()` for interaction logic.
**Axis:** Interaction model
**Basis:** `direct:` — PileSheet uses `isCompact` to choose drawer vs bottom-sheet entry direction; RecordCard uses `isCompact` as a proxy for "touch device"; both are incorrect for tablets with keyboards, foldables in laptop mode, or desktop windows narrowed for side-by-side use. Viewport tier ≠ input modality.
**Rationale:** Separates two orthogonal concerns (available width vs input modality) that are currently conflated under `isCompact`. Gives correct interaction behavior on every device class without per-component branching. The hook is the single place where gesture detection lives.
**Downsides:** Adds a new abstraction layer; needs testing across pointer types; the flip three-stage model (from idea #3) should compose with this cleanly
**Confidence:** 75%
**Complexity:** Low
**Status:** Unexplored

### 5. Persistent Pile Object
**Description:** Replace the PileSheet modal (open/close state, backdrop, focus trap, escape handler, two render paths) with an always-visible, self-morphing element. On compact: a small collapsed stack in the bottom corner showing 1-3 cover thumbnails with a count badge. On comfy/wide: a visible side panel with the full list. No `AnimatePresence`, no backdrop, no open/close state machine — the pile is *always on the counter.* CSS `--mc-viewport-tier` drives the shape; a tap on compact expands the stack in-place without a modal overlay.
**Axis:** Spatial vocabulary / Interaction model
**Basis:** `direct:` — PileSheet is 73 lines of JSX with open/close state, escape handler, focus management, two `className` blocks, two animation configs; documented to have had an animation swap bug during responsive migration. Physical record stores don't hide your pile in a drawer — you leave records at the counter where you can see them.
**Rationale:** Eliminates a known bug surface (modal state machine, animation swap bugs). Makes the pile feel tangible and persistent, matching the "walk into a record store" feel. Simplifies testing — always rendered, always in the DOM, no open/close toggling. The morph is pure CSS.
**Downsides:** Changes user expectation (pile is always visible, not summoned); the expanded-in-place mode on mobile needs careful design to avoid covering too much content; accessibility of an always-visible panel needs consideration
**Confidence:** 65%
**Complexity:** Medium
**Status:** Unexplored

### 6. layoutId Animation Bridge for Tier Transitions
**Description:** Assign framer-motion `layoutId` to record/crate elements so they animate smoothly when the layout reflows across breakpoints. Currently StoreFloor renders completely separate markup trees for compact (horizontal scroll) and !compact (grid) — crossing 768px unmounts one and mounts the other with zero animation. With `layoutId` on each record, the elements animate to their new position when the layout shifts. This makes breakpoint crossings feel like the same physical space rearranging, not a jarring layout blink.
**Axis:** Visual adaptation
**Basis:** `direct:` — StoreFloor renders two separate DOM trees for compact vs !compact; Home.tsx has the same pattern with `hidden sm:grid` / `flex sm:hidden`; framer-motion `layoutId` is not used anywhere despite being the exact solution for this problem
**Rationale:** Highest-leverage animation investment — fixes ALL tier-transition discontinuities at once, not per-component. Makes the spatial metaphor work at the moment the user is most likely to notice it (orientation change, window resize). One `layoutId` assignment per card gives smooth morphing across the entire app.
**Downsides:** Requires careful `layoutId` uniqueness (must be stable per item, not per position); framer-motion's `layout` animations can have performance cost with many items; needs testing on mobile
**Confidence:** 70%
**Complexity:** Low
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Morph Continuum (continuous clamp()) | Too complex — removes the tier system entirely; "avoid overcomplication" veto |
| 2 | The One-Page Record Store | Scope overrun — replaces page structure instead of operating within it |
| 3 | No Breakpoints, Just Fluidity | Scope overrun — loses the proven three-tier system the team invested in |
| 4 | Chromatophore Composition | Too complex for practical value — interesting metaphor but overengineered |
| 5 | Non-Euclidean Portal Connections | Overcomplication — single-axis morph is simpler than portal abstractions |
| 6 | CSS-Powered Morphing Engine | Duplicates Container-Query Adaptation Engine (idea #1) but less focused |
| 7 | Component Declares Its Own Morph Contract | Duplicates Self-Adapting RecordCard (idea #3) with more ceremony |
| 8 | Tactile-First Mobile Inversion | Overcomplication — adds deviceorientation API dependency for marginal gain |
| 9 | Flip Interaction as Three-Stage Morph | Merged into Self-Adapting RecordCard (idea #3) — same concept, stronger framing |
| 10 | Standardized Crate Binning | Interesting but better as a brainstorm variant than standalone ideation |
| 11 | Traveling Exhibition Venue Wrapper | Duplicates Container-Query/Adaptation concepts with more ceremony |
| 12 | Adaptive Infill Shell (Architecture) | Clever but overcomplicated — CSS custom properties already solve this directly |
| 13 | Optical Master Components | Duplicates Self-Adapting RecordCard pattern with more ceremony |
| 14 | Shelf Density — Continuous Content | Interesting but needs DESIGN.md first; can't act without design foundation |
| 15 | Distance-to-Content Vocabulary (far/near/in-hand) | Creative but harder to adopt than spatial roles; overcomplicates the naming |
| 16 | Browse Mode as Domain Concept (scan/dig/examine) | Most compelling rejected idea — merges well with Spatial Roles; consider for brainstorm |
| 17 | Viewport × Pointer Interaction Contract | Merged into Unified Pointer Contract (idea #4) |
| 18 | Zen Rock Garden Spatial Priority | Interesting metaphor but CSS priority-based approach adds complexity over direct CQ |
| 19 | The Living Record — One DOM | Too radical and complex — violates "avoid overcomplication" |
| 20 | The Card That Knows Where It Lives (zone detection) | Overcomplication — IntersectionObserver + ResizeObserver per component is too heavy |
| 21 | The Physical Shelf — Scroll-Container-as-Room | Interesting but better as a brainstorm direction for spatial vocabulary |
| 22 | Mobile-First Base, Desktop as Scale-Up | Clean idea but contradicts the desktop-first history; spatial roles handle this better |
| 23 | Stack Touch — Spatial Memory Across Resize | Gentle polish idea but scope is too narrow for this ideation; better as a follow-up |
| 24 | Data-Driven Spatial Role | Merged with Spatial Roles as Executable Vocabulary (idea #2) |
