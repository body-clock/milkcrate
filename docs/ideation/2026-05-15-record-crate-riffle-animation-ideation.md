---
date: 2026-05-15
topic: record-crate-riffle-animation
focus: intuitive mobile animation system that feels like flipping through a crate of records; swipe down moves forward, swipe up moves backward; guidance and performance matter
mode: repo-grounded
---

# Ideation: Record Crate Riffle Animation

## Grounding Context

### Codebase Context

- Milkcrate's strategy is to make online record browsing feel like browsing a physical record store, not a Discogs-style search table.
- Product docs describe the desired experience as warm, tactile, spatial, and exploratory.
- `app/frontend/components/crate_view.tsx` already has a front-riffle stack, compact/wide branches, keyboard arrows, vertical drag, a text gesture hint, image preloading, reduced-motion handling, and a progress bar.
- Current drag semantics use the dominant drag axis, so horizontal movement can still navigate even though the intended mental model is down/up.
- Current drag rotation is based on horizontal offset, which leaves the mostly vertical gesture under-expressed visually.
- Current hint text teaches that swiping exists, but not the important rule that down means forward and up means backward.

### Past Learnings

- `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md` establishes motion tokens, `StorefrontMotionConfig`, reduced-motion context, and tactile hooks as the local pattern.
- `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md` warns about touch hover flash and recommends touch-specific behavior instead of carrying hover effects onto touch.
- `docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md` emphasizes guard parity and pure contract testing after responsive or interaction refactors.

### External Context

- web.dev animation guidance recommends keeping high-performance animation on `transform` and `opacity`, avoiding layout/paint-triggering properties, and checking dropped frames: https://web.dev/articles/animations-guide
- MDN notes that `touch-action` defines which gestures the browser handles before pointer listeners run, and warns that `touch-action: none` can affect browser zoom accessibility if overused: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action
- Motion React drag docs support manual drag controls and note that child images still need `draggable=false`: https://motion.dev/docs/react-drag
- web.dev image performance guidance recommends correct image sizing, async decoding, and lazy loading where appropriate: https://web.dev/learn/performance/image-performance

## Topic Axes

1. Gesture semantics and input mapping
2. Tactile riffle motion language
3. User guidance and affordance
4. Performance and image pipeline
5. Accessibility and alternate controls

## Ranked Ideas

### 1. Record Riffle Engine

**Description:** Extract the core interaction into `useRecordRiffle` plus new riffle motion tokens. The engine owns down/up semantics, card-relative thresholds, edge resistance, direction state, reduced-motion behavior, and pure drag-commitment functions. `CrateView` becomes mostly rendering, while buttons, keyboard, and drag all call the same forward/backward contract.

**Axis:** Gesture semantics and input mapping

**Basis:** `direct:` `CrateView` currently owns drag thresholds, direction refs, hint visibility, visible windowing, image preloading, and navigation side effects in one component. The local animation-token solution documents tokens/provider/hook as the established pattern.

**Rationale:** This is the highest-leverage move because the riffle interaction will need tuning. Centralizing it prevents gesture, button, keyboard, and accessibility behavior from drifting apart.

**Downsides:** Medium refactor. Needs careful tests around bounds, direction, threshold, and reduced motion.

**Confidence:** 88%

**Complexity:** Medium

**Status:** Unexplored

### 2. First Swipe Lesson

**Description:** Teach the unusual gesture with one compact first-use lesson: a subtle ghost pull downward, direct copy such as "Pull down to dig forward. Push up to go back.", and contextual coaching only after failed short or horizontal gestures. Hide the full lesson after the user successfully riffles a couple records.

**Axis:** User guidance and affordance

**Basis:** `direct:` the current hint says "Swipe or use arrows to browse - tap for details", while the core desired rule is down-forward/up-back.

**Rationale:** The direction rule is the non-obvious part. A tiny animated demonstration plus direct language teaches the tactile behavior without turning the interface into instructions.

**Downsides:** Needs restraint so the hint does not obscure the record art or repeat annoyingly.

**Confidence:** 91%

**Complexity:** Low / Medium

