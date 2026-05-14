---
title: feat: Crate View Mobile Performance — CSS-driven animations and progressive image loading
type: feat
status: active
date: 2026-05-14
origin: docs/ideation/2026-05-14-crate-view-mobile-performance-ideation.md
---

# Crate View Mobile Performance — CSS-Driven Animations and Progressive Image Loading

## Summary

Optimize the mobile crate view record-flipping experience by moving non-critical card animations off Framer Motion's JS thread onto CSS transitions, replacing the reactive drag-rotation pipeline with a direct CSS custom property, and implementing a thumbnail-backed progressive image loading strategy. Together these three changes eliminate ~50-70% of per-frame JS animation budget during mobile record navigation, addressing the primary source of choppy feeling when browsing records.

---

## Problem Frame

Flipping through records in the mobile crate view can feel choppy. The root causes span three independent bottlenecks:

1. **Too many concurrent Framer Motion animations.** All 5 visible card slots (active + 4 hint cards) are AnimatePresence children that exit/enter simultaneously on every navigation. The 4 hint cards animate only compositor-thread CSS properties (opacity, transform) but are driven by Framer Motion's JS animation loop at ~60% of per-frame budget.

2. **Reactive drag rotation overhead.** The active card's drag rotation uses `useMotionValue` + `useTransform` — a reactive pipeline that traverses Framer Motion's dependency graph on every pointer-move frame (60-120Hz on mobile) to compute a trivial linear map (`offsetX × 0.0667`).

3. **Image decode causing frame stalls.** All 5 cards load full-resolution `cover_image_url` (typically 600×600) with no progressive loading. The preloader fetches ±3 full-res images unconditionally per navigation. Mobile decode of a 600×600 JPEG takes 16-80ms — easily consuming an entire 16ms frame budget. No thumbnail backdrop or `img.decode()` gate exists.

The crate metaphor (front-riffle card stack) is correct and should be preserved — these are rendering optimizations, not UX redesigns.

---

## Requirements

- R1. Hint (non-active) cards must animate using only compositor-thread CSS properties, removing them from Framer Motion's JS animation loop
- R2. The active card's drag rotation must bypass `useTransform`'s reactive dependency graph
- R3. Cards must never display a blank state — `thumbnail_url` serves as an immediate backdrop while `cover_image_url` loads progressively
- R4. Full-resolution images must be decode-gated (`img.decode()`) so they never block a composite frame
- R5. Non-active cards should load thumbnails only; full-res loads only when a card becomes active
- R6. Existing reduced-motion and touch-hover behavior must be preserved
- R7. All existing test assertions must continue to pass (no behavioral regression)

---

## Scope Boundaries

- **No redesign of the crate view layout or interaction model** — only rendering optimizations
- **No changes to the desktop (comfy/wide) rendering path** where performance is already acceptable
- **No changes to the `RecordCard` flip animation** — that's a separate concern from card-stack navigation
- **No code splitting or bundle optimization** — that's orthogonal to frame-time during navigation
- **No changes to the paginator buttons, progress bar, or gesture hint** — they are not performance bottlenecks

---

## Context & Research

### Relevant Code and Patterns

- `app/frontend/components/crate_view.tsx:263-295` — AnimatePresence rendering all 5 card slots as `motion.div` children with `initial`, `animate`, `exit` variants
- `app/frontend/components/crate_view.tsx:315-333` — Inner `motion.div` with `drag` + `rotate: activeRotate` via `useTransform`
- `app/frontend/components/crate_view.tsx:108-118` — `usePreload` flat ±3 preload loop
- `app/frontend/components/crate_view.tsx:267` — `cover_image_url ?? thumbnail_url` (mutually exclusive usage)
- `app/frontend/components/record_card.tsx:25` — Same `cover_image_url ?? thumbnail_url` pattern
- `app/frontend/lib/motion_tokens.ts` — Spring configs and timing tokens; `springFlip`, `springTactile`, `springPress`
- `app/frontend/lib/crate_window.ts` — `buildCrateWindow` returning 5 visible slots
- `app/frontend/lib/crate_window.test.ts` — Existing tests for windowing logic
- `app/frontend/components/crate_view.test.tsx` — Existing CrateView component tests

### Institutional Learnings

