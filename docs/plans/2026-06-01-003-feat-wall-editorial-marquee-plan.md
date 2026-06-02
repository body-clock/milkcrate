---
title: "feat: Wall as Editorial Marquee — borderless grid with ghost cue and tap feedback"
type: feat
status: active
date: 2026-06-01
origin: docs/brainstorms/2026-06-01-wall-editorial-marquee-requirements.md
---

# Wall as Editorial Marquee

## Summary

Transform the Wall from a bordered `CrateShelf` card into a borderless, full-width 6-record grid (2×3 compact, 3×2 comfy/wide) with 1.5× cover scale, tap-down feedback via `springPress`, and a one-time ghost glow cue — all through prop differentiation on `CrateShelf` via the existing `PicksShelf` wrapper. No new component for the grid; a new `WallGlowCue` for the one-time cue.

---

## Problem Frame

The Wall renders as a bordered card identical to every crate below it. On compact, the border remains and the hover-dependent "DIG →" entry label is invisible. A first-time shopper sees a uniform scroll with no editorial threshold. The fix is mobile-first: borderless grid, larger covers, press feedback that teaches interactivity without hover, and a one-time glow cue that says "start here."

---

## Requirements

- R1. Wall renders borderless (`border-0 rounded-none bg-transparent`), full-width, no card container — the only unbordered surface on the store floor.
- R2. 6-record grid: 2 columns × 3 rows on compact, 3 columns × 2 rows on comfy/wide. Adaptive layout for < 6 records (see U2).
- R3. Covers at 1.5× standard `RecordTile` thumbnail size via CSS transform.
- R4. Tapping any cover enters the Wall crate at that record's position.
- R5. Tap-down (onPointerDown) scales the grid container to `SCALE_PRESS` (0.985) with `springPress` transition.
- R6. One-time ghost glow cue on first visit: soft radial glow in `--mc-accent`, ~2s duration, dissolves on `onPointerDown` or after 3s. Tracked via `localStorage` key `mc-wall-cue-dismissed`. Never fires again.
- R7. Header: crate name + today's date above the grid. No description paragraph. No "DIG →" label.
- R8. Comfy/wide: 3×2 grid, hover enrichment (deeper lift via `springTactile`). Sample cue deferred.
- R9. `role="region"` + `aria-label` preserved. Each cover is a focusable, keyboard-accessible button.
- R10. Implemented through `PicksShelf` → `CrateShelf` props. No `WallMarquee` component. Featured/Genre unchanged.

**Origin actors:** A1 (first-time shopper), A2 (returning shopper), A3 (curation pipeline)
**Origin flows:** F1 (first-visit orientation), F2 (Wall entry via tap), F3 (returning visit taste read)
**Origin acceptance examples:** AE1 (covers R1, R2, R4), AE2 (covers R5, R6), AE3 (covers R3, R8), AE4 (covers R7, R9)

---

## Scope Boundaries

- No dedicated `WallMarquee` component — prop differentiation only.
- No horizontal scroll, carousel, or swipe interaction.
- No "Fresh Today" animated temporal reveal — static date text only.
- No sample cue (audio or visual) at comfy/wide — deferred.
- No changes to Featured or Genre sections.
- No changes to crate entry transition or `CrateView`.
- No backend, curation pipeline, or data model changes.
- Ghost cue and CrateView's ghost finger cue remain independent — they teach different interactions.

### Deferred to Follow-Up Work

