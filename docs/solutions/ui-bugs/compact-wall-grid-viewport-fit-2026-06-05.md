---
title: "Compact mobile storefront: Wall record grid cut off below the fold"
date: 2026-06-05
last_updated: 2026-06-05
category: ui-bugs
module: storefront
problem_type: ui_bug
component: frontend_stimulus
symptoms:
  - "2×3 Wall record grid on compact (≤767px) extends past bottom of viewport — user must scroll to see bottom row"
  - "AppHeader height jumps ~8px when pile items are added, shifting entire page layout"
  - "Peek sheet dialog shows empty header bar with 'Wall peek' title, wasting ~50px on compact"
  - "StoreSummary (description + listing count) renders on compact, taking ~50-70px above the grid"
  - "Crate pills in bottom nav don't auto-scroll selected pill into centered view on first load"
  - "Safari 14.6 users blocked by browser version gate despite app not using modern-only CSS"
root_cause: inadequate_documentation
resolution_type: code_fix
severity: medium
tags: [responsive, viewport, mobile, compact, wall-grid, header, focus-management, iOS-safari]
---

# Compact Mobile: Wall Record Grid Cut Off Below the Fold

## Problem

On compact viewports (≤767px), the storefront's 2×3 Wall record grid was pushed below the visible viewport by a combination of chrome elements — StoreSummary, brand link in the header, Wall heading, and CSS spacing — none of which were individually excessive, but together exceeded the ~667px safe area on mobile (especially with iOS Safari chrome subtracting ~50px for the toolbar).

## Symptoms

- **Bottom row of 2×3 grid invisible** on first load without scrolling; the grid clipped at ~3-4 tiles visible instead of all 6
- **Header height inconsistent** — jumping from ~49px to ~57px when items are added to the pile and the pile button appears
- **Crate pills in bottom nav** didn't auto-center on the selected crate; first load showed the leftmost pill, not the active one
- **Safari 14.6 users** hit a 400-page (blocked by `allow_browser versions: :modern`), even though the app uses no modern-only CSS
- **Peek sheet dialog** on compact showed a "Wall peek" header bar that pushed the record image down, reducing usable peek content area
- **Focus broken** after peek sheet opened — the focus trap tried to focus the removed header's `titleRef`, which was null, so nothing received focus

## What Didn't Work

1. **Single large gap reduction.** Reducing `space-y-3` to `space-y-1` alone didn't fix it — the grid container height is pinned by `aspect-ratio`, so gap changes inside the grid (between tiles) had no effect on the container height.

2. **Tightening grid gap only.** Changing `gap-2` to `gap-1.5` saved ~3px total — negligible against the ~150px cumulative overflow.

3. **Adjusting aspect ratio alone.** Changing from `2/3` to `0.67` helped fit the grid but if any chrome element remained above the grid (StoreSummary, header brand link, Wall heading), the bottom row still got pushed off.

4. **Browser version gate as a guard.** `allow_browser versions: :modern` was meant to prevent CSS issues on old browsers, but it was a false tradeoff — blocking all Safari 14.6 users when the app doesn't use any CSS features that break on that engine (no `dvh`, no advanced container queries at the time).

## Solution

The fix was spread across 11 commits touching 16 files, each reclaiming a specific piece of vertical space or stabilizing a layout inconsistency. The cumulative effect made the full 2×3 grid fit within ~617px (accounting for iOS Safari toolbar).

### 1. Hide StoreSummary on compact (reclaims ~50-70px)

The StoreSummary component renders store description + listing count. On compact, this is redundant — the store name is in the header and the grid is the primary content.

**Before:** `isWide` guard only — StoreSummary rendered on both compact and comfy:
```tsx
// show_store_content.tsx
{p.activeSlug === null && (
  <StoreSummary store={p.store} isWide={isWide} listingCount={p.listingCount} />
)}

// store_summary.tsx
if (isWide || (!store.description && listingCount === 0)) { return null; }
```

