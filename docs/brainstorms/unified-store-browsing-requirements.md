---
date: 2026-06-02
topic: unified-store-browsing
---

# Unify Store Browsing Around the Mobile Design Language

## Summary

Replace the two separate store-browsing view systems (compact `CompactBrowseShell` and comfy/wide `StoreFloor`) with one unified `BrowseShell` that renders the same panels at every viewport tier. On compact the nav bar anchors to the bottom; on comfy/wide it moves to the top as a horizontal tab strip. The same Wall, Featured, and Genres panels render at every size — adapted via responsive grid behavior, not separate component trees.

---

## Problem Frame

The store page (`stores/show.tsx`) currently forks into two entirely separate component trees:

- **Compact (≤767px):** `CompactBrowseShell` — bottom tab bar, `WallPanel`, `CrateBrowsePanel`, `useBrowseRouting` navigation model.
- **Comfy/Wide (≥768px):** `StoreFloor` — vertical scroll layout, `CrateShelf`, `CrateCard`, `CrateSectionGrid`, `FeaturedCratesRow`, `GenreGrid`, with no navigation model at all (just scroll).

These two trees share **no components** for store-level browsing and maintain **two different navigation models**. The comfy/wide side has ~7 components (`StoreFloor`, `PicksShelf`, `CrateShelf`, `CrateCard`, `CrateSectionGrid`, `FeaturedCratesRow`, `GenreGrid`) that are near-duplicates of the compact side's panels (`WallPanel`, `CrateBrowsePanel`). Every new store-level feature must be implemented twice.

`CrateView` itself is used on both sides but carries `isCompact` branches for header rendering, card stack behavior, and the desktop detail sidebar. These branches are a third axis of duplication inside the one shared component.

---

## Requirements

### Unified BrowseShell

- R1. A single `BrowseShell` component replaces both `CompactBrowseShell` and `StoreFloor` for all viewport tiers.
- R2. On compact tiers (≤767px), the shell renders a bottom-anchored tab bar with three tabs: The Wall, Featured, Genres (same as current `CompactBrowseShell`).
- R3. On comfy/wide tiers (≥768px), the same three tabs render as a horizontal top nav bar — styled as a tab strip, not a floating pill. The selected panel renders below.
- R4. The tab bar is always visible — including when a crate is active inside the shell. Tapping any tab returns to that browsing mode and clears the active crate.
- R5. `useBrowseRouting` becomes the single navigation model for all tiers. StoreFloor's implicit scroll-based model is removed.

### Unified panels

- R6. `WallPanel` becomes the single Picks/Wall surface at all tiers. On wider viewports it adapts by showing more columns and/or more tiles per page (responsive grid), but remains the same component.
- R7. `CrateBrowsePanel` with its `CrateChipBar` + `CompactCrateStage` becomes the single Featured and Genres surface at all tiers. On wider viewports the chip bar and inline crate stage expand to fill available width.
- R8. `CompactCrateStage` is renamed to `InlineCrateStage` (it is no longer compact-only).

### CrateView unification

- R9. `CrateView` keeps its desktop sidebar (`RecordDetails` + `ScoreBreakdown`) on comfy/wide tiers. On compact, the sidebar is hidden and details are accessible via the existing peek sheet pattern.
- R10. When `CrateView` is rendered inside the unified shell (crate selected from Featured or Genres panel), the shell owns the top-level navigation. `CrateView` receives `hideTabs` and `compactHeaderOwnedByLayout` props — the same contract `CompactCrateStage` already uses. This applies at all tiers.
- R11. When `CrateView` is rendered as a top-level page (deep-linked crate, `activeSlug` set at page load), it shows crate-switching tabs in its header as it does today.

### Deletions

- R12. The following components are deleted (their responsibilities absorbed by the unified shell and panels): `StoreFloor`, `CrateShelf`, `CrateCard`, `CrateSectionGrid`, `FeaturedCratesRow`, `GenreGrid`, and the `PicksShelf` wrapper inside `StoreFloor`.
- R13. `CompactBrowseShell` is deleted and replaced by `BrowseShell`.
- R14. `CompactCrateStage` is renamed to `InlineCrateStage`; the old name is removed.

### Tests

- R15. Existing tests for deleted components are removed. Existing tests for `WallPanel`, `CrateBrowsePanel`, `CrateView`, and `useBrowseRouting` are updated to cover comfy/wide tiers in addition to compact.
- R16. The responsive surface matrix test (`responsive_surface_matrix.test.tsx`) is updated to reflect the unified architecture — asserting the same components render at all tiers with responsive adaptations, not different component trees.

### Backward compatibility

