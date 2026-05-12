---
date: 2026-05-09
topic: navigation-store-floor
---

# Navigation That IS the Store Floor

## Summary

A mobile-only bottom tab bar (Browse / Genres / Pile with count badge) owned by `AppLayout`, paired with a scroll-aware collapsing header that auto-hides on scroll-down and reappears on scroll-up. Desktop and tablet keep the existing sticky header unchanged. The tab bar persists across both `StoreFloor` and `CrateView`, with Browse acting as back-navigation when inside a crate.

---

## Problem Frame

The current mobile experience is a single long vertical scroll with no navigation shortcuts. A user on a phone must scroll past the header, store description, sync status, picks wall (with 46vw-tall cards), and featured crates before reaching the genre grid — there is no way to jump. The sticky header consumes ~15% of viewport height on a 375px phone and offers no navigation utility — it shows the store name, a Discogs link, a pile count button, and a theme toggle. None of these help the user navigate the page.

When a user enters a crate (`CrateView`), the StoreFloor unmounts. Going back re-renders the floor at scroll position zero. There is no persistent navigation chrome — the user is either "in the floor" or "in a crate" with only the browser back button and the crate tabs for navigation.

The product strategy says "make online browsing feel like walking into a record store." A real record store has spatial navigation — you walk between sections, you know where you are. The current app has no spatial navigation at all on mobile.

---

## Actors

- A1. **Mobile browser**: Uses the tab bar to jump between floor sections and access the pile without scrolling.
- A2. **Crate browser**: Uses the tab bar to return to the floor or jump to genres from inside a crate.
- A3. **Tablet/desktop user**: Unaffected — keeps the existing sticky header with no tab bar.

---

## Key Flows

- F1. **Mobile user browses the floor, jumps to genres**
  - **Trigger:** User taps the Genres tab.
  - **Actors:** A1
  - **Steps:** Tab bar registers the tap → if already on the floor, `document.querySelector('[data-section="genre_grid"]').scrollIntoView({ behavior: 'smooth' })` → if the Genres tab is already active (re-tap), re-trigger the scroll.
  - **Outcome:** The genre grid section scrolls into view. The header may be collapsed or visible depending on scroll position.
  - **Covered by:** R1, R4, R5

- F2. **Mobile user is in a crate, returns to the floor**
  - **Trigger:** User taps the Browse tab while `CrateView` is mounted.
  - **Actors:** A2
  - **Steps:** Tab bar registers the tap → layout detects the current route is a crate view → calls `router.visit('/')` or equivalent to navigate back to the StoreFloor → floor renders at the top.
  - **Outcome:** User is back on the StoreFloor at scroll position zero. The Browse tab is active.
  - **Covered by:** R1, R6

- F3. **Mobile user is in a crate, jumps to genres**
  - **Trigger:** User taps the Genres tab while `CrateView` is mounted.
  - **Actors:** A2
  - **Steps:** Tab bar registers the tap → layout detects current route is a crate view → navigates to the floor route → after StoreFloor mounts, scrolls to `[data-section="genre_grid"]`.
  - **Outcome:** User is on the StoreFloor with the genre grid in view.
  - **Covered by:** R1, R6, R7

- F4. **Mobile user scrolls down the floor — header collapses**
  - **Trigger:** User scrolls the main content down past the collapse threshold.
  - **Actors:** A1
  - **Steps:** `useScroll` on the main content element tracks `scrollY` → when `scrollY` exceeds the threshold (e.g., 60px) and scroll direction is down, the header's `y` transform animates to `-100%` (hidden) → tab bar remains fixed at the bottom.
  - **Outcome:** Header is hidden, reclaiming ~56px of vertical space. Tab bar is unaffected.
  - **Covered by:** R8, R9

- F5. **Mobile user scrolls up — header reappears**
  - **Trigger:** User scrolls upward by any amount.
  - **Actors:** A1
  - **Steps:** `useScroll` detects upward scroll direction → header's `y` transform animates to `0` (visible) using `springDrawer` or equivalent smooth transition.
  - **Outcome:** Header slides back into view. User can access the store name, theme toggle, and Discogs link.
  - **Covered by:** R8, R9

- F6. **Mobile user opens the pile from the tab bar**
  - **Trigger:** User taps the Pile tab.
  - **Actors:** A1
  - **Steps:** Tab bar registers the tap → calls the existing `setPileOpen(true)` from `AppLayoutInner` → PileSheet overlay renders → user interacts with the pile → user dismisses the pile (existing close behavior) → tab bar returns to the previously active tab.
  - **Outcome:** PileSheet overlay is open. The Pile tab does not stay "active" after the sheet closes — it reverts to the previous tab.
  - **Covered by:** R1, R3

---

## Requirements

### Tab Bar