**After:** Two-gate approach — outer gate in `show_store_content` blocks it entirely on compact; inner gate in `store_summary` as backup:
```tsx
// show_store_content.tsx — outer gate
{p.activeSlug === null && !isCompact && !isWide && (
  <StoreSummary store={p.store} isWide={isWide} isCompact={isCompact} listingCount={p.listingCount} />
)}

// store_summary.tsx — inner guard (belt-and-suspenders)
if (isCompact || isWide || (!store.description && listingCount === 0)) { return null; }
```

### 2. Remove "on MC" brand link from compact header (reclaims ~24px)

The `StoreSubLink` rendered "on MC" / "on Milkcrate" as a brand link to the marketing page. During store browsing, this offers no value — the user is already in a store.

**Before:**
```tsx
export function StoreSubLink({ isCompact }: { isCompact: boolean }) {
  return (
    <Link href="/" className={linkClass}>
      <span className="text-[10px] tracking-widest uppercase text-mc-text-dim">
        {isCompact ? "on MC" : "on Milkcrate"}
      </span>
    </Link>
  );
}
```

**After:** Returns `null` on compact — saves the full line-height of the text span:
```tsx
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

### 3. Wall heading screen-reader-only on compact (reclaims ~26px)

The Wall heading and description paragraph served as section identification. On compact, the section context is obvious from the crate pill tab bar — the heading text was redundant visually but still important for screen readers.

**Before:**
```tsx
export default function WallPanelHeading() {
  return (
    <div className="space-y-1">
      <div className="text-sm font-semibold leading-none">{COPY.wall.heading}</div>
      <p className="text-xs text-mc-text-dim leading-relaxed">{COPY.wall.description}</p>
    </div>
  );
}
```

**After:** `sr-only` on compact — visually hidden, accessible to screen readers:
```tsx
export default function WallPanelHeading({ isCompact }: Props) {
  return (
    <div className={isCompact ? "sr-only" : "space-y-1"}>
      <div className="text-sm font-semibold leading-none">{COPY.wall.heading}</div>
      <p className="text-xs text-mc-text-dim leading-relaxed">{COPY.wall.description}</p>
    </div>
  );
}
```

### 4. Tighten section gap (saves ~8px)

The Wall section had uniform `space-y-3` on all viewports. On compact, the gap between the grid and the page dots below it was unnecessarily large.

**Before:**
```tsx
<section role="region" aria-label={COPY.wall.regionLabel} className="space-y-3">
```

**After:** Responsive gap — compact gets `space-y-1`, comfy/wide keep `space-y-3`:
```tsx
<section role="region" aria-label={COPY.wall.regionLabel} className="space-y-1 md:space-y-3">
```

### 5. Tighten grid gap on compact (saves ~3px)

The grid gap between record tiles was `gap-2` (8px) on all viewports. Compact tiles are smaller; the gap doesn't need to be as generous.

**Before:**
```tsx
className: `grid ${gridCols} gap-2`,
```

**After:** Conditional gap — `gap-1.5` on compact, `gap-2` on comfy/wide:
```tsx
className: `grid ${gridCols} ${isCompact ? "gap-1.5" : "gap-2"}`,
```

### 6. Fix grid `aspect-ratio` to prevent tile clipping

The grid container's `aspect-ratio` was `2/3` with an inline style. When combined with the gap reduction, the grid height was still pinned by the ratio — gap changes inside don't affect container height.

**Before:** `aspectRatio: "2/3"`
```tsx
style={props.isCompact ? { position: "relative", aspectRatio: "2/3" } : undefined}
```

**After:** `aspectRatio: "0.67"` — slightly shorter container with the same tile dimensions (tiles themselves use padding-based aspect ratio):
```tsx
style={props.isCompact ? { position: "relative", aspectRatio: "0.67" } : undefined}
```

### 7. Remove browser version gate (Safari 14.6 compat)

`allow_browser versions: :modern` in Rails protects against very old browsers using advanced CSS, but the app doesn't use `dvh`, `@container`, or other features that break on iOS 14.6-era Safari. The gate was overly conservative.

**Before:** `app/controllers/application_controller.rb`
```ruby
class ApplicationController < ActionController::Base
  allow_browser versions: :modern