- **`docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md`** — rAF-throttled proximity, touch hover fallback, state-dependent transitions, reduced-motion identity collapse. Use spring tokens from this system rather than inline animation values.
- **`docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`** — Touch devices skip hover entirely (press state only). `renderWithTier` for testing mobile code paths.
- **`docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md`** — CrateView `hideTabs` guard was dropped from desktop path. Ensure all responsive branches maintain guard parity during refactoring.
- `renderWithTier` utility at `app/frontend/test/viewport-test-utils.tsx` — injects fixed viewport tier bypassing matchMedia.

### External References

- CSS `transition` on `transform` and `opacity` runs on the GPU compositor thread in all modern browsers (Chrome, Safari, Firefox) with no main-thread JS cost. This is a W3C standard behavior and the codebase already uses `willChange: "transform, opacity"` on hint cards.
- `img.decode()` returns a Promise that resolves when the image is fully decoded and ready to paint without stalling the compositor. Supported in all modern browsers since 2020.
- The priority preload pattern (adjacent-first, edge-at-idle) is standard in virtual scrollers (TanStack Virtual, react-window) and image carousels.

---

## Key Technical Decisions

- **CSS transitions over Framer Motion for hint cards**: Hint cards animate only compositor properties (opacity, transform). CSS transitions on `transition: transform 0.2s ease-out, opacity 0.2s ease-out` achieve identical visual effect with zero main-thread JS cost. The existing `compositedLayerStyle` (will-change, backface-visibility, contain) is already in place.
- **CSS custom property over useTransform for drag rotation**: `useTransform`'s dependency graph traversal is unnecessary overhead for a linear map. A CSS custom property set via `element.style.setProperty('--drag-rotate', \`${offsetX * 0.0667}deg\`)` inside a `requestAnimationFrame`-throttled `onDrag` handler achieves the same result.
- **Thumbnail-two-layer over `cover_image_url ?? thumbnail_url`**: Current code treats the two URL fields as mutually exclusive. Using both as separate composited layers (thumbnail immediate + full-res cross-fade) eliminates the blank-card pop-in. Non-active cards only need thumbnail resolution.
- **Harmonized animation timing**: CSS transition `0.2s ease-out` matches the existing `ease` variable (`{ duration: 0.2, ease: "easeOut" }`) used by the current AnimatePresence hint cards, so the visual feel is preserved.
- **Reduced-motion preservation**: When `prefers-reduced-motion` is active, CSS transitions collapse to `0.01s` duration (CSS has no true-zero transition; 0.01s is imperceptible) and hint cards snap to position instantly, matching current behavior.

---

## Open Questions

### Resolved During Planning

- **Should hint card CSS transitions match current spring timing?** No — the current AnimatePresence hint cards already use `ease` (not spring). CSS `ease-out` with matching duration preserves visual feel.
- **Should reduced-motion get different CSS transition durations?** Yes — CSS `transition-duration: 0.01s` for reduced-motion provides imperceptible snap, matching current `reducedEase` (0.16s but practically instant on compositor thread).
- **Should the `usePreload` hook be modified or replaced?** Modified — it still preloads ±3 but prioritizes adjacent slots and switches edge slots to `thumbnail_url` only. Full-res for edge slots loads at idle priority.

### Deferred to Implementation

- **Exact CSS transition timing values for active-to-hint transitions**: When a card transitions from active (spring entry) to hint (CSS position), the precise timing overlap may need visual tuning. Start with `0.2s ease-out` match and adjust if disconnect is visible.
- **Thumbnail blur intensity for backdrop**: Starting with `filter: blur(8px)` as documented in the ideation. Can be tuned during implementation.
- **Priority preload idle strategy**: `requestIdleCallback` is the first choice, with `setTimeout(0)` fallback for browsers that don't support it (Safari).

---

## Implementation Units

### U1. Convert Hint Cards from AnimatePresence to CSS Transitions

**Goal:** Remove the 4 hint (non-active) cards from Framer Motion AnimatePresence, replacing their animation with CSS transitions on compositor-thread properties. Only the active card's entry animation remains in AnimatePresence.

**Requirements:** R1, R6, R7

**Dependencies:** None

**Files:**
- Modify: `app/frontend/components/crate_view.tsx`
- Modify: `app/frontend/components/crate_view.test.tsx`

