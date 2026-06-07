---
title: Compact storefront grid viewport fit — cumulative chrome reclamation
date: 2026-06-05
category: ui-bugs
module: storefront
problem_type: ui_bug
component: frontend_stimulus
symptoms:
  - "2x3 Wall record grid requires scrolling on compact viewport (375x667)"
  - "AppHeader height jumps when pile button appears"
  - "Store description and listing count consume ~50-70px above the Wall grid"
  - "Safari 14.6 and older blocked by allow_browser versions: :modern"
  - "Peek sheet header wastes vertical space inside the dialog"
  - "Crate pills don't scroll to center on selection"
root_cause: inadequate_documentation
resolution_type: code_fix
severity: medium
related_components:
  - testing_framework
tags:
  - mobile
  - storefront
  - viewport
  - responsive
  - compact
  - wall
  - grid
  - header
---

# Compact Storefront Grid Viewport Fit — Cumulative Chrome Reclamation

## Problem

On compact (≤767px) viewports, the storefront Wall record grid (2×3 layout) was cut off below the browser fold. Multiple chrome elements — the StoreSummary area, AppHeader brand link, Wall section heading, and generous CSS spacing — combined to push the last row past the 667px iPhone SE viewport. The cumulative effect made the store feel broken rather than app-like.

## Symptoms

- The 2×3 Wall record grid required scrolling at iPhone SE (375×667) dimensions
- The AppHeader jumped height when the pile button appeared (items added to pile)
- Store description and listing count consumed ~50–70px above the Wall grid content
- The Wall section heading ("The Wall" + description line) added ~38px of non-essential chrome
- Grid gaps (`gap-2`) and section spacing (`space-y-3`) consumed more vertical space than necessary
- Safari 14.6 and older received a 406 "browser not supported" error despite the app not using any unsupported CSS features
- The peek sheet dialog had a header bar that took vertical space without adding value
- Crate pills didn't center on selection, making the active pill hard to spot in a long scrollable list

## What Didn't Work

- **Gap reduction alone.** Changing `gap-2` to `gap-1.5` on the grid container had negligible effect because the container height was pinned by `aspectRatio: "2/3"`. Gaps barely contribute to total grid height when tile sizing is aspect-ratio-driven.
- **Hiding only StoreSummary.** Removing the StoreSummary area (~50–70px) was the primary fix, but alone it wasn't enough — the header, heading, and spacing still pushed the grid past the fold.
- **Aspect ratio alone.** Adjusting `aspectRatio: "2/3"` to `0.67` reclaimed ~3px — barely noticeable. A larger reduction to `0.74` or `0.75` clipped tiles visually, which was unacceptable.
- **Browser gate as false protection.** `allow_browser versions: :modern` blocked Safari 14.6 but the app used no CSS features (`dvh`, advanced selectors) that actually break on that browser. The gate consumed viewport space with no benefit.
- **Single-gate guard swap.** An initial attempt to swap `isWide` → `isCompact` in `StoreSummary` without a corresponding outer gate in `show_store_content.tsx` would have regressed the wide tier, causing StoreSummary to render at ≥1024px.

## Solution

Eleven changes across 16 files, each reclaiming some vertical space. The cumulative effect fits the full 2×3 grid within the 667px iPhone SE viewport with 29.5px of clearance above the browser toolbar area.

### 1. Hide StoreSummary on compact (two-gate approach)

**Before:**
```tsx
// store_summary.tsx — guarded only on isWide
if (isWide || (!store.description && listingCount === 0)) { return null; }
```

**After:**
```tsx
// store_show_content.tsx — outer gate (show_store_content.tsx adds matching inner guard)
{p.activeSlug === null && !isCompact && !isWide && (
  <StoreSummary store={p.store} isWide={isWide} isCompact={isCompact} listingCount={p.listingCount} />
)}
```

The outer gate in `show_store_content.tsx` (`!isCompact && !isWide`) and the inner guard in `store_summary.tsx` (`isCompact || isWide || ...`) are intentionally redundant — a deliberate defense against the guard-drift bug documented in `docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md`. StoreSummary now renders only on comfy (768–1023px).

### 2. Remove "on MC" brand link from compact header