end
```

**After:**
```ruby
class ApplicationController < ActionController::Base
end
```

### 8. Stabilize header height with `min-h-10` (prevents layout shift)

The AppHeader's brand side (left) naturally had ~40px height from the store name + subtitle content. But the pile button side (right) only appeared when `pile.length > 0`, causing the header to collapse when empty and expand when items were added — a layout shift that changed the position of everything below.

The pile button also had a different `min-h` size on compact (`min-h-8` = 32px vs the default `min-h-10` = 40px), creating an asymmetric header.

**Before:** `app_header_brand.tsx`
```tsx
<div className="flex min-w-0 flex-col">
```

**Before:** `app_header_pile_button.tsx`
```tsx
const sizeClass = isCompact ? "min-h-8 px-2" : "min-h-10 px-3";
```

**After:** Add `min-h-10` and `justify-center` to the brand div, standardize pile button to `min-h-10` on all viewports:
```tsx
// app_header_brand.tsx
<div className="flex min-h-10 min-w-0 flex-col justify-center">

// app_header_pile_button.tsx — unified height, no isCompact conditional
const btnClass =
  "inline-flex min-h-10 items-center gap-2 rounded-md border border-mc-border bg-mc-bg-card px-3 text-xs font-semibold text-mc-accent ...";
```

### 9. Center selected crate pill on initial load

The CompactCrateSection had `disableScrollOnActivate` set, which prevented the pill navigation from calling `scrollIntoView({ inline: "center" })` when a crate was selected. On first load, the active crate pill might be off-screen in the scrollable pill bar.

**Before:**
```tsx
<CratePillNav
  ...
  disableScrollOnActivate
/>
```

**After:** Remove `disableScrollOnActivate` so `scrollIntoView` fires on selection:
```tsx
<CratePillNav
  ...
/>
```

### 10. Remove "Wall peek" header from peek sheet (reclaims ~50px)

The peek sheet dialog had a full header bar with "Wall peek" title, description text, and a close button in a flex row. On compact, this pushed the record image down, wasting limited screen real estate. The title was also semantically redundant — the dialog has `aria-label="Record peek"`.

**Before:** Header rendered inside `PeekSheetPanel`:
```tsx
<PeekHeader titleRef={titleRef} onClose={onClose} />
// where PeekHeader rendered:
// <div class="flex items-start justify-between ... px-4 py-3">
//   <div> <span id="wall-peek-title">Wall peek</span> <p>description</p> </div>
//   <CloseButton />
// </div>
```

**After:** Close button floats at top-right with absolute positioning — no header bar:
```tsx
<motion.div ... aria-label="Record peek" ...>
  <div className="absolute right-2 top-2 z-10">
    <CloseButton onClose={onClose} />
  </div>
  {children}
</motion.div>
```

### 11. Restore peek sheet focus on open (regression fix)

Removing PeekHeader also removed its `span#wall-peek-title` element that had `tabIndex={-1}` and served as the initial focus target. The focus trap in `engageFocusTrap` tried `titleRef.current?.focus()` but it was null — the dialog opened with no focused element.

**Before** `use_dialog_focus_trap.ts`:
```ts
titleRef.current?.focus();
```

**After:** Fall back to `dialogRef.current` when `titleRef` is null (the dialog now has `tabIndex={-1}`):
```ts
if (titleRef.current) {
  titleRef.current.focus();
} else {
  dialogRef.current?.focus();
}
```

The dialog element itself also needed to be focusable:
```tsx
// peek_sheet_panel.tsx
<motion.div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1} ...>
```

## Why This Works

