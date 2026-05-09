---
date: 2026-05-07
topic: storefront-animation-cohesion
focus: Unify storefront animations for cohesive tactile feel — wall picks tilt/flip, genre crates just scale, crate view is great
mode: repo-grounded
---

# Ideation: Storefront Animation Cohesion

## Grounding Context

**Codebase:** Rails 8 + Inertia.js + React 19 + TypeScript + Framer Motion 12.38. Dark-mode-first design with warm charcoals, oxblood accent, serif typography. Storefront page (`StoreFloor`) has three sections: picks wall (cover grid with ±1.5° tilt + scale on hover, flip on click), featured crates (`CrateCard` with thumbnail grid scaling 1.05 on hover), and genre grid (same `CrateCard`). `CrateView` has a complex riffle-stack animation with drag navigation and depth layers. All animations use framer-motion springs — but with slightly different parameters per component (stiffness 260-300, damping 22-32). The STRATEGY.md "Digital storefront character" track explicitly calls for a spatial, character-driven experience.

**Key gap:** The wall has a "physical object" tactile vocabulary (tilt → flip). Genre crates have a generic "UI element" vocabulary (scale-only). No shared physics, no shared tactile language.

**Past specs:** `crate-animation-spec.md` (riffle stack spec), `homepage-redesign-design.md` (tactile vision), `front-riffle-crate-design.md` (browsing as physical experience), `mvp-store-platform.md` (single scrollable page like walking a store).

**External context:** Apple HIG treats motion as a meaning-maker; Material Design defines motion tokens alongside color/typography; Stripe's pointer-relative card tilt is a known pattern; Linear uses unified subtle hover-scaling as an interaction language; framer-motion's `MotionConfig` supports tree-level defaults.

## Topic Axes

1. **Hover response language** — What happens when a pointer lands on any storefront element
2. **Click/commit gesture** — What happens on click/tap (flip vs navigate vs open)
3. **Element motion identity** — How cover art, crate bins, and section headers express their nature through motion
4. **Spatial relationship cues** — How motion communicates the wall is a display surface and the crate grid is a floor layout
5. **Physics backbone** — Shared spring parameters, easing curves, timing constants

## Ranked Ideas