```tsx
// app_header_store_link.tsx — returns null on compact
export function StoreSubLink({ isCompact }: { isCompact: boolean }) {
  return isCompact ? null : (
    <Link href="/" className={linkClass}>
      <span className="text-[10px] tracking-widest uppercase text-mc-text-dim">
        on Milkcrate
      </span>
    </Link>
  );
}
```

Saves ~24px of AppHeader height. The brand link to the marketing page provides no value during store browsing.

### 3. Wall heading sr-only on compact

```tsx
// wall_panel_heading.tsx — visually hidden but accessible
<div className={isCompact ? "sr-only" : "space-y-1"}>
  <div className="text-sm font-semibold leading-none">{COPY.wall.heading}</div>
  <p className="text-xs text-mc-text-dim leading-relaxed">{COPY.wall.description}</p>
</div>
```

Saves ~26px. The heading remains in the accessibility tree (`sr-only`), so screen reader users still get the section context.

### 4. Tighten section gaps

```tsx
// wall_panel_content.tsx
<section role="region" aria-label={COPY.wall.regionLabel} className="space-y-1 md:space-y-3">
```

Saves ~8px on compact (from `space-y-3` to `space-y-1`). Comfy/wide tiers unchanged via `md:space-y-3`.

### 5. Tighter grid gap on compact

```tsx
// wall_panel_record_grid.tsx — in buildMotionProps
className: `grid ${gridCols} ${isCompact ? "gap-1.5" : "gap-2"}`,
```

Minor saving (~2px), but prevents the `aspect-ratio` container from clipping tiles at its lower boundary.

### 6. Remove "Wall peek" header from peek sheet

The `PeekHeader` component (header bar with "Wall peek" title, description, close button, and border) was deleted. The close button now floats at the top-right via absolute positioning inside the panel.

```tsx
// peek_sheet_panel.tsx — replaces PeekHeader with absolute CloseButton
<motion.div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1}
  aria-label="Record peek" ...>
  <div className="absolute right-2 top-2 z-10">
    <CloseButton onClose={onClose} />
  </div>
  {children}
</motion.div>
```

The dialog's `aria-labelledby` was changed to `aria-label` since the visible title was removed. `tabIndex={-1}` was added so the dialog can receive focus via the fallback in `useDialogFocusTrap`.

### 7. Use dialog focus trap fallback

```tsx
// use_dialog_focus_trap.ts — fall back to dialog focus when titleRef is null
if (titleRef.current) {
  titleRef.current.focus();
} else {
  dialogRef.current?.focus();
}
```

The `titleRef` created by `useDialogFocusTrap` was never bound to any DOM element after `PeekHeader` was removed. The fix adds a fallback: when `titleRef.current` is null (no title element to focus), focus the dialog container itself. This is accessible to all dialog consumers — the pile sheet still uses `titleRef` as before.

### 8. Remove browser version gate

```ruby
# application_controller.rb — removed
class ApplicationController < ActionController::Base
  # was: allow_browser versions: :modern
end
```

The app used no CSS features that break on older Safari (no `dvh`, no advanced CSS). The gate was blocking iOS 14.6 Safari users for no benefit.

### 9. Stabilize header height

```tsx
// app_header_brand.tsx — add min-h-10 to match pile button height
<div className="flex min-h-10 min-w-0 flex-col justify-center">
```

The pile button (`min-h-10`, 40px) appeared only when items were in the pile. The header jumped from 41px to 57px when it appeared. Adding `min-h-10` to the brand div keeps both sides of the header at a consistent 57px.

### 10. Center crate pills on selection

```tsx
// compact_crate_section.tsx — removed disableScrollOnActivate
<CrateTabs
  crates={crates}
  activeSlug={activeSlug}
  onSelect={(slug) => onSelect(slug)}
  compact
  classesFn={navTabClasses}
  // was: disableScrollOnActivate
/>
```

Re-enables `scrollIntoView({ behavior: "smooth", inline: "center" })` in `CrateTabs`. The prior `disableScrollOnActivate` was added because the expand/collapse animation (grid-template-rows CSS transition) and scroll animation potentially fought each other. Testing confirmed the two animations target different axes (vertical expand vs horizontal scroll) and don't conflict.