Each individual change reclaimed a small amount of space or stabilized a layout behavior. The cumulative savings:

| Change | Space reclaimed |
|---|---|
| Hide StoreSummary | ~50-70px |
| Remove "on MC" link | ~24px |
| Wall heading sr-only | ~26px |
| Section gap tightened | ~8px |
| Grid gap tightened | ~3px |
| Grid aspect ratio adjusted | ~15px |
| Peek sheet header removed | ~50px |
| **Total** | **~176-196px** |

With ~617px of safe area (667px iPhone viewport minus ~50px iOS Safari toolbar), reclaiming ~176px provided more than enough headroom for the grid to fit without scrolling. The header stability fix and crate pill centering resolved secondary usability issues exposed during the viewport fit work.

## Prevention

1. **Viewport budget tracking.** For compact layouts, maintain a running viewport budget of all chrome elements above primary content (header, section headings, filters, summaries). Budget should account for iOS Safari toolbar (~50px), Safe Area insets, and any dynamic elements like banners.

2. **Component-level viewport responsibility.** Components that render above the fold on compact should accept `isCompact` and default to minimal chrome. StoreSummary, brand links, and section headings all benefit from this pattern.

3. **`aspect-ratio` + gap interplay.** When a container uses `aspect-ratio`, gap changes inside children don't affect container height. Measure the actual container height at each viewport tier, not just the sum of children + gaps.

4. **Focus trap resilience.** Always provide a fallback focus target in dialog focus traps. If the primary focusable element is conditionally rendered or removed, the trap should fall back to the dialog container or another stable element.

5. **Remove overly conservative browser gates.** `allow_browser versions: :modern` blocks Safari 14.6 and earlier unnecessarily. Gate only when the app actually uses features that break on the target browser versions.

6. **Test at real device dimensions.** Test compact layouts at 375×667 (iPhone SE) and 390×844 (iPhone 14) viewports with iOS Safari toolbar emulation, not just narrow browser windows. Headers behave differently on real iOS Safari.

## Files Changed

- `app/controllers/application_controller.rb` — removed `allow_browser` gate
- `app/frontend/components/browse_shell/compact_crate_section.tsx` — removed `disableScrollOnActivate`
- `app/frontend/components/wall_panel/wall_panel_heading.tsx` — `sr-only` on compact
- `app/frontend/components/wall_panel_content.tsx` — responsive section gap
- `app/frontend/components/wall_panel_record_grid.tsx` — grid gap + aspect ratio
- `app/frontend/components/wall_record_peek_sheet/index.tsx` — removed `titleRef` from return
- `app/frontend/components/wall_record_peek_sheet/peek_content.tsx` — removed `titleRef` from props
- `app/frontend/components/wall_record_peek_sheet/peek_header.tsx` — file deleted
- `app/frontend/components/wall_record_peek_sheet/peek_sheet_panel.tsx` — absolute close button, `tabIndex={-1}`
- `app/frontend/hooks/use_dialog_focus_trap.ts` — fallback focus to dialogRef
- `app/frontend/layouts/app_header_actions.tsx` — removed `isCompact` from PileButton
- `app/frontend/layouts/app_header_brand.tsx` — added `min-h-10 justify-center`
- `app/frontend/layouts/app_header_pile_button.tsx` — unified `min-h-10`, no compact conditional
- `app/frontend/layouts/app_header_store_link.tsx` — return null on compact
- `app/frontend/layouts/app_layout.test.tsx` — updated assertion for unified `min-h-10`
- `app/frontend/pages/stores/show_store_content.tsx` — outer `isCompact` gate for StoreSummary
- `app/frontend/pages/stores/store_show_content.tsx` — pass `isCompact` through
- `app/frontend/pages/stores/store_summary.tsx` — inner `isCompact` guard
- `app/frontend/test/pages/responsive_surface_matrix.test.tsx` — tier-specific assertions
- `app/frontend/components/wall_panel.test.tsx` — updated dialog name assertion
