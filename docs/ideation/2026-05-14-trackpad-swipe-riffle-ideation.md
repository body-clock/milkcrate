---
date: 2026-05-14
topic: trackpad-swipe-riffle
focus: Trackpad swipe gesture support for riffling through crates in crate-view card-stack navigation
mode: repo-grounded
---

# Ideation: Trackpad Swipe for Crate Riffling

## Grounding Context

**Codebase Context:**
- Milkcrate — Rails 8.1 + Inertia React + TypeScript record-browsing app
- Key component: `CrateView` (`app/frontend/components/crate_view.tsx`) — card-stack browser with up/down navigation via keyboard arrows, Framer Motion drag gesture (72px threshold, 8deg/120px rotation), and paginator buttons
- AnimatePresence entry/exit with direction-based motion; progress bar with record counter
- Viewport tiers: compact (≤767px), comfy (768–1023px), wide (≥1024px)
- Motion token system: `springTactile` (300/26), `springPress` (400/28), `springFlip` (260/24), `springDrawer` (300/32) in `app/frontend/lib/motion_tokens.ts`
- Design: tactile, warm, reduced-motion-first
- Existing gesture hint: "Swipe or use arrows to browse · tap for details" on compact

**Past Learnings:**
- `navigate(delta)` returns void, dismisses gesture hint — trackpad handler follows same pattern
- Touch hover flash fixed via `pointerType === "mouse"` gating — trackpad emits wheel events, not pointer events
- Trackpad two-finger swipe emits wheel events in pixel mode (`deltaMode === DOM_DELTA_PIXEL`); mouse scroll wheel emits line/page mode
- Must use raw `addEventListener("wheel", handler, { passive: false })` since React's onWheel may be passive
- Animation token system requires all springs through `motion_tokens.ts`; lint scanner flags inlines

**Topic Axes:**
1. Gesture mechanics — input detection, delta accumulation, thresholding
2. Animation feel — momentum, spring velocity, rotation, reduced-motion
3. Gesture-discoverability UX — affordance/hint for trackpad riffle
4. Input conflict handling — coexistence with drag, scroll passthrough
5. Scope & surface — which views, horizontal vs vertical per tier

## Ranked Ideas

### 1. `useWheelSwipe` Hook — Reusable Gesture Primitive

**Axis:** Gesture mechanics
**Basis:** `direct:` `handleDragEnd` at crate_view.tsx uses threshold + `navigate()` callback — the wheel equivalent is a direct structural analog. `direct:` macOS Photos, Finder column view, and Music.app album browser use the two-finger horizontal swipe pattern.
**Description:** Extract wheel-delta-to-navigation into a dedicated `useWheelSwipe` hook. Accumulates wheel deltas (pixel mode only — `deltaMode === DOM_DELTA_PIXEL`), applies a configurable threshold, and fires a callback when threshold is crossed. Registered via raw `addEventListener("wheel", handler, { passive: false })` inside a `useEffect` with cleanup. Container-agnostic — once built, any sequential view (gallery, artist discography, search results) gets trackpad riffle for one import.
**Rationale:** One investment unlocks trackpad browsing across the entire product surface. Composes with existing gesture-primitives direction from prior ideation work. Replaces the current one-off drag-handler pattern with a reusable primitive.
**Downsides:** Non-passive listener blocks compositor scrolling — must scope to the card-stack container (already has `touchAction: "none"` and `overscrollBehavior: "contain"`). Must handle cleanup across crate switches. Mouse scroll wheel in line/page mode must be excluded to pass through for page scrolling.
**Confidence:** 85%
**Complexity:** Medium

### 2. Velocity-Driven Multi-Card Skip (Veloci-Riffle)

**Axis:** Gesture mechanics
**Basis:** `direct:` Crate view already uses `info.offset` from Framer Motion for rotation — continuous gesture math is wired. `external:` macOS fast-scroll (skip N pages on fast scroll) and variable-speed video scrubbing (YouTube, QuickTime) are established platform patterns users already expect.
**Description:** Map swipe velocity to skip distance through a logarithmic power curve. Slow deliberate swipes (< 300px/s) advance 1 record. Moderate swipes (600–900px/s) skip 3–4 records. Fast flicks (≥ 1200px/s) skip 8–12 records. Works as a layer on the delta accumulator. Single exported function `riffleSkip(velocity, crateSize)` in a gesture config module.
**Rationale:** Binary card-by-card navigation underrepresents trackpad's primary value — variable-speed control. A velocity curve transforms the crate from a paginator into a true riffle where users can slow-browse or fast-skim with the same gesture.
**Downsides:** Wheel-event velocity is noisier than pointer — must derive from `deltaX` timestamps, not `info.velocity`. Preload window (`WINDOW_RADIUS = 2`) needs dynamic expansion during fast skips. Max skip cap needed to prevent loss of context.
**Confidence:** 70%
**Complexity:** High

