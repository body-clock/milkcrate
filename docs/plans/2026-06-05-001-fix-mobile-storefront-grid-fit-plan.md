---
title: "fix: Hide StoreSummary on compact viewports so Wall grid fits without scrolling"
type: fix
status: active
date: 2026-06-05
origin: docs/brainstorms/2026-06-05-mobile-storefront-grid-fit-requirements.md
---

# fix: Hide StoreSummary on compact viewports so Wall grid fits without scrolling

## Summary

Swap the StoreSummary viewport guard from `isWide` to `isCompact` by threading the prop through the existing call chain, so the store description and listing count do not render on compact viewports (≤767px). Desktop and comfy tiers retain current behavior. A secondary fallback unit reduces the Wall grid gap on compact if StoreSummary removal alone does not fit the full 2×3 grid on iPhone SE.

---

## Problem Frame

On compact viewports, the StoreSummary component (store description + listing count) consumes ~50–70px of vertical space above the Wall record grid. Combined with the AppHeader and browser chrome, this pushes the bottom row of the 2×3 grid below the fold, requiring a scroll. The store identity is already communicated via the AppHeader sticky bar — the description and listing count add no value during browsing. Desktop and comfy layouts are unchanged.

---

## Requirements

Trace to origin doc (`docs/brainstorms/2026-06-05-mobile-storefront-grid-fit-requirements.md`):

- R1. On compact (≤767px), StoreSummary does not render. (origin R1)
- R2. Comfy (768–1023px) and wide (≥1024px) behavior unchanged. (origin R2, R5)
- R3. Full 2×3 Wall grid visible without scrolling at iPhone SE dimensions (375×667). (origin R3)
- R4. If StoreSummary removal alone doesn't achieve R3, record card spacing may be reduced on compact. (origin R4)
- R5. Desktop layout unaffected. (origin R5)

---

## Scope Boundaries

- AppHeader sticky bar changes
- CrateView / inside-crate layout
- Wall grid aspect ratio changes unless R4 fallback is triggered
- Pile sheet or bottom navigation changes

### Deferred to Follow-Up Work

- Reduce prop drilling by calling `useViewport()` directly inside StoreSummary rather than threading `isCompact` through props — follow-up refactor

---

## Context & Research

### Relevant Code and Patterns

- `app/frontend/pages/stores/store_summary.tsx` — the component to change; currently guards on `isWide`
- `app/frontend/pages/stores/show_store_content.tsx` — renders StoreSummary when `activeSlug === null`
- `app/frontend/pages/stores/store_show_content.tsx` — passes `isWide` from `useViewport()` to `ShowStoreContent`
- `app/frontend/contexts/viewport_context.tsx` — defines three tiers: compact ≤767, comfy 768–1023, wide ≥1024
- `app/frontend/components/wall_panel_content.tsx` — `TIER_DENSITY` pattern for viewport-aware grid sizing
- `app/frontend/components/wall_panel_record_grid.tsx` — grid rendering with `gap-2` and `aspectRatio: "2/3"` on compact
- `app/frontend/test/pages/responsive_surface_matrix.test.tsx` — existing viewport-tier store page tests using `renderWithTier`

### Institutional Learnings

- **Viewport guard inversion pitfall** (`docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md`): When swapping a boolean guard (`isWide` → `isCompact`), the compound guard and its inner conditions must be verified on every branch. The current guard `(isWide || (!store.description && listingCount === 0))` becomes `(isCompact || isWide || (!store.description && listingCount === 0))`. Verify across all tier × content state combinations.
- **Footer-covering-content pitfall** (`docs/solutions/architecture-patterns/unified-store-browsing-browseshell-2026-06-02.md`): The compact layout uses `pb-[calc(8rem+env(safe-area-inset-bottom))]` — verify the bottom nav does not cover the last grid row after StoreSummary removal.
- **`renderWithTier` test pattern** (`docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`): Use `renderWithTier("compact", ...)` for tier-specific assertions — no `matchMedia` mocking needed.