- R1. A bottom tab bar with three destinations — Browse, Genres, Pile — is rendered by `AppLayout` on the compact viewport tier (≤767px). It is not rendered on comfy or wide tiers.
- R2. The tab bar is a fixed-position element at the bottom of the viewport (`position: fixed; bottom: 0`), with `padding-bottom: env(safe-area-inset-bottom)` for notched devices. Its height is 56px (including safe area padding).
- R3. The Pile tab displays a badge showing the current pile count from `PileContext` (same data source as the existing header pile button). The badge is hidden when the pile count is zero.
- R4. Tapping the active tab again triggers its primary action: Browse scrolls the floor to the top, Genres re-triggers the scroll to the genre grid. This is standard mobile tab bar re-tap behavior.
- R5. The tab bar's active indicator (underline, pill, or highlight on the active tab) transitions between tabs using Framer Motion's `layoutId` or the existing `springTactile` transition preset.

### Tab Behavior — StoreFloor

- R6. **Browse tab** (when on StoreFloor): scrolls the main content to the top. **Genres tab** (when on StoreFloor): scrolls the genre grid section into view using `element.scrollIntoView({ behavior: 'smooth' })`. The target element is identified by a `data-section="genre_grid"` attribute on the genre grid container in `StoreFloor`.
- R7. The StoreFloor renders `data-section` attributes on each major section container: `data-section="picks_wall"`, `data-section="featured_crates"`, `data-section="genre_grid"`. These are the scroll targets for the tab bar. The attribute names match the existing `section.key` values in `StoreFloor`.

### Tab Behavior — CrateView

- R8. **Browse tab** (when `CrateView` is mounted): navigates back to the StoreFloor route. This is a page navigation, not a history back — it ensures the floor renders fresh at the top. **Genres tab** (when `CrateView` is mounted): navigates to the StoreFloor route, then after the floor mounts, scrolls to the genre grid section.
- R9. The layout detects whether `CrateView` is mounted by checking the current route or page component. The tab actions differ based on this context.

### Header Collapse (Compact Tier Only)

- R10. The sticky header collapses (slides up out of view) when the user scrolls down past a threshold of 60px from the top of the main content. It reappears (slides back down) on any upward scroll.
- R11. The collapse animation uses Framer Motion: `useScroll` on the main content element tracks `scrollY`, and `useTransform` maps scroll position to the header's `y` translate value. The transition uses the existing `springDrawer` or a similar smooth preset.
- R12. The header collapse only applies to the compact tier. On comfy and wide tiers, the header remains sticky at all scroll positions (current behavior).

### Desktop / Tablet (Comfy and Wide Tiers)

- R13. On comfy (768-1023px) and wide (≥1024px) tiers, the header is unchanged from the current implementation — sticky top bar with store name, Discogs link, pile button, and theme toggle. The tab bar is not rendered.
- R14. The existing `useIsDesktop` import in `AppLayout` is migrated to `useViewport()` as part of Survivor #1's migration. The tier check `tier === 'compact'` gates all new tab bar and header collapse behavior.

### Content Area Adjustment

- R15. When the tab bar is rendered (compact tier), the main content area has `padding-bottom` equal to the tab bar height to prevent the tab bar from obscuring content at the bottom of the scroll.

### Migration / Coexistence