### 3. `springRiffle` — First-Class Motion Token

**Axis:** Animation feel
**Basis:** `direct:` `crate_view.tsx:25` inlines `ROTATION_FACTOR = 8/120` — a magic constant outside the token system that already exists. `direct:` `springFlip` (260/24) at `motion_tokens.ts:22-25` is the closest existing token but is tuned for card-flip (heavier), not riffle (more responsive). `direct:` The `motionPreset` factory at `motion_tokens.ts:68-93` establishes the abstraction pattern.
**Description:** Add a `springRiffle` token (stiffness 280, damping 22 — slightly looser than `springFlip`) to `motion_tokens.ts`. Absorbs the rotation factor constant and the reduced-motion collapse. The `motionPreset("riffle")` factory entry becomes the single source of truth for riffle feel. Under `prefers-reduced-motion`, collapses to the reduced-motion transition automatically.
**Rationale:** Centralizes the riffle feel in one place — designer tunes one number, all consumers update. Fixes an existing inline-constant smell (`ROTATION_FACTOR`) that should have been in the token system since day one. Reduced-motion behavior is inherited from the token pattern automatically.
**Downsides:** Adds to the token surface area. Lint scanner currently checks only inline stiffness/damping, not inline ratio constants — may need a minor update.
**Confidence:** 90%
**Complexity:** Low

### 4. Gesture Arbitration Layer — Cooperative Input Sourcing

**Axis:** Input conflict handling
**Basis:** `direct:` CrateView already has 3 independent input paths — `handleKeyDown`, `handleDragEnd`, button `onClick` — all calling `navigate()` with duplicated logic. The wheel path would be the 4th, making the arbitration need explicit. `reasoned:` Without arbitration, the "Phantom Threshold" problem arises where wheel accumulator and drag gesture enforce independent gates, creating a dead zone.
**Description:** Normalize all input sources into a shared `GestureIntent { delta, source, timestamp }` type. Each input adapter (wheel, keyboard, pointer drag, button) normalizes into this type and feeds a shared `navigate()` core. Last-source-wins model with a 200ms cooldown per source to prevent oscillation between competing inputs. Wheel and drag cease to compete because the layer owns the decision.
**Rationale:** Every input path currently duplicates threshold/decision logic. Arbitration centralizes it. Directly addresses the input-conflict axis — wheel events, drag events, and scroll events stop competing. The oscilloscope trigger+holdoff pattern from cross-domain analogy provides the signal-processing foundation.
**Downsides:** Adds abstraction overhead. Value scales with input method count — may feel over-engineered if wheel is the only addition. Must ensure arbitration latency doesn't exceed frame budget.
**Confidence:** 75%
**Complexity:** Medium-Low

### 5. Reduced-Motion-Aware Riffle Protocol

**Axis:** Animation feel
**Basis:** `direct:` `crate_view.tsx:298-301` already defines `reducedCardEase = { duration: 0.24, ease: "easeOut" }` and uses `prefersReducedMotion` throughout. `direct:` `reducedMotionTransition` and `REDUCED_MOTION_SCALE`/`LIFT`/`TILT` at `motion_tokens.ts:44-56` provide the collapse infrastructure.
**Description:** Define explicit reduced-motion behaviors for the trackpad riffle. Under `prefers-reduced-motion: reduce`, the riffle uses opacity-based crossfade (entering card fades in over 0.24s, exiting fades out) instead of spring Y-offset + rotation. No momentum feedback. HandleNavigation already has reduced-motion handling — this extends it to the wheel path. Preserves spatial direction awareness without spring motion.
**Rationale:** Without explicit reduced-motion handling, the riffle gesture works but feels disorienting (sudden card pops with no direction sense). A dedicated crossfade preserves spatial awareness without violating motion preferences — critical since ~30% of users have `prefers-reduced-motion` set.
**Downsides:** Every future riffle feature must check reduced-motion and branch. Crossfade needs testing to ensure it doesn't cause vestibular issues (different trigger thresholds than spring motion).
**Confidence:** 80%
**Complexity:** Low

### 6. Gesture-Discoverability Strategy for Trackpad Riffle