- R17. The page-level component (`stores/show.tsx`) passes the same props it does today. The `storefront_sections` data shape is unchanged.
- R18. URL-based deep linking (`?crate=jazz`) continues to work identically at all tiers.

---

## Acceptance Examples

- AE1. **Covers R2, R3.** Given a store page on a 375px viewport, the tab bar renders at the bottom with three tabs. Given the same page on a 1024px viewport, the same three tabs render as a horizontal top nav bar.
- AE2. **Covers R4.** Given a user has selected a crate and is swiping through records, when they tap the "Wall" tab, the active crate is cleared and the Wall panel is shown.
- AE3. **Covers R6.** Given a Wall panel with 12 picks on a 375px viewport, tiles render in 2 columns, 6 per page. On a 1024px viewport, tiles render in 3 or 4 columns with more tiles per page. The same `WallPanel` component handles both.
- AE4. **Covers R7.** Given a Featured panel on a 375px viewport, the crate chip bar scrolls horizontally and the selected crate's stage fills the viewport. On a 1024px viewport, the same components render with more horizontal space — wider chip bar, wider card stack.
- AE5. **Covers R9.** Given a CrateView on a 375px viewport, no sidebar is visible. Given the same CrateView on a 1024px viewport, the sidebar with RecordDetails and ScoreBreakdown is visible next to the card stack.
- AE6. **Covers R18.** Given a user navigates to `/stores/philadelphiamusic?crate=jazz`, the crate opens at all tiers with the correct start index.

---

## Success Criteria

- The store page renders at all three viewport tiers (compact, comfy, wide) using the same component tree — `BrowseShell` + panels — with no tier-gated component swaps at the page level.
- At least 7 components and their associated test files are removed from the codebase.
- `stores/show.tsx` has a single rendering branch for browsing (down from the current three-way branch) and a single remaining branch for the "no crates yet" empty state.
- All existing responsive surface matrix tests pass after being updated to reflect the unified architecture.

---

## Scope Boundaries

- No changes to the home page, apply page, admin dashboard, or seller dashboard.
- No changes to `PileSheet`, `WallRecordPeekSheet`, `PileToast`, or any non-store components.
- No changes to the `storefront_sections` data shape or backend.
- No new visual design language — existing components are adapted, not redesigned.
- The `RecordTile`, `RecordCard`, `RecordDetails`, `ScoreBreakdown`, `BrandMark`, `Spinner`, `FeedbackMessage`, and all `ui/*` primitives are unchanged.
- `CrateView`'s peek sheet for record details on compact is unchanged. The desktop sidebar behavior is unchanged. No new detail-view patterns are introduced.

---

## Key Decisions

- **Top nav on desktop, not side-by-side panels:** Side-by-side panels introduce a second navigation model (two active panels, two state machines) and add conceptual weight. The top nav bar is the closest adaptation of the mobile design — same tabs, different position.
- **Top nav persists when crate is active:** Consistent with mobile behavior where the bottom tab bar stays visible. Acts as the natural "back to browsing" mechanism.
- **Desktop sidebar stays in CrateView:** Takes advantage of horizontal space without introducing a new pattern. The peek sheet already exists for compact; sidebar covers comfy/wide. This is the one remaining `isCompact` branch in CrateView that is justified by the medium difference.
- **`CrateSectionGrid` deleted rather than adapted:** Its role (responsive grid of `CrateCard`s) is a desktop-only pattern that duplicates `CrateBrowsePanel`'s role (select a crate from a list). The `CrateBrowsePanel` + `CrateChipBar` pattern works at all widths.

---

## Dependencies / Assumptions

- Assumes `WallPanel`, `CrateBrowsePanel`, `CrateChipBar`, and `CrateView` handle wider viewports without breaking — their current implementations use responsive Tailwind classes (e.g., aspect-ratio grids) that should scale naturally, but this must be verified during implementation.
- Assumes the `useBrowseRouting` hook can drive both compact and comfy/wide without structural changes — it already manages tab state and crate selection; the only change is that the nav bar position is CSS-driven.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R6, R7][Technical] What are the optimal column counts and tiles-per-page for WallPanel at comfy (768-1023px) vs wide (≥1024px)?
- [Affects R3][Technical] What is the exact visual treatment for the horizontal top nav bar — does it mirror the bottom pill styling (rounded, backdrop-blurred), or use a different desktop-native style (underline tabs, border-bottom)?
- [Affects R10][Technical] Does `InlineCrateStage` need any prop changes beyond the rename, or does `CompactCrateStage`'s existing contract (`hideTabs`, `compactHeaderOwnedByLayout`) work as-is at wider viewports?