---

## Key Technical Decisions

- **Guard change: two-gate approach.** The outer gate in `show_store_content.tsx` becomes `p.activeSlug === null && !p.isCompact && !p.isWide` — only comfy (768–1023px) renders StoreSummary. The inner gate in `store_summary.tsx` becomes `if (isCompact || isWide || (!store.description && listingCount === 0)) return null` — compact and wide both return null, comfy falls through to the content check. Redundant outer+inner gating is deliberate safety against guard-drift — a prior refactor lost a guard on one path.
- **Prop threading over direct hook call:** Pass `isCompact` through the existing `ShowStoreContentProps` → `StoreSummary` chain rather than calling `useViewport()` inside StoreSummary directly. Minimizes diff and follows the established `isWide`-passing pattern. Prop-drilling reduction deferred to follow-up.
- **R4 fallback via gap reduction:** If the grid still doesn't fit after StoreSummary removal, reduce `gap-2` to `gap-1.5` or `gap-1` on compact only, following the established `TIER_DENSITY` pattern. Aspect ratio and card sizing unchanged unless gap alone is insufficient.

---

## Implementation Units

### U1. Swap StoreSummary viewport guard from `isWide` to `isCompact`

**Goal:** Hide StoreSummary on compact viewports (≤767px) while preserving comfy and wide behavior.

**Requirements:** R1, R2, R5

**Dependencies:** None

**Files:**
- Modify: `app/frontend/pages/stores/store_show_content.tsx`
- Modify: `app/frontend/pages/stores/show_store_content.tsx`
- Modify: `app/frontend/pages/stores/store_summary.tsx`

**Approach:**
- In `store_show_content.tsx`: destructure `isCompact` from `useViewport()` alongside existing `isWide`, and pass it to `ShowStoreContent`.
- In `show_store_content.tsx`: accept `isCompact` in the `ShowStoreContentProps` interface. The StoreSummary render guard becomes `p.activeSlug === null && !p.isCompact && !p.isWide` — only comfy (768–1023px) renders StoreSummary. (The existing `isWide` is already available — keep it.)
- In `store_summary.tsx`: add `isCompact` as a prop alongside the existing `isWide`. Change the guard from `(isWide || (!store.description && listingCount === 0))` to `(isCompact || isWide || (!store.description && listingCount === 0))`. Compact and wide both return null; comfy falls through to the content check. The inner guard (no description + zero listings) is unchanged.
- `StoreSummary` now takes both `isCompact` and `isWide`; later follow-up can consolidate to the `tier` value directly.

**Patterns to follow:**
- `show_store_content.tsx:32` — existing conditional render pattern for StoreSummary
- `wall_panel_content.tsx` — `TIER_DENSITY` conditional rendering by viewport tier
- `app/frontend/hooks/use_viewport.ts` — `isCompact` property from the hook

**Test scenarios:**
- Happy path: Compact viewport with description present → StoreSummary does not render.
- Happy path: Compact viewport with no description and 0 listings → StoreSummary does not render (inner guard catches it, outer guard also catches it).
- Happy path: Comfy viewport (768–1023px) with description → StoreSummary renders as before.
- Happy path: Wide viewport (≥1024px) → StoreSummary still hidden (outer gate `!isWide` blocks it before it reaches the inner guard).
- Edge case: Compact viewport with description present and listings > 0 → StoreSummary absent; the AppHeader sticky bar still shows store name.

**Verification:**
- On a compact viewport (375px width), the store description and listing count text are absent from the page content area.
- On a comfy viewport (≥768px), the store description and listing count render as they do today.
- On desktop (≥1024px), no visual difference from current behavior.
- The `activeSlug !== null` (crate selected) path is unaffected — StoreSummary was already absent via the outer guard in `show_store_content.tsx`.

---

### U2. Add tier-specific test assertions for StoreSummary visibility

**Goal:** Add test coverage verifying StoreSummary is absent on compact and present on comfy, protecting against regression and the guard-parity pitfall.