**Axis:** Gesture-discoverability UX
**Basis:** `direct:` `showGestureHint` state at `crate_view.tsx:169` and permanent mobile hint text at line 361-363 already exist. `direct:` The "One-Time Gesture Hint" idea from 2026-05-13 crate-view-mobile-space ideation (#6) proposed this same progressive-disclosure pattern and was accepted in principle.
**Description:** Three-layer discoverability: (1) On FIRST VISIT, a 3-frame auto-riffle animation cue with a subtle "↕ Swipe to riffle" overlay that fades after 3 seconds (dismissed permanently after first gesture). (2) A trackpad swipe icon glyph between "front of crate / back" labels on desktop — replaces the generic text hint. (3) Reference in a hidden `/help` keyboard/gesture panel. Honors reduced-motion: skip animation cue, show static glyph only.
**Rationale:** Trackpad gestures are invisible capabilities — users cannot find them by scanning the UI. Active discoverability (brief animation cue + persistent icon) makes the capability manifest without permanent instructional copy or overlay modals. The existing code already has the right hooks (`showGestureHint`, gesture hint rendering).
**Downsides:** Animation cue needs precise timing — too fast→unnoticed, too long→annoying. Trackpad glyph may be unrecognizable to Windows/Linux desktop users (use a simple two-finger swipe icon, not macOS-specific). Reduces to static hint under reduced-motion.
**Confidence:** 80%
**Complexity:** Low

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Recoil Navigation (inverted swipe direction) | Too confusing — fights conventional two-finger scroll muscle memory |
| 2 | Zero-Threshold Trackpad | Dangerous — no threshold means accidental triggers from casual hand rest on trackpad |
| 3 | Buttonless Trackpad-Primary Crate | Too aggressive — removes buttons, breaks keyboard-only navigation perception |
| 4 | Auto-Advance with Swipe-to-Return | Too novel — auto-advancing default violates "tactile, warm" ethos (feels algorithmic) |
| 5 | Full Scroll Override (capture ALL wheel events) | Too aggressive — breaks page scroll when crate is open, violates platform scroll convention |
| 6 | The Slow Turn (0.5s spring per card) | Too sluggish — 0.2s is already "tactile"; 0.5s would feel slow for scanning |
| 7 | The Elastic Deck (physics compression feedback) | Too expensive — continuous physics calc per wheel frame, high implementation burden for marginal gain |
| 8 | The 5000-Record Crate (log. acceleration, HUD) | Scope overrun — solves a problem that doesn't exist yet (crate sizes ≤50) |
| 9 | Thumbnail Filmstrip / Browse Strip | Scope overrun — new visual component w/ layout implications across all tiers; doesn't serve the core ask |
| 10 | Zoetrope/Praxinoscope persistence-of-vision overlay | Too speculative — novel rendering approach, high complexity risk |
| 11 | Book Edge Riffling / Edge Fan visualization | Too expensive — significant rendering investment for marginal improvement over card-flip |
| 12 | Reel-to-Reel Continuous Scrub | Too novel — replaces discrete card-flip model, changes CrateView interaction contract |
| 13 | Density-Adaptive Thresholds | Duplicates #4 — threshold tuning belongs in arbitration config, not standalone |
| 14 | Platform-Normalized Swipe Intent | Too speculative — platform detection from wheel events is unreliable; defer until cross-platform testing |
| 15 | Riffle Resumability via Scroll Snapshots | Scope overrun — solves session-resume friction not asked for |
| 16 | Continuous Riffle Mode / Flipbook | Duplicates #2 — Velocity Skip achieves same without mode toggle complexity |
| 17 | Gesture Gate "Riffle Mode" Toggle | Too heavy — adds persistent UI toggle when gesture should be ambient |
| 18 | Slot Machine Reel Deceleration | Duplicates #2's velocity curve approach with more complexity (weighted inertia vs power curve) |
| 19 | Two-Finger Vertical + Horizontal Smart Jump | Scope overrun — adds skip-jumping to gesture; user asked for riffle, not advanced navigation |
| 20 | Cover Flow Peek Animation | Viable but lower priority — nice-to-have animation polish, defer to implementation |
| 21 | Scroll Hijack Backlash (accessibility) | Risk, not an idea — documented as constraint on #5 and #4 |
| 22 | Orphaned Scrollbar | Implementation consideration — part of #1's passive listener scoping |
| 23 | Inertia Mismatch (momentum chatter) | Risk, not an idea — implementation detail for #1 and #3 |
| 24 | Horizontal/Vertical Polarity Trap | Decision, not an idea — choose vertical-for-all (safe default) and implement per #1 |
| 25 | Cooperative Gesture Arbitration | Superseded by #4 (stronger, more specific version) |
| 26 | Oscilloscope Triggered Sweep | Signal-processing insight folded into #4's arbitration layer |
| - | axis: Scope & surface | Deliberate gap — bounded by the explicit ask (CrateView across all tiers). Per-tier orientation decision is an implementation choice, not a standalone idea. |
