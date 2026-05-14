---
date: 2026-05-14
topic: crate-view-mobile-performance
focus: Crate view card-flipping performance on mobile — choppy animations when browsing records
mode: repo-grounded
---

# Ideation: Crate View Mobile Performance

## Grounding Context

### Codebase Context
Milkcrate is Rails 8 + Inertia React 19 + TypeScript + Vite 8 + Framer Motion 12.38. No code splitting (all JS in one bundle via eager glob).

**CrateView architecture:** 5 visible card slots via `buildCrateWindow(records, index, radius=2)`, all rendered as AnimatePresence children. On every navigation, all 5 key-prefixed cards exit and 5 new ones enter simultaneously — 10 concurrent AnimatePresence animations.

Active card (z-index 30) is draggable with:
- `useMotionValue(dragX)` — tracks drag position
- `useTransform(dragX, [-120,0,120], [-8,0,8])` — maps drag to rotation
- `DRAG_THRESHOLD = 72px`
- Drag constraints `{left:0, right:0, top:0, bottom:0}`

Non-active "hint" cards (z-index 10-12) render with offset x/y/rotate/scale.

**Image loading:** Active card `loading="eager"`, hint cards `loading="eager"`. `usePreload` hook preloads `records[index ± 3]` via `new Image()` with `decoding="async"`. Current code uses `cover_image_url ?? thumbnail_url` (mutually exclusive) despite Listing carrying both independently. No progressive loading, blur-up placeholders, low-res previews, or `img.decode()` gates.

**GPU compositing:**
- Hint cards: `willChange: "transform, opacity"`, `backfaceVisibility: "hidden"`, `contain: "layout paint style"`
- Active card: `willChange: "transform, opacity"`, `backfaceVisibility: "hidden"` (no `contain`)
- Active card has TWO nested `motion.div` elements, each with `willChange`
- `touchAction: "none"` on stack container; `overscrollBehavior: "contain"`

**Motion tokens:** Four-layer architecture (tokens → provider → hook → wrappers). Springs: tactile 300/26, press 400/28, flip 260/24, drawer 300/32. Reduced motion collapses to identity via `MotionConfig reducedMotion="user"`.

**Touch interaction:**
- Touch devices skip hover entirely — press state only via `setProximity(0)` on pointer enter
- rAF-throttled cursor proximity with cancel-before-schedule
- Nested button hydration errors fixed: `div[role=button]` for clickable wrappers

**Past performance learnings:**
- `RecordTile` as lightweight vs `RecordCard` (flip/pile/hover) — performance-conscious split for non-interactive surfaces
- Guard-condition drift bug: `hideTabs` guard was dropped from desktop path during `isCompact` refactor, causing unnecessary CrateTabs render in empty-crate state
- `renderWithTier` test utility available for testing mobile code paths
- Lint scanner (`scripts/lint-motion-tokens.ts`) flags inline animation values

### Topic Axes
- **Image load and decode** — cover image fetching, caching, decoding cost on mobile, placeholder strategies
- **Animation compositing** — AnimatePresence exit/enter cycles for 5-6 simultaneous cards, will-change/backface-visibility effectiveness on mobile GPUs, spring vs tween tradeoffs
- **Drag gesture & transform** — useTransform reactively computing rotation during drag, pointer event overhead with touchAction:none, coordinate math per frame
- **React render churn** — state updates on navigate (index, showGestureHint), AnimatePresence key churn, useMemo/useCallback boundaries

### External Context
Web research unavailable (no WebSearch tool in environment). Grounding derived from codebase analysis and institutional learnings only.

## Ranked Ideas

### 1. CSS-Driven Hint Card Positioning

**Description:** Convert the four hint (non-active) cards from Framer Motion AnimatePresence children to plain `div` elements animated with CSS transitions on `transform`/`opacity`. Remove them from AnimatePresence entirely — only the active card enters/exits via Framer Motion. Hint cards snap to new layout positions via GPU-composited CSS transitions on the compositor thread, zero main-thread cost for their motion.

**Axis:** Animation compositing

**Basis:** `direct:` `crate_view.tsx:263-295` renders all 5 cards as AnimatePresence children. Each hint card animates only compositor-thread properties: opacity (0→0.38), x (offset×16px), y (depth×12px), rotate (offset×-4°), scale (1-depth×0.045). Hint cards already carry `compositedLayerStyle` with `willChange: "transform, opacity"`, `backfaceVisibility: "hidden"`, and `contain: "layout paint style"`. Removing them from AnimatePresence eliminates 4 Framer Motion animation controllers per navigation (~40-60% of per-frame JS animation budget).

**Rationale:** Single highest-leverage change. Hint cards don't need Framer Motion's JS-driven animation — they just need to be in the right position with a smooth visual transition. CSS transitions on the compositor thread handle this perfectly. Compounds across three axes: animation compositing (moves to GPU), React render churn (4 fewer key changes), and drag gesture (more main-thread budget for drag handler).