**Status:** Unexplored

### 3. Compositor-First Stack

**Description:** During drag, update active-card position, adjacent-card reveal, edge glow, and stack resistance through Motion values or CSS variables, committing React state only after navigation. Keep the image/DOM budget bounded: active full cover, adjacent full covers, edge thumbnails, and no `O(records)` work.

**Axis:** Performance and image pipeline

**Basis:** `external:` web.dev recommends transform/opacity animations and avoiding layout/paint work for smooth animation. `direct:` `CrateView` already uses composited hint-card styles and a small `buildCrateWindow` radius.

**Rationale:** The tactile feel depends on frame pacing while a thumb is moving. This idea improves feel while matching the existing performance direction.

**Downsides:** Requires browser-level verification because jsdom cannot prove drag smoothness.

**Confidence:** 84%

**Complexity:** Medium

**Status:** Unexplored

### 4. Soundless Sleeve Physics

**Description:** Make the card feel like a record sleeve being thumbed through a crate using vertical-driven pitch illusion, adjacent sleeve edge reveal, shadow pressure, preview/commit detents, and a tiny accent pulse on commit. Avoid sound and avoid depending on vibration APIs.

**Axis:** Tactile riffle motion language

**Basis:** `direct:` current drag rotation comes from `info.offset.x`, but the desired gesture is primarily vertical. `reasoned:` mobile web can suggest tactility through visual weight and spring timing more reliably than hardware haptics.

**Rationale:** This is where the crate metaphor becomes felt. It turns a swipe detector into a record sleeve under the user's thumb without adding heavy layout work.

**Downsides:** The visual tuning will need hands-on mobile testing; too much pitch or pulse will feel gimmicky.

**Confidence:** 82%

**Complexity:** Medium

**Status:** Unexplored

### 5. Physical Crate Spine

**Description:** Replace or augment the horizontal progress bar with compact direction-aware orientation: front at the top, deeper/back at the bottom, and a small rail or spine that reacts during drag. Use it to reinforce that pulling down digs forward.

**Axis:** User guidance and affordance

**Basis:** `direct:` current progress labels are horizontal ("front of crate" to "back") while the primary gesture is vertical.

**Rationale:** Direction should be learned through the object, not just text. A crate spine can teach progress and movement in the same visual plane as the gesture.

**Downsides:** Layout risk on small mobile screens; should probably trail the first-swipe lesson unless the current progress bar proves confusing.

**Confidence:** 76%

**Complexity:** Medium

**Status:** Unexplored

### 6. Accessible Riffle Control Contract

**Description:** Define one shared language for the interaction: forward/deeper/down and backward/front/up. Use it in aria labels, keyboard behavior, button labels, tests, reduced-motion behavior, and analytics/debug events. In reduced motion, record changes should be immediate but direction and progress should remain clear.

**Axis:** Accessibility and alternate controls

**Basis:** `direct:` product docs require WCAG support and reduced-motion hooks. `StorefrontMotionConfig` exists, and current buttons/keyboard already mirror previous/next but not the user's "dig forward/back" language.

**Rationale:** A tactile feature still needs to work for keyboard, screen reader, and reduced-motion users. This idea makes accessibility part of the interaction contract instead of an afterthought.

**Downsides:** Some visible copy may need careful wording so it stays concise and not overly cute.

**Confidence:** 86%

**Complexity:** Low / Medium