**Requirements:** R1, R2, R5

**Dependencies:** U1

**Files:**
- Modify: `app/frontend/test/pages/responsive_surface_matrix.test.tsx`

**Approach:**
- Add compact-tier assertions: when rendering the store page at compact width, StoreSummary content (description text, listing count) is not in the DOM.
- Add comfy-tier assertions: when rendering at comfy width, StoreSummary content is present (when description exists).
- Add wide-tier assertions: confirm StoreSummary remains absent (existing behavior, now verified).
- Use the existing `renderWithTier` utility and `compactStoreProps` / tier-specific test data already in the file.
- Cover all tier × content state combinations: compact + description, compact + no description, comfy + description, comfy + no description + listings, wide + any content.

**Patterns to follow:**
- `responsive_surface_matrix.test.tsx` — existing `describe.each(tiers)` pattern with `renderWithTier`
- Learning doc: `docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md` — guard-parity verification

**Test scenarios:**
- Happy path: Compact tier with description → query for description text returns null.
- Happy path: Comfy tier with description → query for description text returns an element.
- Happy path: Wide tier → StoreSummary absent (existing behavior, unchanged).
- Edge case: Compact tier, `activeSlug !== null` (crate selected) → StoreSummary was already absent via outer guard; verify no double-hide regression.
- Edge case: Comfy tier with no description but listings > 0 → listing count text renders (inner guard allows it).

**Verification:**
- `npx vitest run` passes with new assertions.
- All five guard-parity states produce correct DOM output.

---

### U3. [Fallback] Reduce Wall grid gap on compact if R3 not yet met

**Goal:** If StoreSummary removal alone does not fit the full 2×3 grid above the fold on iPhone SE (375×667), reduce the grid gap on compact to reclaim additional vertical space.

**Requirements:** R3, R4

**Dependencies:** U1 (triggers only after visual verification)

**Files:**
- Modify: `app/frontend/components/wall_panel_record_grid.tsx`

**Approach:**
- In the compact code path (already gated by `props.isCompact`), reduce `gap-2` to `gap-1.5` or `gap-1` on the grid container.
- The grid is rendered in `WallPanelRecordGrid` → `RecordGrid`. The gap is applied via a Tailwind `gap-*` class on the grid wrapper.
- If `gap-1` still isn't enough, stack with `pt-0` or `pb-0` adjustments on the section wrapper.
- This unit triggers only if manual visual verification at iPhone SE dimensions shows the grid still requires scrolling after U1. If U1 alone achieves R3, skip this unit.

**Patterns to follow:**
- `wall_panel_content.tsx` — `TIER_DENSITY` pattern for viewport-aware spacing

**Test scenarios:**
- Happy path: Compact viewport at 375×667 → Wall grid is fully visible above the fold without scrolling.
- No regression: Comfy and wide viewports retain existing `gap-2` spacing.

**Verification:**
- Visual check at 375×667 viewport: full 2×3 grid visible, no scroll required.
- Desktop and comfy grid spacing unchanged.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Guard-parity error: inner condition `(!store.description && listingCount === 0)` mis-evaluated under the new `isCompact` gate | U2 tests cover all five tier × content combinations explicitly |
| Grid still doesn't fit at iPhone SE after StoreSummary removal | U3 fallback reduces gap on compact |
| Framer Motion entrance animation cleanup concern | The animation only fires inside StoreSummary's render; when the component returns null on compact, no animation mounts — no cleanup needed |

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-06-05-mobile-storefront-grid-fit-requirements.md](../brainstorms/2026-06-05-mobile-storefront-grid-fit-requirements.md)
- Related code: `app/frontend/pages/stores/store_summary.tsx`, `app/frontend/pages/stores/show_store_content.tsx`
- Viewport system: `app/frontend/contexts/viewport_context.tsx`, `app/frontend/hooks/use_viewport.ts`
- Learnings: `docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md`, `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`