**Approach:**
- Replace the hint card `<motion.div>` with a plain `<div>` carrying the same `compositedLayerStyle` CSS properties (`willChange`, `backfaceVisibility`, `contain`)
- Apply hint card positioning (`x`, `y`, `rotate`, `scale`, `opacity`) as inline styles updated by a `useMemo` that computes position from `visibleRecords` — no Framer Motion animation controller per hint card
- Add a CSS class (or inline transition style) on the outer stack container that animates hint card transforms: `transition: transform 0.2s ease-out, opacity 0.2s ease-out`
- Remove hint cards from the `AnimatePresence` wrapper — AnimatePresence wraps only the active card
- For reduced motion: toggle transition duration to `0.01s` via a CSS custom property or class based on `prefersReducedMotion`
- Keep the active card's AnimatePresence entry animation unchanged (the `variants` with `initial`, `animate`, `exit`)
- The key change: hint cards snap to new position via CSS transition on `transform`/`opacity` when `visibleRecords` changes, rather than running a Framer Motion exit+enter cycle
- Test that existing navigation behavior, gesture hint dismissal, and progress tracking all pass unchanged

**Patterns to follow:**
- `compositedLayerStyle` constant (crate_view.tsx ~line 28) — reuse its structure
- Existing `ease` constant (`{ duration: 0.2, ease: "easeOut" as const }`) for CSS match: `0.2s ease-out`
- `prefersReducedMotion` already detected via `useReducedMotion()` — use it to toggle a CSS class or `style` prop on the stack container