**Downsides:** CSS transition timing must match the active card's spring entry so the stack doesn't look disconnected. Need to handle the transition when a hint card becomes active (spring entry starts as CSS transition ends).

**Confidence:** 85%
**Complexity:** Low

---

### 2. Persistent 3-Node DOM Carousel

**Description:** Replace the 5-card AnimatePresence window with 3 persistent DOM nodes (prev/active/next) recycled via container `translateX`. Instead of 5 cards with individual absolute positioning, keep 3 nodes mounted and translate the container on each navigation. Eliminates all AnimatePresence mounting/unmounting overhead. Only 1-2 images need to load per navigation instead of 5-6.

**Axis:** React render churn

**Basis:** `external:` Virtual scrollers (react-window, TanStack Virtual) and swipeable carousels (Apple Photos, Instagram Stories) keep 2-3 DOM nodes and translate the container — proven production mobile pattern. `reasoned:` Our crate stack is a linear list with fixed card dimensions; container translateX eliminates all per-node lifecycle overhead (10 lifecycle hooks per nav → 0).

**Rationale:** More thorough than #1 alone — eliminates DOM node churn entirely. The crate view is fundamentally a linear browse through fixed-size cards; this maps directly to the virtual carousel pattern.

**Downsides:** More complex than #1 — requires restructuring the CrateView rendering model. May conflict with existing drag gesture implementation (which expects absolute-positioned cards). Container translate requires careful edge handling at bounds (first/last record).

**Confidence:** 72%
**Complexity:** Medium-High

---

### 3. Thumbnail-as-Placeholder Progressive Image Pipeline

**Description:** Always render `thumbnail_url` as an immediate card backdrop (blurred via CSS `filter: blur(8px)`). Layer `cover_image_url` on top with a decode-gated cross-fade using `img.decode()`. Cards never show blank. Non-active cards display thumbnail only; full-res loads only when card becomes active.

**Axis:** Image load and decode

**Basis:** `direct:` `crate_view.tsx:267` and `record_card.tsx:25` use `cover_image_url ?? thumbnail_url` — treating both as mutually exclusive despite Listing carrying both independently. Thumbnails (typical 150×150) decode in 2-8ms on mobile vs 16-80ms for full-res (600×600). `direct:` `usePreload` (crate_view.tsx:108-118) fires `new Image()` with `decoding: "async"` but never calls `.decode()` — the browser may stall the composite frame if decode isn't complete by paint time. Using `img.decode()` gates the full-res reveal so it never blocks a frame.

**Rationale:** Directly eliminates blank-card pop-in — the most visually jarring source of "choppy" perception. Even if frames don't drop, a blank card that suddenly fills looks like jank. Thumbnails for hint cards also reduces GPU texture memory pressure during transitions.

**Downsides:** CSS blur on thumbnail adds compositing cost. Need to handle the case where `thumbnail_url` is also null. Decode-gated fade-in adds a brief wait before full-res appears (0-80ms). Two image layers per card doubles GPU texture memory for images.

**Confidence:** 80%
**Complexity:** Medium

---

### 4. CSS Custom Property Drag Rotation

**Description:** Replace `useMotionValue(dragX)` + `useTransform(...)` reactive pipeline for drag rotation with a CSS custom property (`--drag-rotate`) set via `element.style.setProperty()` inside a `requestAnimationFrame`-throttled handler in `onDrag`. Rotation becomes `transform: rotate(var(--drag-rotate))`, updated at most once per animation frame, bypassing Framer Motion's dependency graph traversal entirely.

**Axis:** Drag gesture & transform

**Basis:** `direct:` `crate_view.tsx:46-47`: `const dragX = useMotionValue(0)`, `const activeRotate = useTransform(dragX, [-120,0,120], [-8,0,8])`. `onDrag` calls `dragX.set(info.offset.x)` on every pointer move (60-120Hz on mobile). Each `.set()` cascades through useTransform's internal dependency graph, triggering a style update inside Framer Motion's JS animation loop — even though the transform is a trivial linear map (offsetX × 0.0667). A CSS custom property achieves identical visual result without any reactive plumbing, RAF compositing, or dependency graph traversal.

**Rationale:** Drag is the most frame-sensitive mobile interaction. Every ms of JS overhead during drag directly translates to perceived stutter. Frees per-frame budget for the drag handler.

**Downsides:** CSS custom properties set via JS still trigger a style recalculation, but it's cheaper than Framer Motion's dependency graph + RAF scheduling. May need to handle concurrent gesture states (drag + tap-to-flip).

**Confidence:** 78%
**Complexity:** Low

---

### 5. Merge Active Card's Two-Layer Framer Motion Nesting

**Description:** The active card currently wraps two nested `motion.div` elements: the outer handles AnimatePresence variant entry/exit (opacity, y, rotate, scale), the inner handles drag rotation via `useTransform`. Merge these into a single `motion.div` by composing both the variant transform and the drag rotation into one `style` or `animate` prop, eliminating the second composited layer and the nested animation clock.