- Sample cue (R8's "subtle sample cue") — separate feature.
- "Fresh Today" animated reveal — separate feature.
- `WallMarquee` component extraction — after validation.

---

## Context & Research

### Relevant Code and Patterns

- `app/frontend/components/store_floor.tsx:16-58` — `PicksShelf` (private closure, Wall renderer)
- `app/frontend/components/crate_shelf.tsx` — `CrateShelf` discriminated union (interactive/static)
- `app/frontend/components/record_tile.tsx` — `RecordTile` (aspect-square, no scale prop)
- `app/frontend/components/ghost_finger_cue.tsx` — `GhostFingerCue` (swipe icon, sessionStorage lifecycle)
- `app/frontend/lib/first_swipe_lesson.ts` — lesson state machine (`isLessonLearned`, `markLessonLearned`)
- `app/frontend/lib/motion_tokens.ts` — `SCALE_PRESS` (0.985), `SCALE_HOVER` (1.025), `springPress`, `springTactile`
- `app/frontend/hooks/use_tactile_hover.ts` — `useTactileHover` hook (continuous cursor proximity, touch fallback)
- `app/frontend/contexts/viewport_context.tsx` — viewport tiers (compact ≤767px, comfy 768–1023px, wide ≥1024px)
- `app/frontend/test/viewport-test-utils.tsx` — `renderWithTier()` for tier-injected tests

### Institutional Learnings

- **Guard-parity audit:** After responsive branching, audit every guard condition (prop gates, data gates, empty/error states) on every branch. `docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md`
- **Nested button hydration:** Clickable wrappers containing interactive children must use `role="button"` on `<div>`, never `<button>` or `motion.button`. `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`
- **Animation token CI:** All spring configs and scale values must use tokens from `motion_tokens.ts`. The CI lint scanner rejects inline values. `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md`
- **Viewport tier testing:** Inject tier via `renderWithTier()`, never mock `matchMedia`. Use `describe.each(['compact', 'comfy', 'wide'])` matrix. `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`
- **CrateShelf primitives:** Extend existing primitive system with differentiated props — don't fork. `docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md`

---

## Key Technical Decisions

- **Press scale value:** Use `SCALE_PRESS` (0.985) from motion tokens, not the hardcoded `0.99` in `CrateShelf`'s interactive variant. Aligns the Wall with the token system and `CrateView`'s card stack.
- **Ghost cue component:** New `WallGlowCue` — dedicated component with its own visual (radial glow) sharing the lifecycle pattern from `first_swipe_lesson.ts` (extracted as `cue_lesson.ts`). Not generalizing `GhostFingerCue` — that component is tightly coupled to the swipe-down icon.
- **Ghost cue storage:** `localStorage` key `mc-wall-cue-dismissed` — one-shot permanent. Deliberate departure from the existing `sessionStorage` pattern (`mc-first-swipe-learned`) because the Wall cue teaches a simpler interaction (tap) that doesn't need per-session repetition.
- **Timer dismissal:** Ghost cue's 3s auto-dismiss timer cancels on `onPointerDown`, not on click. Prevents the glow dissolve animation from overlapping with the press-scale feedback during a tap-in-progress.
- **Cover scale approach:** CSS `transform: scale(1.5)` applied on a wrapper `<span>` around `RecordTile` inside the grid cell. Does not change grid cell size — the 1.5× cover overflows its cell slightly. At the current grid-gap of `gap-1.5` (6px), the overflow is contained within the gap and does not overlap adjacent covers.
- **Sparse grid layout:** Dynamic. ≤2 records → 1 column (1×N). 3-4 records → 2 columns (2 rows). 5 records → 2 columns (one trailing empty cell). 6 records → 2 columns compact / 3 columns comfy+ (3×2). Implemented as a `wallGridColumns(count)` helper.
- **Container press + button click:** Follows existing `CrateShelf` interactive pattern — `useTactileHover` provides `isPressed` on the grid `motion.div`, individual `<button>` children handle `onClick`. No new event architecture. Test on mobile Safari early.
- **Ghost cue visual:** A `motion.div` with `position: absolute; inset: 0` on the grid container, animated `box-shadow` or `radial-gradient` in `--mc-accent` from opacity 0 → 0.3 → 0 over ~2s. `pointer-events-none` so it never blocks interaction.

---

## Implementation Units

### U1. Add `SCALE_MARQUEE` token and cue lifecycle helper

**Goal:** Extend the animation token and lesson systems to support the Wall treatment.

**Requirements:** R3, R5, R6

**Dependencies:** None

**Files:**
- Modify: `app/frontend/lib/motion_tokens.ts`
- Create: `app/frontend/lib/cue_lesson.ts`
- Modify: `app/frontend/lib/first_swipe_lesson.ts`
- Test: `app/frontend/lib/cue_lesson.test.ts`

**Approach:**
- Add `SCALE_MARQUEE = 1.5` to `motion_tokens.ts` alongside existing scale constants. The CI lint scanner already enforces token-only imports — no additional lint rule changes needed.
- Extract the shared lesson lifecycle from `first_swipe_lesson.ts` into `cue_lesson.ts`: functions `isCueLearned(key: string, storage?: Storage)`, `markCueLearned(key: string, storage?: Storage)`, and `clearCueLesson(key: string, storage?: Storage)`. Default storage parameter is `localStorage`.
- Refactor `first_swipe_lesson.ts` to delegate to `cue_lesson.ts` with `sessionStorage` and key `mc-first-swipe-learned`. Existing behavior unchanged — this is a pure extraction.
- Unit test `cue_lesson.ts` for: marking sets the key, isLearned returns true after mark, clearCueLesson resets, defaulting to localStorage, explicit sessionStorage override, missing key returns false.

**Patterns to follow:**
- `app/frontend/lib/first_swipe_lesson.ts` — existing lesson state machine
- `app/frontend/lib/motion_tokens.ts` — token export pattern

**Test scenarios:**
- Happy path: `markCueLearned('test-key')` → `isCueLearned('test-key')` returns true
- Happy path: Defaults to localStorage when no storage parameter
- Happy path: Explicit sessionStorage override works
- Edge case: `isCueLearned('nonexistent')` returns false
- Edge case: `clearCueLesson` removes the key, `isCueLearned` returns false after

**Verification:**
- `SCALE_MARQUEE` is exported and importable from `@/lib/motion_tokens`
- `cue_lesson.ts` passes unit tests
- `first_swipe_lesson.ts` behavior is unchanged (existing tests pass after refactor)

---

### U2. Update PicksShelf and StoreFloor — grid, border, density, sparse layout

**Goal:** Change `PicksShelf` in `StoreFloor` to render the Wall borderless with 6-record adaptive grid and no entry label.

**Requirements:** R1, R2, R7, R10

**Dependencies:** U1

**Files:**
- Modify: `app/frontend/components/store_floor.tsx`
- Test: `app/frontend/components/store_floor.test.tsx`

**Approach:**
- Change `picksPreviewCount`: `const picksPreviewCount = isCompact ? 6 : 6;` (always 6, comfy/wide grid adapts via `gridColumnCount(6)` → 3 cols → 2 rows). Revisit if comfy/wide should remain 8 per origin R8 — but R2 specifies 6 across all tiers after user dialogue resolved 2×3 compact, 3×2 comfy/wide.
- Remove the `!isCompact` condition from `className`: pass `className="border-0 rounded-none"` unconditionally. Also pass `bg-transparent` to override CrateShelf's default `bg-mc-bg-card`. To avoid fighting Tailwind specificity with CrateShelf's hardcoded `bg-mc-bg-card`, use `!bg-transparent` (important prefix) or pass the classes after the default is composed: CrateShelf appends `className` after `bg-mc-bg-card border border-mc-border rounded-lg`, so `className="border-0 rounded-none bg-transparent"` will correctly override all three via CSS cascade (same specificity, later in source order wins).
- Remove `openLabel="DIG →"` prop — no entry label.
- Remove visible description paragraph: delete the `<p className="text-xs text-mc-text-dim mb-3">Today's picks — the store's taste at a glance</p>` in `StoreFloor`'s picks section render. The `role="region"` `aria-label` already carries this copy.
- Add `wallGridColumns(count: number): number` helper function: ≤2 → 1, ≤4 → 2, otherwise → 2 for compact / 3 for comfy/wide. Use this to pass a `columnOverride` prop to `CrateShelf` (added in U3) or compute columns in `PicksShelf` and pass via `previewCount` + a new `forceColumns` logic.
- On non-compact, the PicksShelf wrapper `motion.div` already applies its own border — this wrapper itself should also become borderless by removing the `border` class from its `className` when the inner shelf is borderless.

**Patterns to follow:**
- Existing `PicksShelf` structure in `store_floor.tsx:16-58`
- `CrateShelf`'s `gridColumnCount` mapping pattern

**Test scenarios:**
- Happy path: Wall renders with 6 records, 2 columns on compact (`renderWithTier("compact", ...)`)
- Happy path: Wall renders with 6 records, 3 columns on comfy/wide
- Edge case: 3 records → 2 columns, 2 rows (one empty cell)
- Edge case: 2 records → 1 column, 2 rows
- Edge case: 1 record → 1 column, 1 row
- Edge case: 0 records → Wall section not rendered at all (existing behavior, unchanged)
- Edge case: `aria-label` still present on the `role="region"` wrapper
- Edge case: No "DIG →" text visible at any viewport tier
- Edge case: No description paragraph visible
- Integration: `border-0 rounded-none bg-transparent` classes present on CrateShelf container at all tiers

**Verification:**
- Wall renders borderless on compact and non-compact
- Grid adapts column count to record count
- No entry label or description paragraph visible
- Existing Featured and Genre sections unchanged

---

### U3. Add `coverScale` prop to CrateShelf

**Goal:** Enable 1.5× cover scaling on `RecordTile` thumbnails via a new prop.

**Requirements:** R3, R10

**Dependencies:** U1, U2

**Files:**
- Modify: `app/frontend/components/crate_shelf.tsx`
- Test: `app/frontend/components/crate_shelf.test.tsx`

**Approach:**
- Add `coverScale?: number` to `BaseCrateShelfProps`. Default undefined (no scaling).
- In `CrateShelfLayout`, when `coverScale` is set, wrap each `RecordTile` or its container in a `<span>` with `style={{ transform: 'scale(${coverScale})' }}` and `transform-origin: center center`.
- The scale wrapper sits inside the grid cell — the grid cell size is unchanged, so the 1.5× cover overflows into the cell's `gap-1.5` margin. At 6px gap, 1.5× overflow on a ~150px cell is ~37.5px per side, which may encroach on adjacent cells. Mitigation: set `overflow-hidden` on the grid cell container, or increase gap for the Wall specifically. The flow analyzer (G14) flagged this — if overflow clipping is unacceptable, use a dedicated `wallGap` prop or increase gap via the existing `gap` override in `CrateSectionGrid` (but the Wall doesn't use `CrateSectionGrid` — gap is in `CrateShelf`'s grid container at `gap-1.5`). Pass a `gap` prop alongside `coverScale`.
- For the Wall, `PicksShelf` passes `coverScale={SCALE_MARQUEE}` and `gap="gap-3"` (12px instead of 6px) to accommodate the overflow.
- The scale must not affect the `tactileThumbnails` CSS hover scale — the 1.5× is visual size, hover scale is a separate interaction effect. CrateShelf applies `tactileThumbnails` via a CSS class on RecordTile; the wrapper scale applies independently.

**Patterns to follow:**
- Existing prop addition pattern in `CrateShelf` (e.g., `headerSize`, `tactileThumbnails`, `meta`)
- Discriminated union: `coverScale` goes on `BaseCrateShelfProps` (shared by both static and interactive)

**Test scenarios:**
- Happy path: `coverScale={1.5}` applies `transform: scale(1.5)` to each RecordTile wrapper
- Happy path: `coverScale` undefined → no scale wrapper (existing behavior unchanged)
- Edge case: `coverScale={1}` → wrapper present but visually unchanged
- Edge case: Scale does not affect grid layout — column count unchanged with `coverScale`

**Verification:**
- CrateShelf accepts `coverScale` prop
- RecordTile renders with scale wrapper when prop is set
- Existing CrateShelf tests pass (no regression)
- PicksShelf passes `coverScale={SCALE_MARQUEE}` from U2

---

### U4. Integrate tap-down feedback on Wall grid

**Goal:** Apply `SCALE_PRESS` (0.985) with `springPress` transition to the Wall grid container on touch-down.

**Requirements:** R5

**Dependencies:** U1, U2

**Files:**
- Modify: `app/frontend/components/store_floor.tsx` (PicksShelf)
- Test: `app/frontend/components/store_floor.test.tsx`

**Approach:**
- PicksShelf already uses `useTactileHover` on non-compact in its `motion.div` wrapper. On compact, it renders `CrateShelf` directly with no wrapper — and therefore no press animation.
- The fix: wrap the compact path as well, but with a minimalist `motion.div` that only handles press scale (no border animation, no lift, no tilt — those are non-compact enrichments). On compact: `animate={{ scale: isPressed ? SCALE_PRESS : 1 }}` with `transition={springPress}`.
- The `motion.div` uses `useTactileHover` for `isPressed` detection. On compact, `useTactileHover` already handles touch correctly: `onPointerDown` sets `isPressed = true`, `onPointerUp` sets it false. No hover flash (the touch hover flash fix from 2026-05-14 is applied).
- The individual cover `<button>` children inside `CrateShelf` handle `onClick` for crate entry. The container `motion.div` does NOT intercept click — it only handles pointer events for scale animation. Test on mobile Safari to confirm button clicks still register (flow analyzer G2).
- On non-compact, the existing `PicksShelf` wrapper already applies press scale via `SCALE_PRESS` — change the hardcoded `SCALE_HOVER` and `SCALE_PRESS` references to use the imported tokens if not already doing so (they are).
- Remove the `rotate` animation on the wrapper for the Wall specifically — the Wall is an editorial surface, not a card being picked up. On non-compact: `animate={{ scale: isPressed ? SCALE_PRESS : isHovered ? SCALE_HOVER : 1, y: isHovered ? -3 : 0 }}` (no rotate). On compact: `animate={{ scale: isPressed ? SCALE_PRESS : 1 }}` (no hover enrichment at all).

**Patterns to follow:**
- Existing `PicksShelf` motion.div wrapper pattern (`store_floor.tsx:42-56`)
- `useTactileHover` usage in `CrateCard` (`crate_card.tsx:22`)

**Test scenarios:**
- Happy path: On compact, pointer-down on grid → container scales to 0.985
- Happy path: On compact, pointer-up → container scales back to 1.0
- Edge case: Tap on a specific cover → press scale fires, crate entry at correct record index
- Edge case: Rapid double-tap → no duplicate navigation (existing CrateShelf onClick handles this)
- Integration: Non-compact hover still works (lift, scale) but no rotate animation on the Wall wrapper

**Verification:**
- Press-down feedback visible on compact touch
- Individual cover taps correctly route to crate entry
- No rotate animation on Wall wrapper

---

### U5. Build WallGlowCue component

**Goal:** A one-time soft glow cue that fires on first visit, dissolves on interaction or after 3s.

**Requirements:** R6

**Dependencies:** U1 (cue_lesson.ts), U2

**Files:**
- Create: `app/frontend/components/wall_glow_cue.tsx`
- Test: `app/frontend/components/wall_glow_cue.test.tsx`
- Modify: `app/frontend/components/store_floor.tsx` (integrate into PicksShelf)

**Approach:**
- `WallGlowCue` is a `motion.div` with `position: absolute; inset: 0; pointer-events: none; z-index: 1` overlaid on the Wall grid container.
- Visual: radial gradient or large `box-shadow` in `var(--mc-accent)` that animates opacity 0 → 0.25 → 0 over ~2 seconds, then holds at 0. Respects `prefersReducedMotion` (skips animation, never renders).
- Lifecycle: On mount, checks `isCueLearned('mc-wall-cue-dismissed')` from `cue_lesson.ts`. If already learned, renders nothing. If not learned, renders the glow animation.
- Dismissal paths: (a) `onPointerDown` on the parent grid container fires `markCueLearned('mc-wall-cue-dismissed')` and the component unmounts or hides, (b) a 3s `setTimeout` fires `markCueLearned` and the component hides. Timer is cleared on `onPointerDown` to prevent the timer firing during an active press (flow analyzer G4).
- The component accepts `onDismiss?: () => void` for the parent to know when the cue has been dismissed (useful for potential animation sequencing).
- Integration in `PicksShelf`: wrap the grid area in a `relative` container and render `<WallGlowCue>` as an overlay. Only renders on compact? Per R6, it fires on any tier for first visit — but on desktop, the glow may feel out of place since there's no tap lesson to teach. The ghost cue is about "start here," which applies to all tiers — the glow signals importance, not interaction. Render on all tiers.
- The glow's visual shape: a radial gradient centered on the grid, using `var(--mc-accent)` with low opacity. Animation: `framer-motion` `animate={{ opacity: [0, 1, 0] }}` with `transition={{ duration: 2, ease: 'easeInOut' }}`. On `onPointerDown`, animate opacity to 0 over 0.3s and call `markCueLearned`.

**Patterns to follow:**
- `app/frontend/components/ghost_finger_cue.tsx` — presentational component with `reducedMotion` support
- `app/frontend/lib/cue_lesson.ts` — lifecycle helper (from U1)
- `app/frontend/hooks/use_reduced_motion.ts` — reduced motion context

**Test scenarios:**
- Happy path: First visit → glow renders, fades over ~2s, marks localStorage
- Happy path: Second visit → `isCueLearned` returns true → renders nothing
- Edge case: `onPointerDown` during glow animation → cue dissolves immediately, localStorage marked
- Edge case: Timer fires at 3s → cue dissolves, localStorage marked
- Edge case: Timer fires while `onPointerDown` is active → timer cleared, no double-dismiss (flow G4)
- Edge case: `prefersReducedMotion` → never renders
- Edge case: `localStorage` unavailable (private browsing) → `cue_lesson.ts` handles the error silently, cue renders (no persistence), dismiss is a no-op on storage write failure

**Verification:**
- Glow cue renders on first visit
- Does not render on subsequent visits
- Dismisses on tap or timer
- Respects reduced motion

---

### U6. Integration, responsive tests, and guard-parity audit

**Goal:** Wire all units together, add responsive matrix tests, run the guard-parity audit.

**Requirements:** R1–R10 (all), AE1–AE4

**Dependencies:** U2, U3, U4, U5

**Files:**
- Modify: `app/frontend/components/store_floor.tsx` (final integration)
- Modify: `app/frontend/components/crate_shelf.tsx` (final prop wiring)
- Test: `app/frontend/components/store_floor.test.tsx` (add Wall-specific tests)
- Test: `app/frontend/components/crate_shelf.test.tsx` (add coverScale tests)
- Test: `app/frontend/test/pages/responsive_surface_matrix.test.tsx` (add Wall tier tests)

**Approach:**
- In `PicksShelf`: pass `coverScale={SCALE_MARQUEE}`, `gap="gap-3"`, `previewCount=6`, `className="border-0 rounded-none bg-transparent"`, no `openLabel`. Wrap in `relative` container, render `<WallGlowCue>` overlay. On compact: wrap `CrateShelf` in `motion.div` with press-only animation. On non-compact: adjust existing wrapper to remove `rotate`.
- In `CrateShelfLayout`: support `coverScale` and `gap` props. Add `wallGridColumns` or expose column override.
- Responsive matrix tests (new in `store_floor.test.tsx`):
  - `describe.each(['compact', 'comfy', 'wide'])('Wall at %s tier', (tier) => { ... })` — render Wall with 6 records, verify: grid columns (2/3/3), borderless classes present, no "DIG →" label, no description paragraph, `aria-label` on region, press feedback container present.
  - Sparse grid tests per tier.
  - Ghost cue visibility test (mock `cue_lesson`).
- Guard-parity audit (per learning `responsive-branching-guard-condition-drift`):
  - Walk every responsive branch in `PicksShelf` and `CrateShelfLayout`.
  - Verify: `records.length > 0` guard (hides Wall when empty) on all branches.
  - Verify: `crate` prop null/undefined guard on all branches.
  - Verify: ghost cue only renders when `!isCueLearned` and `!prefersReducedMotion`.
  - Verify: `coverScale` only applied when defined.

**Test scenarios:**
- Integration: Full Wall render at compact, comfy, wide — borderless, 6 covers, correct columns
- Integration: Tapping a cover navigates to correct crate position (mock `onSelectCrate`)
- Accessibility: `role="region"` with correct `aria-label`
- Accessibility: Each cover is a `<button>` with `aria-label`
- Regression: Featured and Genre sections unchanged (existing tests pass)
- Regression: Existing CrateShelf usage (Featured, Genre via CrateCard) unaffected by new props

**Verification:**
- All AE1-AE4 acceptance examples pass
- All three tiers render correctly
- Existing tests pass with no regressions
- Guard-parity audit produces no findings

---

## System-Wide Impact

- **Interaction graph:** `StoreFloor` → `PicksShelf` → `CrateShelf` → `RecordTile`. New: `WallGlowCue` overlay in `PicksShelf`. No changes to `CrateCard`, `CrateSectionGrid`, `FeaturedCratesRow`, or `GenreGrid`.
- **Error propagation:** `cue_lesson.ts` handles `localStorage` unavailability silently (try/catch on getItem/setItem). Ghost cue gracefully degrades — renders but can't persist dismissal. No error propagation to the user.
- **State lifecycle risks:** Ghost cue timer (3s) must be cleaned up on unmount to prevent `setState` on unmounted component. `useEffect` cleanup handles this.
- **API surface parity:** No new Inertia props or backend changes. The Wall still consumes the same `Crate` type from `StoreShowProps`.
- **Integration coverage:** The `CrateShelf` interactive mode's existing event handling (container `motion.div` press + inner `<button>` click) is the key integration seam. Test on real mobile Safari.
- **Unchanged invariants:** `CrateShelf`'s static variant and Featured/Genre interactive variant are unchanged. `CrateCard` is unchanged. `RecordTile` API is unchanged (scale applied at wrapper level). `CrateView` and the card stack are unchanged.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Container press animation conflicts with button clicks on mobile Safari (G2) | Test on real device early in U4. The existing CrateShelf pattern has this same architecture — if it works today for Featured/Genre, it works for the Wall. |
| 1.5× cover scale overflows grid gap and overlaps adjacent covers (G14) | Increase Wall grid gap from `gap-1.5` to `gap-3` via new `gap` prop. Overflow is contained. |
| Ghost cue timer fires during active press (G4) | Clear timer on `onPointerDown` in U5. |
| `localStorage` unavailable (private browsing) | `cue_lesson.ts` wraps getItem/setItem in try/catch. Cue renders on first visit but can't persist — acceptable degradation. |
| Ghost cue and CrateView ghost finger cue fire back-to-back (G10) | Keep independent per Key Technical Decision. The cues teach different interactions. If user feedback indicates annoyance, address in follow-up. |
| Guard drift across responsive branches | Guard-parity audit in U6 catches this before merge. |

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-06-01-wall-editorial-marquee-requirements.md](docs/brainstorms/2026-06-01-wall-editorial-marquee-requirements.md)
- **Ideation document:** [docs/ideation/2026-06-01-store-page-visual-refresh-ideation.md](docs/ideation/2026-06-01-store-page-visual-refresh-ideation.md)
- Related code: `app/frontend/components/store_floor.tsx`, `app/frontend/components/crate_shelf.tsx`, `app/frontend/components/record_tile.tsx`, `app/frontend/components/ghost_finger_cue.tsx`, `app/frontend/lib/first_swipe_lesson.ts`, `app/frontend/lib/motion_tokens.ts`, `app/frontend/hooks/use_tactile_hover.ts`
- Learnings: `docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md`, `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`, `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md`, `docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md`