**Test scenarios:**
- **Happy path:** Navigate forward/backward on compact viewport — all 4 hint cards reposition smoothly, progress bar updates, active card enters with spring — existing tests pass unchanged
- **Happy path:** Navigate at wide viewport — hint card behavior is the same (no regression for desktop)
- **Edge case:** Only 1-2 records in crate (fewer than 5 visible slots) — hint cards still render correctly with CSS transitions
- **Edge case:** Empty crate — empty state renders correctly, no hint cards to animate
- **Edge case:** Reduced motion enabled — hint cards snap to position instantly (`0.01s` transition), active card uses reduced-motion variants
- **Edge case:** Rapid navigation (tapping ↑/↓ quickly) — CSS transitions are interruptible and handle rapid position changes without queue buildup (unlike Framer Motion's exit/enter queue)

**Verification:**
- All existing `crate_view.test.tsx` tests pass
- Manual visual verification on mobile that hint card repositioning is smooth and matches previous feel
- No `motion.div` or `AnimatePresence` wrappers remain around hint cards in the output DOM
- Active card entry animation (AnimatePresence with single child) fires correctly on navigation — verify that `variants` with `initial`/`animate`/`exit` still produce the expected card entry animation on both compact and wide viewports

---

### U2. Replace useTransform Drag Rotation with CSS Custom Property

**Goal:** Replace the `useMotionValue(dragX)` + `useTransform(…)` reactive pipeline for active card drag rotation with a CSS custom property set directly via `element.style.setProperty()` inside an rAF-throttled handler.

**Requirements:** R2, R6, R7

**Dependencies:** None (hint card changes in U1 and active card drag rotation are in separate branches of the render tree and have no functional dependency). Recommended order: implement after U1 to reduce merge churn in `crate_view.tsx`.

**Files:**
- Modify: `app/frontend/components/crate_view.tsx`

**Approach:**
- Add a `dragRotationRef = useRef<HTMLDivElement>(null)` on the inner draggable `motion.div`
- In `onDrag`, instead of `dragX.set(info.offset.x)`, call:
  ```ts
  const el = dragRotationRef.current
  if (el) el.style.setProperty('--drag-rotate', `${info.offset.x * 0.0667}deg`)
  ```
- Remove `useMotionValue(0)` and `useTransform(…)` declarations
- Remove the `dragX.set(0)` call in `handleDragEnd` (no longer needed since the custom property is ephemeral)
- Update the inner `motion.div`'s `style` to use `transform: 'rotate(var(--drag-rotate))'` instead of `rotate: activeRotate`
- The outer AnimatePresence motion.div still handles entry/exit animation as before
- The rAF throttle is optional initially — measure if `.setProperty()` per pointer event causes frame drops before adding it. (.setProperty() is typically cheap enough at 60Hz without additional scheduling)

**Patterns to follow:**
- Existing `onDrag` handler at crate_view.tsx ~line 340 — modify in place
- Existing `useRef` patterns in the component (already has `direction` ref)

**Test scenarios:**
- **Happy path:** Drag the active card ~80px left — rotation tracks proportionally, drag-end threshold navigation works
- **Happy path:** Drag right then return to origin — rotation follows, no residual rotation
- **Edge case:** Drag to threshold (72px) — navigation fires, rotation resets cleanly
- **Edge case:** Reduced motion enabled — drag still works functionally but the rotation visual is less important (reduced-motion users may not care about rotation, but it should not break)
- **Edge case:** Rapid, short drags (jitter) — no performance regression from .setProperty calls

**Verification:**
- `useMotionValue` and `useTransform` imports are removed from crate_view.tsx
- Drag-navigation behavior is identical to current
- No frame-time regression on mobile during drag (measured via Chrome DevTools Performance panel)

---

### U3. Implement Thumbnail-Backed Progressive Image Loading

**Goal:** Replace the single-image-per-card pattern with a two-layer approach: `thumbnail_url` as an immediate card backdrop (blurred), with `cover_image_url` layered on top via a decode-gated cross-fade. Non-active cards display thumbnail only. Update the `usePreload` hook with a priority queue.

**Requirements:** R3, R4, R5, R6, R7

**Dependencies:** U1 (hint card render structure is changing in U1, so image changes should land after)

**Files:**
- Modify: `app/frontend/components/crate_view.tsx`
- Modify: `app/frontend/lib/crate_window.ts` (optional — if returning thumbnail URL alongside cover URL)
- Test: `app/frontend/components/crate_view.test.tsx` (add thumbnail-related assertions)
- Test: `app/frontend/lib/crate_window.test.ts` (optional — extend if crate_window signature changes)

**Approach:**
- **Hint cards:** Render `thumbnail_url` as a full-size backdrop on the hint `<div>` (converted to plain div in U1) with `filter: blur(6px)` and `object-fit: cover`. No `cover_image_url` is loaded for hint cards — the thumbnail is sufficient at 0.38 opacity.
- **Active card:** Keep the current two-layer render approach (`RecordCard` with its flip animation) but add a thumbnail backdrop layer:
  - Inner `<img>` with `thumbnail_url` as immediate backdrop, blurred
  - Outer `<img>` with `cover_image_url` layered on top, initially hidden (opacity 0)
  - On image load + decode completion (`img.decode()`), cross-fade to full-res: `opacity: 0 → 1` with CSS transition `0.3s ease-out`
- **Decode gate:** Use a `useRef<HTMLImageElement>` on the visible full-res `<img>` element and call `.decode()` on the DOM element itself (not an orphan `new Image()`). Setting `src` and calling `.decode()` on the same visible element ensures the decode that blocks compositing is the one being awaited:
  ```tsx
  const fullResRef = useRef<HTMLImageElement>(null)
  const [fullResReady, setFullResReady] = useState(false)

  useEffect(() => {
    setFullResReady(false)
    const img = fullResRef.current
    if (!img || !activeRecord?.cover_image_url) return

    img.src = activeRecord.cover_image_url
    img.decode().then(() => setFullResReady(true)).catch(() => setFullResReady(true))
  }, [activeRecord?.id])
  ```
  When `fullResReady` becomes true, the cross-fade transition runs. Before that, the thumbnail backdrop is visible. The `input` img is decoded by the browser when the visible element renders it — this approach aligns the gate with the actual decode that matters for compositing.
- **Preload queue:** Modify `usePreload`:
  - Adjacent slots (±1): preload `cover_image_url` to warm the browser cache (the actual decode gate happens on the visible element per the pattern above; cache-warming ensures the browser has the bytes ready by the time the element renders)
  - Edge slots (±2, ±3): preload `thumbnail_url` only. Full-res for edge slots at idle priority via `requestIdleCallback` (or `setTimeout(0)` fallback)
  - The preload hook remains fire-and-forget (no API change) — decode tracking is owned by the visible element's ref and `useState` in the component body
- **Fallback:** If `thumbnail_url` is null, fall back to current behavior (`cover_image_url ?? ♪ placeholder`)

**Patterns to follow:**
- `usePreload` pattern at crate_view.tsx:108-118 — modify in place
- Existing `loading="eager"` / `decoding="async"` attributes on images
- `compositedLayerStyle` for the thumbnail backdrop layer
- `img.decode()` usage as documented in `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md`

**Test scenarios:**
- **Happy path:** Record has both `thumbnail_url` and `cover_image_url` — thumbnail shows immediately, full-res fades in after decode
- **Happy path:** Record has only `cover_image_url` (no thumbnail) — falls back to full-res only, no blank state (current fallback)
- **Happy path:** Record has neither URL — ♪ placeholder as before
- **Edge case:** User navigates rapidly — preload queue prioritizes adjacent slots, edge thumbnails never waste bandwidth
- **Edge case:** `img.decode()` fails (network error, corrupted image) — full-res still reveals via `.catch()` fallback
- **Edge case:** Reduced motion enabled — cross-fade transition collapses to instant (0.01s), no visual delay
- **Integration:** Switching crates resets the decode state — new active card's thumbnail shows immediately while full-res decodes

**Verification:**
- Cards never show a blank/empty state on mobile during navigation — visual inspection confirms
- Chrome DevTools Network tab shows full-res images loading only for ±1 adjacent, not for all ±3 edge slots
- Chrome DevTools Performance shows no long decode stalls (>16ms) on composite frames during navigation

---

## System-Wide Impact

- **Interaction graph:** Primary changes are in `crate_view.tsx`; `crate_window.ts` may require incidental updates. `RecordCard` is unchanged. No routes, controllers, or backend code affected.
- **Error propagation:** Image decode failures are non-blocking — full-res still renders via catch fallback. Missing `thumbnail_url` degrades gracefully to current behavior.
- **State lifecycle risks:** Preload queue with idle-priority edge slots must handle component unmount (component unmount should cancel pending idle callbacks). The current `useEffect` cleanup from `usePreload` already handles this for the existing loop.
- **API surface parity:** No changes to `CrateView`'s public API (props interface unchanged).
- **Unchanged invariants:** Desktop (comfy/wide) rendering path is untouched. Paginator buttons, progress bar, gesture hint, crate tabs, RecordDetails panel — all unchanged. Reduced motion and touch hover behavior preserved.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| CSS transition timing mismatch with active card spring creates visual disconnect | Set CSS transition `0.2s ease-out` to match existing `ease` variable. Visual tune if needed. The disconnect is only visible at the moment a hint card becomes active (CSS snap ends, spring entry begins) — this is a single frame transition. |
| `.setProperty()` per pointer event causes layout thrash | Measure first. If needed, add rAF throttle in `onDrag`. `.setProperty()` on a style property (not layout-triggering) is typically cheap. |
| `img.decode()` not supported in older mobile browsers | Safari 15.4+, Chrome 65+, Firefox 68+. The `.catch()` fallback ensures graceful degradation. Use `typeof HTMLImageElement.prototype.decode === 'function'` guard if needed. |
| GPU memory pressure from 2-layer image compositing across 5 card slots | Hint cards use only `thumbnail_url` (150×150 → ~90KB GPU per card). Active card's two layers (thumb + full-res) at most ~500KB total. Total GPU memory: ~1MB across all slots — well within mobile budgets. Verify on mid-range device with DevTools layer borders. |
| Priority preload with `requestIdleCallback` not supported in Safari | Safari lacks `requestIdleCallback`. Use `setTimeout(0)` as fallback. |
| U2 changes touch the active card's inner `motion.div` while U1 changes hint card outer elements — separate render branches, no functional conflict | Recommended sequencing: U1 → U2 to reduce merge churn in shared `crate_view.tsx`. Can be parallelized across branches if preferred. |

---

## Documentation / Operational Notes

- No documentation changes needed — this is a purely internal rendering optimization
- If the thumbnail blur strategy works well, consider extracting a shared `ProgressiveImage` component for reuse in other surfaces (picks wall, genre grid)
- The decode-gated cross-fade pattern can be documented as a `docs/solutions/` learning for future image-heavy work

---

## Sources & References

- **Origin document:** `docs/ideation/2026-05-14-crate-view-mobile-performance-ideation.md`
- **Related code:** `app/frontend/components/crate_view.tsx`
- **Related code:** `app/frontend/lib/motion_tokens.ts`
- **Related learnings:** `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md`
- **Related learnings:** `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`
