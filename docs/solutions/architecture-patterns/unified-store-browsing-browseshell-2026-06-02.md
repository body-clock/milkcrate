---
title: "Unified store browsing around BrowseShell"
date: 2026-06-02
category: architecture-patterns
module: storefront
problem_type: architecture_pattern
component: frontend_stimulus
severity: medium
applies_when:
  - "Consolidating multiple viewport-specific components into a single responsive shell"
  - "Replacing a binary mobile/desktop split with viewport-tier-aware layout"
  - "Unifying navigation models that have drifted across separate browsing paths"
  - "Supporting both direct URL entry and in-session selection in the same shell"
  - "Deleting redundant components that duplicate behavior across breakpoints"
tags:
  - browseshell
  - responsive
  - consolidation
  - viewport-tier
  - navigation
  - storefront
  - tailwind
  - store-floor
  - direct-entry
  - wall-panel
related_components:
  - hotwire_turbo
---

# Unified Store Browsing Around BrowseShell

## Context

The storefront had three separate browsing paths that evolved independently:

1. **CompactBrowseShell** — mobile-only component with fixed bottom tab nav (wall / featured / genres) and swipeable WallPanel.
2. **StoreFloor** — desktop-only component with CrateShelf, FeaturedCratesRow, GenreGrid, tactile hover effects, and inline picks strip.
3. **Direct CrateView** — a `?crate=` URL query parameter that rendered CrateView with no shell navigation at all.

The problems compounded over time:

- **Navigation model drift.** CompactBrowseShell used `useBrowseRouting` with three modes. StoreFloor iterated over `StorefrontSection[]` directly with no shared mode concept. Each path had its own "what's selected" logic.
- **Component duplication.** StoreFloor imported CrateShelf, CrateCard, CrateSectionGrid, FeaturedCratesRow, and GenreGrid — five components that only existed for the desktop layout. Their mobile equivalents (WallPanel, CrateBrowsePanel, InlineCrateStage) were completely separate.
- **No shared responsive vocabulary.** StoreFloor used `sm:` Tailwind breakpoints internally. CompactBrowseShell was gated at the page level by `useIsDesktop` (later `useViewport`). There was no single component that owned "store browsing" across tiers.
- **Direct entry had no shell.** Navigating to `?crate=some-slug` rendered CrateView in a void — no way to switch browse modes, no way to get back to the wall without the browser back button.

The ViewportContext architecture (`viewport-context-responsive-architecture-2026-05-09.md`) established the three-tier vocabulary (compact / comfy / wide) and the `useViewport()` hook. The foundations were in place to unify.

Prior work: the compact-only browse shell (plan 001) was implemented first, creating `WallPanel`, `CrateBrowsePanel`, `WallRecordPeekSheet`, and `useBrowseRouting`. The unified consolidation (plan 002) then elevated these to all tiers. The progression was: wireframe → compact-only shell → "this should work everywhere" → unified consolidation.

## Guidance

### Pattern 1: Rename rather than rebuild

When one existing component already handles the primary use case and the other is a diverged duplicate, rename the better component and extend it — don't build a third from scratch.

```tsx
// Before: two separate entry points in StoreShow
if (isCompact) {
  return <CompactBrowseShell sections={sections} ... />;
}
return <StoreFloor sections={sections} onSelectCrate={selectCrate} />;

// After: single entry point
<BrowseShell
  sections={storefront_sections}
  activeSlug={activeSlug}
  startIndex={startIndex}
  selectCrate={selectCrate}
  backToStore={backToStore}
  directEntry={directEntry}
/>
```

StoreShow went from a tier-gating page to a pure data-forwarding page. The responsive logic moved inside BrowseShell.

### Pattern 2: Responsive nav placement via Tailwind, not component branching

The browse nav (wall / featured / genres tabs) is one `<nav>` element. Placement changes by tier using Tailwind utilities:

```tsx
const browseNav = (
  <nav
    aria-label={COPY.browseNavLabel}
    className={
      isCompact
        ? "fixed inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40"
        : "mb-4"
    }
  >
    <div className={isCompact ? "..." : "flex gap-1 rounded-2xl ..."}>
      {/* same buttons in both layouts */}
    </div>
  </nav>
);
```

Compact: fixed bottom with safe-area inset, pill-shaped floating container.
Comfy/wide: normal flow at top, flex layout with `flex-1` buttons.

### Pattern 3: useBrowseRouting as single navigation model

One hook owns the mapping between `StorefrontSection[]` and browse modes:

```ts
function sectionCrateMap(sections: StorefrontSection[]) {
  const wallSection = sections.find((s) => s.key === "picks_wall");
  const featuredSection = sections.find((s) => s.key === "featured_crates");
  const genreSection = sections.find((s) => s.key === "genre_grid");
  // ...
}
```

`handleBrowseModeSelected` auto-selects the first crate when switching to a mode that doesn't contain the current selection — the user always sees content, never an empty panel.

### Pattern 4: Direct entry vs in-shell selection via useCrateRouting flag

`useCrateRouting` tracks whether the current `activeSlug` came from a URL query (direct entry) or from in-session selection:

```ts
const [directEntry, setDirectEntry] = useState(() => {
  const fromParam = new URLSearchParams(window.location.search).get("crate");
  return Boolean(fromParam || history.state?.crateSlug);
});

const selectCrate = useCallback((slug: string, index = 0) => {
  // ...
  setDirectEntry(false); // in-session selection
}, []);
```

Direct entry renders full `CrateView` with header/tabs. In-shell selection renders through `InlineCrateStage` with shell-owned chrome.

### Pattern 5: Viewport-tier-aware grid density

WallPanel defines a `TIER_DENSITY` constant mapping tiers to grid columns and page sizes:

```ts
const TIER_DENSITY = {
  compact: { tilesPerPage: 6, gridCols: "grid-cols-2" },   // 2x3
  comfy:   { tilesPerPage: 8, gridCols: "grid-cols-4" },   // 4x2
  wide:    { tilesPerPage: 15, gridCols: "grid-cols-5" },   // 5x3
} as const;
```

Compact caps at 12 records even though the backend sends 15, preventing the wall from becoming unwieldy on small screens. Page index is clamped when tier changes reduce page count.

### Pattern 6: Responsive peek sheet placement

WallRecordPeekSheet uses the same dual-placement pattern as PileSheet — bottom sheet on compact, right-side panel on comfy/wide:

```tsx
className={
  isCompact
    ? "fixed inset-x-0 bottom-0 z-50 ... rounded-t-[1.75rem]"
    : "fixed top-0 right-0 bottom-0 z-50 w-96 ..."
}
initial={isCompact ? { y: "100%" } : { x: "100%" }}
```

The animation direction must match the placement axis.

## Why This Matters

**Before:** Any new browse feature required implementation in two separate components with two separate navigation models. The desktop path had no shared routing hook. Direct entry rendered CrateView in a void with no shell. Six desktop-only components existed solely because the desktop layout diverged from the mobile layout.

**After:** One component (BrowseShell) owns "store browsing" across all viewport tiers. One hook (useBrowseRouting) owns the mapping between server data and browse modes. One routing hook (useCrateRouting) owns the distinction between direct URL entry and in-session selection. 10 components and ~1,800 lines deleted. 441 tests pass.

## When to Apply

- When you have two or more components that handle the same logical surface at different viewport tiers and they have diverged in behavior (not just layout).
- When a navigation model exists in one component but not another, causing features to be inconsistently available across breakpoints.
- When URL-driven state renders outside the shell, cutting off navigation.
- **Do not apply** when components diverge only in CSS and the navigation model is already shared — Tailwind responsive classes are sufficient.

## Examples

### Before: StoreFloor section iteration (no shared navigation model)

```tsx
// store_floor.tsx — inline section mapping, no mode concept
{sections.map((section) => {
  if (section.key === "picks_wall") {
    return <PicksShelf crate={picks} onSelectCrate={onSelectCrate} ... />;
  }
  if (section.key === "featured_crates") {
    return <FeaturedCratesRow crates={section.crates} ... />;
  }
  if (section.key === "genre_grid") {
    return <GenreGrid crates={section.crates} ... />;
  }
})}
```

### After: useBrowseRouting extracts sections once, BrowseShell renders the active mode's panel

```tsx
const { wall, featured, genres } = useMemo(() => sectionCrateMap(sections), [sections]);

const panel =
  mode === "wall" ? (
    <WallPanel crate={wall} />
  ) : (
    <CrateBrowsePanel
      config={COPY.cratePanels[mode]}
      crates={mode === "featured" ? featured : genres}
      activeSlug={activeSlug}
      startIndex={startIndex}
      onSelectCrate={selectCrate}
    />
  );
```

## Implementation Pitfalls

### Auto-select behavior on mode switch

`handleBrowseModeSelected` auto-selects the first crate in the new mode if the current selection isn't in that mode. This means switching modes triggers a `selectCrate` call and URL update. If you need mode switching without URL changes, decouple mode state from selection state.

### WallPanel grid layout iterations

The grid layout went through five iterations before settling on: compact 2x3, comfy 4x2, wide 5x3. The backend sends 15 picks; compact caps at 12 (2 pages of 6). If the backend record count changes, both `TIER_DENSITY` and the compact cap need updating — they're coupled to the data contract.

### Footer covering content (h-dvh vs min-h-screen)

An early iteration used `h-dvh` for the shell container, which caused the fixed footer to cover the last row of content. Reverted to `min-h-screen` — the content pushes the page taller, and the fixed nav floats above it.

### Peek sheet axis inversion

When migrating from `isDesktop` to `isCompact`, every ternary controlling placement axis must be inverted. `initial={{ y: "100%" }}` (bottom sheet) belongs to compact, `initial={{ x: "100%" }}` (side panel) belongs to desktop.

## Related

- `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md` — the three-tier viewport system and `useViewport()` hook
- `docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md` — guard-parity prevention rules for responsive refactors
- `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md` — animation token architecture used by WallPanel
- `docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md` — shell contract (MilkcrateShell) BrowseShell renders inside
- GitHub #90 — PRD: Storefront hierarchy UI shell
- GitHub #216 — Audit the shopper-facing frontend as one unified storefront system
- GitHub #217 — Define the mobile-first adaptive store page hierarchy