- R16. The existing pile button in the header is removed on compact tier (it's redundant with the Pile tab). On comfy/wide tiers, it remains unchanged.
- R17. The existing footer is hidden on compact tier (it would be obscured by or compete with the tab bar). On comfy/wide tiers, it remains unchanged.

---

## Acceptance Examples

- AE1. **Covers R1, R2.** Given a viewport width of 375px (compact tier), when `AppLayout` renders, then a fixed bottom tab bar with three labeled tabs (Browse, Genres, Pile) is visible. The tab bar has 56px height and respects `safe-area-inset-bottom`. Given a viewport width of 800px (comfy tier), when `AppLayout` renders, then no tab bar is rendered.

- AE2. **Covers R6.** Given the user is on the StoreFloor at scroll position 500px (picks wall in view), when the user taps the Genres tab, then the page smoothly scrolls until the genre grid section is at the top of the viewport.

- AE3. **Covers R8.** Given the user is in CrateView viewing a crate, when the user taps the Browse tab, then the app navigates to the StoreFloor route and renders the floor at scroll position zero.

- AE4. **Covers R8.** Given the user is in CrateView viewing a crate, when the user taps the Genres tab, then the app navigates to the StoreFloor route, and after the floor mounts, the genre grid scrolls into view.

- AE5. **Covers R10, R11.** Given the user is on the StoreFloor at compact tier, when the user scrolls down by 80px, then the header animates upward and is no longer visible. When the user scrolls up by any amount, the header animates back down and is fully visible.

- AE6. **Covers R12.** Given a viewport width of 800px (comfy tier), when the user scrolls down by any amount, the header remains sticky and visible (no collapse animation).

- AE7. **Covers R4.** Given the user is on the StoreFloor with the Browse tab active (already at the top), when the user taps the Browse tab again, then the page scrolls to the top. (If already at the top, no visible change — the action is idempotent.)

- AE8. **Covers R3.** Given the pile contains 3 records, when the tab bar renders, then the Pile tab shows a badge with the number 3. Given the pile is empty, when the tab bar renders, then no badge is shown on the Pile tab.

- AE9. **Covers R16, R17.** Given a viewport width of 375px (compact tier), when the header renders, then the pile count button is absent (it moved to the tab bar) and the footer is not rendered. Given a viewport width of 800px (comfy tier), when the header renders, then the pile count button is present and the footer is rendered.

---

## Success Criteria

- A mobile user can reach the genre grid in one tap from anywhere on the StoreFloor — no manual scrolling required.
- A mobile user can return to the StoreFloor from inside a crate in one tap — the Browse tab.
- The pile is one tap away from anywhere in the app on mobile — the Pile tab, with a live count badge.
- On mobile, the header reclaims vertical space during downward scroll and reappears instantly on upward scroll, with no jank or layout shift.
- Desktop and tablet users experience zero change — the existing header is untouched and no tab bar appears.

---

## Scope Boundaries

- Tab bar visual design (icons, labels, colors) — application work, not infrastructure. The requirements define behavior and structure; visual design follows.
- Header redesign beyond collapse — the header's content (store name, theme toggle, Discogs link) is unchanged.
- CrateView internal navigation (crate tabs, record card stack) — unchanged.
- PileSheet behavior — the overlay's open/close, swipe, and content are unchanged. The tab bar only triggers `setPileOpen(true)`.
- Search tab or additional destinations — not included.
- Deep linking into sections from external URLs — not included.
- Tab bar animations beyond the active indicator transition — the tab bar itself does not animate on/off screen (it's always visible on compact tier).
- Orientation-specific behavior beyond the tier check — the compact tier applies to all portrait phones; landscape phones that exceed 767px width get the comfy tier layout (no tab bar). This is acceptable; landscape phones have enough horizontal space that the header alone is sufficient.

---

## Key Decisions

- **Tab bar is mobile-only**: Adding a tab bar to tablet/desktop would compete with the existing header and add no navigation value — desktop users can see all sections at once and scroll with a trackpad/mouse wheel.
- **Layout owns the tab bar, not pages**: `AppLayout` already owns the PileSheet, theme, flash notices, and PileContext provider. Adding tab state is a natural extension of this pattern. Pages stay unaware of the tab bar — they just render content and expose `data-section` attributes.
- **Browse = back-navigation in CrateView**: Rather than keeping both the floor and CrateView mounted (z-stack approach), Browse triggers a page navigation. This is simpler, avoids memory pressure from keeping both views mounted, and uses the existing Inertia navigation.
- **Tab bar is always visible on compact tier**: It does not hide on scroll (unlike the header). A navigation bar that disappears creates discoverability problems — users forget it exists. The permanent vertical space cost (~56px) is acceptable because the header collapse reclaims an equal amount.
- **Footer hidden on compact tier**: The footer ("Powered by Milkcrate") adds no navigation value and would sit above the tab bar, creating visual clutter. It remains on desktop where screen real estate is abundant.

---

## Dependencies / Assumptions

- Survivor #1 (Responsive Infrastructure Layer) — the `useViewport()` hook and `ViewportProvider` are required for the `tier === 'compact'` check. The migration of `useIsDesktop` in `AppLayout` is part of that work.
- Framer Motion (already in use) — used for header collapse animation and tab bar active indicator transition.
- `PileContext` (already in use) — used for the Pile tab badge count.
- Inertia.js router (already in use) — used for Browse navigation from CrateView.
- The `data-section` attributes on StoreFloor sections are a simple convention — no new context, provider, or hook is needed for the tab bar to find scroll targets.

---

## Outstanding Questions

### Resolve Before Planning

(None — all scope-shaping decisions are resolved.)

### Deferred to Planning

- [Affects R10][Technical] Should the header collapse threshold (60px) be a constant or derived from the header's rendered height? If the header height changes (e.g., multi-line store names), a derived value is more robust.
- [Affects R8][Technical] How does the layout detect that CrateView is mounted — Inertia page component name, route path matching, or a context flag set by the CrateView page?
- [Affects R8][Technical] When Genres is tapped from CrateView, how is the "scroll after mount" coordinated? Options: a query param that StoreFloor reads on mount, a brief timeout after navigation, or a `requestAnimationFrame` poll for the genre grid element.