**Axis:** Animation compositing

**Basis:** `direct:` `crate_view.tsx:275-314` defines the outer `<motion.div>` with AnimatePresence entry/exit variants; `crate_view.tsx:315-333` defines the inner `<motion.div>` with drag + `rotate: activeRotate`. Both carry `willChange: "transform"` and `backfaceVisibility: "hidden"` — each creates a separate GPU compositor layer. On mobile GPUs with limited layer budgets (Safari: ~128 layers per page, older Android: ~64), each excess layer risks GPU memory pressure and layer squashing (falling back to CPU rasterization). The two layers run on separate Framer Motion animation clocks, which can cause micro-stutter when both update in the same frame.

**Rationale:** Small but safe fix. Eliminates one composited layer without changing any behavior. Makes it straightforward to fully migrate active card to CSS animation later.

**Downsides:** If the variant animation and drag rotation animate on different timing, composing them into one transform value requires careful merge logic. Must verify no regression in entry/exit animation feel.

**Confidence:** 74%
**Complexity:** Low

---

### 6. Frame Budget Prioritization — Defer Hint Animation During Active Drag

**Description:** While the user is dragging the active card, suspend all hint card animation updates. Hint cards hold their current opacity/position statically during drag. On drag end, animate to new positions with a slight stagger using `transition-delay`. Reserves the entire 16ms JS frame budget for the drag interaction — the one the user is physically touching.

**Axis:** Drag gesture & transform

**Basis:** `reasoned:` The critical path on mobile drag: pointer event → `onDrag` → `dragX.set` → `useTransform` recompute → React re-render → commit → composite. Every millisecond over 16ms drops a frame. Hint card exit/enter animations via AnimatePresence currently compete for the same frame budget during drag. With #1 (CSS hint cards), this becomes trivial: set `transition-duration: 0s` on hint cards during drag, restore on drag end. `direct:` The `onDrag`/`onDragEnd` pattern already exists at `crate_view.tsx:228-240` — adding an `isDragging` boolean state is minimal.

**Rationale:** The user is touching the active card — their attention is on its response. Deferring background animations during interaction is standard UX practice. Establishes animation priority tiers (interaction-first, secondary-deferred) for the whole app.

**Downsides:** Adds conditional rendering logic. Without #1 (CSS hint cards), this is harder to implement cleanly. The "slight stagger" on drag-end needs visual tuning.

**Confidence:** 70%
**Complexity:** Low (with #1), Medium (without #1)

---

### 7. Priority-Ordered Preload Queue with Decode Tracking

**Description:** Replace the flat ±3 preload loop with a priority-ordered queue. Adjacent slot (±1) gets both thumbnail and full-res loaded and decoded first. Edge slots (±2, ±3) get thumbnail-only preload at idle priority (`requestIdleCallback`). Track which images have completed `.decode()`, not just load. Full-res for edge slots fetched only if user lingers.

**Axis:** Image load and decode

**Basis:** `direct:` `usePreload` (`crate_view.tsx:108-118`) loops `for (let offset = -3; offset <= 3; offset++)` and unconditionally creates `new Image()` with `cover_image_url` for every record in the ±3 range. Up to 6 full-res images begin downloading simultaneously on each navigation. On mobile with limited bandwidth and connection concurrency, this competes with the active card's own image load. Adjacent (±1) records are most likely navigated to next; edge (±2, ±3) records are less urgent. `reasoned:` A priority queue ensures the most-likely-next images are ready first without saturating the connection with unlikely-next fetches.

**Rationale:** The flat loop is naive — it treats all preloads as equal. A priority queue respects the user's actual navigation pattern and avoids self-inflicted network contention. Compounds with #3 (thumbnail pipeline): edge slots never need full-res preload, reducing the queue from 6 fetches to at most 2.

**Downsides:** Adds complexity to the preloading hook. Must handle rapid navigation (user tapping ↑/↓ quickly). The "idle priority" strategy via `requestIdleCallback` may not fire on busy devices. Must not drop preloads for fast-browsing users.

**Confidence:** 76%
**Complexity:** Medium

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | useTransform drag re-renders (pain/friction framing) | Absorbed into #4 — the fix for drag re-renders is the CSS custom property approach itself |
| 2 | AnimatePresence mass-swap (pain/friction framing) | Absorbed into #1 — removing hint cards from AnimatePresence fixes the mass-swap |
| 3 | DOM-persist all 5 slots | Overlaps #2; 3-node carousel is a stronger, proven-pattern approach |
| 4 | Non-active slots don't need AnimatePresence | Merged into #1 — same fix, #1 better specified with CSS transition strategy |
| 5 | Borrow card recycling from virtual scrollers | Merged into #2 — same concept, #2 is more concretely specified |
| 6 | Full-res only on active card | Merged into #3 — #3 includes decode gate + progressive layering |
