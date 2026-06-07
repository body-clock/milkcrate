---
date: 2026-06-05
issue: 237
topic: mobile-storefront-grid-fit
---

# Mobile Storefront Grid Fit Requirements

## Summary

Remove the StoreSummary area on compact viewports so the full 2×3 Wall record grid fits without scrolling on common mobile devices (iPhone SE through Pro Max), leaving desktop unchanged.

---

## Problem Frame

On mobile, the store floor page wastes vertical space above the Wall record grid. The StoreSummary component—store description and listing count—consumes meaningful viewport height while the shopper is trying to browse records. Combined with browser chrome, this pushes the bottom row of the 2×3 grid below the fold, requiring a scroll for the last few pixels of content. The user already knows which store they are on from the AppHeader sticky bar; the description and listing count add no value during browsing.

---

## Requirements

**StoreSummary removal on compact**
- R1. On compact viewports (≤767px), the StoreSummary component (store description and listing count) does not render.
- R2. On comfy (768–1023px) and wide (≥1024px) viewports, StoreSummary behavior is unchanged.

**Grid viewport fit**
- R3. On compact viewports at iPhone SE dimensions (375×667 logical pixels), the full 2×3 Wall record grid is visible without scrolling.
- R4. If removing StoreSummary alone does not achieve R3, record card sizes or grid spacing may be reduced on compact viewports to close the gap.

**Desktop preservation**
- R5. Desktop and tablet layouts are unaffected by this change.

---

## Acceptance Examples

- AE1. **Covers R1, R3.** Given a 375×667 viewport, when the store floor page loads, then the full 2×3 Wall record grid is visible above the fold without scrolling, and no store description or listing count appears in the content area.
- AE2. **Covers R2, R5.** Given a ≥1024px viewport, when the store floor page loads, then StoreSummary renders the description and listing count as it does today.

---

## Success Criteria

- A mobile shopper sees the complete Wall record grid on first load without needing to scroll past a header block.
- No information is lost that a mobile shopper needs during browsing — store identity is already in the sticky AppHeader.
- Desktop shoppers see no change.

---

## Scope Boundaries

- AppHeader sticky bar changes
- CrateView or inside-crate layout (covered by `docs/brainstorms/2026-05-13-crate-view-mobile-space-requirements.md`)
- Featured or genre crate card grids
- Pile sheet or bottom navigation bar
- Desktop/tablet layout
- Record card visual redesign beyond minor sizing adjustments needed to meet R3

---

## Dependencies / Assumptions

- The existing viewport tier system (`useViewport` hook, compact/comfy/wide tiers) is available and reliable for conditional rendering.
- The AppHeader sticky bar already communicates store identity on compact viewports — no net loss of orientation.
- The Wall record grid layout (2 columns, 6 tiles per page on compact) remains structurally unchanged beyond possible spacing adjustments.