**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Direction-specific hint copy | Strong, but folded into First Swipe Lesson. |
| 2 | Vertical-only navigation on compact | Strong, but folded into Record Riffle Engine. |
| 3 | Drag progress preview before commit | Strong, but folded into Compositor-First Stack and Soundless Sleeve Physics. |
| 4 | Edge resistance at front and back | Strong, but folded into Record Riffle Engine. |
| 5 | First-use ghost riffle | Strong, but folded into First Swipe Lesson. |
| 6 | Failed-gesture coaching | Strong, but folded into First Swipe Lesson. |
| 7 | Thresholds as card-relative values | Strong, but folded into Record Riffle Engine. |
| 8 | Align progress labels with gesture | Strong, but folded into Physical Crate Spine. |
| 9 | Continuous riffle motion values | Strong, but folded into Compositor-First Stack. |
| 10 | Remove horizontal navigation | Strong, but too narrow as standalone; folded into Record Riffle Engine. |
| 11 | Auto-hide guidance after mastery | Strong, but folded into First Swipe Lesson. |
| 12 | Decode-gated adjacent image readiness | Useful, but too implementation-specific as a top-level survivor; folded into Compositor-First Stack. |
| 13 | Single gesture state machine | Useful, but `useRecordRiffle` is a more concrete framing. |
| 14 | Riffle navigation hook | Useful, but folded into Record Riffle Engine. |
| 15 | Guidance from failed attempts only | Interesting, but weaker than a combined first-use plus failed-gesture lesson. |
| 16 | CSS variable driven hint stack | Useful, but folded into Compositor-First Stack. |
| 17 | Down means deeper, not next | Strong language insight, folded into Physical Crate Spine and Accessible Riffle Control Contract. |
| 18 | Pitch the sleeve, not just rotate it | Strong, but folded into Soundless Sleeve Physics. |
| 19 | The crate moves under the finger | Strong, but folded into Soundless Sleeve Physics. |
| 20 | Release detents | Strong, but folded into Soundless Sleeve Physics. |
| 21 | Details are a lift, not a flip | Scope overrun; it changes detail interaction rather than the riffle animation system. |
| 22 | Vertical progress rail as crate spine | Strong, folded into Physical Crate Spine. |
| 23 | One record per gesture | Good product guardrail, but too narrow as a survivor; include in Record Riffle Engine if implemented. |
| 24 | Soundless haptics | Strong, but folded into Soundless Sleeve Physics. |
| 25 | Riffle motion tokens | Strong, but folded into Record Riffle Engine. |
| 26 | Mobile riffle performance harness | Valuable verification, but not itself the animation system. |
| 27 | Gesture analytics | Useful later, but secondary to getting the interaction right. |
| 28 | Image budget policy | Strong, but folded into Compositor-First Stack. |
| 29 | Riffle contract tests | Strong, but folded into Accessible Riffle Control Contract and Record Riffle Engine. |
| 30 | Shared direction language | Strong, but folded into Accessible Riffle Control Contract. |
| 31 | Compact-only enhanced riffle | Useful scope guard, but folded into Compositor-First Stack. |
| 32 | Rolodex detents | Good analogy, but folded into Soundless Sleeve Physics. |
| 33 | Filmstrip preview | Good analogy, but folded into Compositor-First Stack and Physical Crate Spine. |
| 34 | Paper stack edge highlight | Good detail, but folded into Soundless Sleeve Physics. |
| 35 | Turntable cue pulse | Good detail, but folded into Soundless Sleeve Physics. |
| 36 | Library shelf depth marker | Good analogy, but folded into Physical Crate Spine. |
| 37 | Card trick fan | Good analogy, but folded into Soundless Sleeve Physics. |
| 38 | Mechanical click without haptics | Good detail, but folded into Soundless Sleeve Physics. |
| 39 | Touch-surface grip zone | Kept as contingency only; likely overcomplicates unless tap/drag testing shows conflict. |
| 40 | Three-layer low-end mode | Useful fallback, folded into Compositor-First Stack. |
| 41 | No-text gesture teaching | Strong quality bar, but less actionable than First Swipe Lesson. |
| 42 | Copy-only minimum viable fix | Too tactical as a survivor, but a valid first commit inside First Swipe Lesson. |
| 43 | Reduced-motion first riffle | Strong, but folded into Accessible Riffle Control Contract. |
| 44 | One-hand thumb bias | Useful tuning principle, folded into Record Riffle Engine. |
| 45 | Zero-new-DOM polish | Useful constraint, folded into Compositor-First Stack. |
| 46 | Million-record constraint | Useful scalability guard, folded into Compositor-First Stack. |
| 47 | No-haptics rule | Strong, folded into Soundless Sleeve Physics. |
| - | axis coverage | All five axes have at least one survivor. |