### 1. Unified Tactile Object Language
**Description:** Every interactive element on the storefront shares a single physical-object behavior model. Covers tilt on approach like records you're handling; crate bins tilt+open like containers; section elements respond to proximity. Built on a shared `TactileCard` wrapper component and a `MotionConfig` provider — write the behavior once, use it everywhere.
**Axis:** Hover response language (primary), Element motion identity, Physics backbone
**Basis:** `direct:` The wall (`store_floor.tsx:43`) uses `whileHover={{ rotate: tilt, y: -3, scale: 1.05 }}` and `RecordCard` (`record_card.tsx:59`) uses `rotateY: 180` flip — these are the right tactile direction. Crate thumbnails (`crate_card.tsx:77`) only use `whileHover={{ scale: 1.05 }}` — generic, no tilt, no lift, no press-down. The disconnect is literal: one set of props vs another. Unifying them means all storefront elements use the same spring-backed transform vocabulary (tilt, lift, scale) applied through a shared component.
**Rationale:** The user's complaint is that crates "get a little bit bigger when you hover over them — that feels disconnected from the tilt on the wall." The fix isn't adding tilt to crates as a one-off — it's defining one "how things feel when you touch them" language and applying it uniformly. A `TactileCard` wrapper also means any future storefront element inherits the tactile vocabulary automatically.
**Downsides:** Requires careful tuning to avoid motion sickness on crates with many thumbnails. The crate-as-container identity (idea #4) adds a wrinkle — crates should feel different from covers, but within the same physics universe.
**Confidence:** 90%
**Complexity:** Medium (new component + hook, refactor ~3 existing components)
**Status:** Unexplored

### 2. Cursor Proximity Gravity Field
**Description:** Instead of binary hover states (on/off), elements respond to cursor distance with a gradient of tilt and scale. The closer the cursor, the more an element "pays attention." Multiple nearby elements respond simultaneously — the wall becomes a living surface where approach matters, not just arrival. The technical approach: a `useTactileHover` hook that reads pointer position relative to the element center and returns continuous transform values.
**Axis:** Hover response language
**Basis:** `external:` Apple's visionOS spatial UI paradigm where elements respond to gaze proximity (not binary focus), and Stripe's payment UI where cards tilt toward the cursor dynamically. `reasoned:` The wall's current alternating ±1.5° tilt is a hardcoded binary — every other card tilts left, every other tilts right. Pointer-relative tilt is both more natural (things lean toward you) and applicable to any element shape.
**Rationale:** Binary hover is the root cause of the "disconnected" feeling — wall cards do one thing on hover, crates do another, and they feel like different interaction paradigms. A continuous proximity model means every element responds to cursor approach with the same gradient, but the magnitude of response varies by element type.
**Downsides:** Slightly more expensive than binary hover (pointermove listener). Needs dead zones so elements don't vibrate from micro-movements. On touch devices, falls back to `whileTap`.
**Confidence:** 80%
**Complexity:** Low-Medium (one reusable hook)
**Status:** Unexplored

### 3. Press-Down → Commit Gesture Chain
**Description:** Unify what happens on click/tap across the storefront. Every interactive element gets a subtle press-down state (scale 0.97, slight shadow deepening) before its commit action fires — flip for wall cards, navigate for crate thumbnails, open for crate bins. The storefront→crate-view transition gains a spatial "zoom into bin" animation rather than an abrupt React state toggle. Inspired by card magic flourishes — a tiny bounce at the end of the flip makes the reveal feel delightful.
**Axis:** Click/commit gesture
**Basis:** `direct:` Wall cards (`wall.tsx:16`) call `setFlipped` immediately on click — no intermediate tactile state. Crate thumbnails (`crate_card.tsx:83`) fire `onSelectCrate` immediately. The crate view transition (`featured.tsx:49`) is `setActiveSlug(slug)` — instant DOM swap. `external:` Cardistry flourishes give card reveals a satisfying physicality — a tiny overshoot and settle on the flip.
**Rationale:** Wall covers flip (physical, satisfying). Crate thumbnails just navigate (functional, sterile). Adding a shared press-down moment before the divergent actions creates a shared tactile "yes, I'm doing something" beat.
**Downsides:** Press-down adds ~150ms of perceived latency to every click. The zoom-into-bin transition requires coordinating React state with framer-motion `AnimatePresence` exit animations.
**Confidence:** 85%
**Complexity:** Medium-High
**Status:** Unexplored

### 4. Crate-as-Container Motion Identity
**Description:** Genre crates stop behaving like generic UI cards and start behaving like containers. On hover, the entire crate card tilts slightly (using the same `useTactileHover` hook) and its top edge "opens" — a subtle lid-lift effect via `transformOrigin: "top"` and `scaleY`. The four thumbnail records inside animate as a group with subtle parallax, not as independent `whileHover` targets. The "DIG →" label gets a spring-based slide-in.
**Axis:** Element motion identity
**Basis:** `direct:` Crate thumbnails (`crate_card.tsx:77`) each have their own `whileHover={{ scale: 1.05 }}` — they animate independently, competing for attention. `reasoned:` A crate in a record store is a container you open, not four records laid on a table. The motion personality should communicate "this is a bin of records."
**Rationale:** Wall covers and crate bins shouldn't have the same animation because they're not the same kind of thing. Covers are flat objects you handle; crates are containers you open. But they should share the same physics so the difference reads as identity rather than inconsistency.
**Downsides:** The "lid opening" effect needs to work at multiple crate card sizes. Over-engineering risk if the effect is too subtle to notice.
**Confidence:** 75%
**Complexity:** Medium
**Status:** Unexplored

### 5. Motion Design Token System
**Description:** Extract shared animation parameters into a design token layer that sits alongside the existing color/typography tokens. Three layers: CSS custom properties in the tailwind theme (`--mc-spring-stiffness`, `--mc-spring-damping`, `--mc-duration-hover`), a TypeScript constants module (`motion_tokens.ts`), and a `StorefrontMotionConfig` provider that wraps the storefront page with framer-motion's `<MotionConfig>` for tree-level spring defaults and centralized `useReducedMotion` handling.
**Axis:** Physics backbone
**Basis:** `direct:` Spring parameters vary across the codebase — `stiffness: 260, damping: 24` (RecordCard), `stiffness: 300, damping: 22` (wall picks, crate thumbnails), `stiffness: 300, damping: 32` (PileSheet drawer). These are close but not identical — subtle differences that create inconsistency. `direct:` `useReducedMotion` is only called in `crate_view.tsx`; wall and crate cards don't check it.
**Rationale:** This is the infrastructure that makes all other ideas stick. Without a token system, unifying animations means copy-pasting magic numbers. With tokens, changing the "store feel" from snappy to smooth is one value change. The existing color token system proves the pattern works in this codebase.
**Downsides:** Small upfront cost. Tokens that are never changed are overhead. But the payoff is making ideas #1-4 maintainable.
**Confidence:** 95%
**Complexity:** Low
**Status:** Unexplored

### 6. Ambient Store Aliveness
**Description:** Add subtle, constrained ambient micro-animations so the page feels inhabited rather than static. Cover art has a barely-perceptible "breathing" pulse — a 2px scale oscillation over ~8 seconds, like a record spinning slightly off-center. Section dividers have a gentle accent-color glow pulse. The genre grid background shifts color temperature by ~2% over time. All ambient motion is disabled by `prefers-reduced-motion: reduce` and uses CSS animations for performance.
**Axis:** Element motion identity, Spatial relationship cues
**Basis:** `external:` Pinball machines in attract mode — subtle light pulses and element movement that make the machine feel "alive" and inviting. `external:` Apple's "breathing" LED indicator — a slow, organic pulse that communicates presence without demanding attention. `reasoned:` The user said "things should move around and feel fun, not totally sterile." Ambient motion addresses the "sterile" part without competing with interactive animations.
**Rationale:** The storefront currently sits perfectly still until you hover something. A record store is never perfectly still. Ambient motion gives the page a baseline "aliveness" that interactive animations build on.
**Downsides:** Risk of being distracting or cheesy. Must be tuned to just below conscious perception. Some users strongly dislike non-interactive animation. `prefers-reduced-motion` must gate everything.
**Confidence:** 65%
**Complexity:** Low
**Status:** Unexplored

### 7. Spatial Scroll Choreography
**Description:** As the user scrolls the storefront, sections enter with staggered animations that communicate spatial layout: wall tiles cascade in from above (eye-level display), featured crates "settle" into place with a slight bounce (placing a crate on the floor), genre bins "stack up" from below with increasing stagger (bins on the floor). Combined with subtle parallax between section backgrounds, scrolling feels like walking through the store.
**Axis:** Spatial relationship cues
**Basis:** `direct:` The MVP store platform spec (`mvp-store-platform.md`) describes the page as "Linear flow through space, like walking through a real store" with sections representing different physical zones. `reasoned:` Scroll-driven animation reinforces the spatial metaphor that's already in the content structure.
**Rationale:** Individual hover/click animations (ideas #1-4) make individual elements feel physical; scroll choreography makes the page feel like a place. Together they create the full "walking into a record store" experience.
**Downsides:** Scroll-driven animations can feel performative if overdone. Stagger delays add perceived latency to content visibility. Should be subtle — the user shouldn't consciously notice the stagger.
**Confidence:** 70%
**Complexity:** Medium
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| - | Remove crate hover animations entirely | Contradicts user intent — they want more tactile feel, not less |
| - | All crates use wall's tile+flip model | Loses element identity — crates and covers are different things |
| - | Full physics simulation (Matter.js) | Implementation burden too high relative to value |
| - | Weather/time-of-day motion personality | Scope overrun — adds a dimension beyond the asked focus |
| - | Motion debug storybook page | Below meeting-test — developer tool, not user-facing experience |
| - | CSS-only transitions for simple effects | Below meeting-test for this topic — small optimization, not a design shift |
| - | "DIG →" label motion | Too narrow — absorbed into crate-as-container idea |
| - | No visual sections (continuous surface) | Loses useful structure; the wall/genre distinction is intentional |
| - | Jenga neighbor settlement on selection | Interesting but high complexity; absorbed into gravity field as future variant |