### 11. Remove dead `!isWide` guard from StoreSummary listing count

```tsx
// store_summary.tsx — listing count render (was: {!isWide && ...})
{listingCount > 0 && (
  <p className="text-xs text-mc-text-dim mt-1.5">
    {listingCount.toLocaleString()} vinyl listings
  </p>
)}
```

## Why This Works

The cumulative approach was necessary because no single change could fit the grid. The vertical budget on iPhone SE is 667px — minus ~50px for the browser toolbar and ~26px for other chrome leaves a ~591px content area.

Before the fixes, the content stack was:
- AppHeader: 65px
- StoreSummary: ~60px (description + listing count + margin)
- Wall heading: 38px
- Section gap + grid gap: ~30px
- Grid container (aspectRatio 2/3): 514px
- Page dots: 12px
- **Total: ~719px** — 52px over the viewport

After the fixes:
- AppHeader: 57px (stabilized)
- Wall heading: sr-only (0px visual space)
- Section gap (space-y-1): ~8px
- Grid container (aspectRatio 2/3, gap-1.5): 514px
- Page dots: 12px
- **Total: ~591px** — fits with 29.5px of clearance above the toolbar-safe area

The two-gate guard approach prevents regression: if a future refactor removes the outer gate in `show_store_content.tsx`, the inner gate in `store_summary.tsx` still protects against StoreSummary rendering on compact.

## Prevention

- **Maintain a viewport vertical budget** when adding or changing chrome on the compact storefront. Document the current allocations and expected headroom for the smallest target (iPhone SE, 375×667).
- **Test wall grid fit on the actual smallest target** after any change to the store floor shell, Wall panel, or header components. Use Playwright at 375×667 with the target device's user-agent.
- **Don't assume gap reductions fix aspect-ratio-pinned layouts.** When tile dimensions are driven by `aspect-ratio`, reducing gaps only redistributes space within the fixed container; it doesn't reduce container height.
- **Redundant guards are a legitimate defense against guard-drift.** When a performance-oriented refactor moves guards between layers, the dual-gate pattern prevents regressions. Document intentional redundancy with a reference to the guard-drift learning doc.
- **Browser version gates must be validated against actual CSS usage.** `allow_browser versions: :modern` is overly restrictive for apps that don't use modern CSS features like `dvh` or container queries.
- **Verify peeks sheet focus manually after structural changes.** The `titleRef` used by `useDialogFocusTrap` is easy to orphan when a header element is removed. Without it, keyboard focus stays on the trigger element behind the modal.

## Files Changed

- `app/controllers/application_controller.rb`
- `app/frontend/pages/stores/store_show_content.tsx`
- `app/frontend/pages/stores/show_store_content.tsx`
- `app/frontend/pages/stores/store_summary.tsx`
- `app/frontend/layouts/app_header_brand.tsx`
- `app/frontend/layouts/app_header_store_link.tsx`
- `app/frontend/components/wall_panel_content.tsx`
- `app/frontend/components/wall_panel/wall_panel_heading.tsx`
- `app/frontend/components/wall_panel_record_grid.tsx`
- `app/frontend/components/wall_record_peek_sheet/peek_sheet_panel.tsx`
- `app/frontend/components/wall_record_peek_sheet/peek_content.tsx`
- `app/frontend/components/wall_record_peek_sheet/index.tsx`
- `app/frontend/components/wall_record_peek_sheet/peek_header.tsx` (deleted)
- `app/frontend/hooks/use_dialog_focus_trap.ts`
- `app/frontend/components/browse_shell/compact_crate_section.tsx`
- `app/frontend/test/pages/responsive_surface_matrix.test.tsx`

## Related Issues

- GitHub issue [#237](https://github.com/body-clock/milkcrate/issues/237) — original bug report
- GitHub PR [#239](https://github.com/body-clock/milkcrate/pull/239) — implementation
- [Requirements doc](../brainstorms/2026-06-05-mobile-storefront-grid-fit-requirements.md)
- [Implementation plan](../plans/2026-06-05-001-fix-mobile-storefront-grid-fit-plan.md)
