---
date: 2026-05-13
topic: crate-view-mobile-space
focus: Mobile crate view space efficiency, back navigation, store description persistence, and genre/crate controls
mode: repo-grounded
---

# Ideation: Crate View Mobile Space

## Grounding Context

Milkcrate is a Rails 8 + Inertia React + TypeScript app for browsing a Discogs seller inventory as curated crates. The product strategy says browsing should feel like walking into a record store: spatial bins, walls, and genre sections where the store character comes through without replacing the tactile record-shopping experience.

The current crate view already has a strong physical metaphor: a front-riffle stack with drag navigation, progress, large circular paginator buttons, and a desktop-only record detail panel. On mobile, `CrateView` is a single column: the back button renders above the crate tabs, the tab row is a horizontally scrolling list of every crate, the stack reserves `min-h-[390px]` plus padding around an `82vw` square card, and the desktop details panel is hidden entirely. This means scarce vertical space goes to navigation chrome and instructions while actual record information is mostly behind the card flip.

Relevant code:

- `app/frontend/components/crate_view.tsx:149-157` renders the current `← Store` button with `py-3 px-3 mb-4`.
- `app/frontend/components/crate_tabs.tsx:25-47` renders all crates as horizontally scrolling tabs with `px-2.5 py-1`.
- `app/frontend/components/crate_view.tsx:192-201` reserves the large stack footprint.
- `app/frontend/components/crate_view.tsx:330-363` renders large paginator buttons plus instructional copy.
- `app/frontend/components/crate_view.tsx:382-386` hides `RecordDetails` below `md`.
- `app/frontend/components/store_floor.tsx:66-106` already uses horizontal scrolling for mobile picks, so the app has more than one horizontal browse surface on phones.

Past learnings:

- `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md` says mobile responsive behavior should use `useViewport`, and touch devices should get press-state feedback without hover effects.
- The same learning notes that the picks wall disables small-card flip and routes users into `CrateView` for detail access. That makes crate view the right place to expose record details well on mobile.
- `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md` supports shared motion tokens and tactile identity, so any navigation redesign should reuse the existing interaction vocabulary.

External context:

- W3C WCAG 2.2 Success Criterion 2.5.8 requires pointer targets to be at least 24 by 24 CSS pixels unless spacing or equivalent-control exceptions apply: https://w3c.github.io/wcag/guidelines/22/
- Apple Human Interface Guidelines recommend a button hit region of at least 44 by 44 pt and a clear press state for custom buttons: https://developer.apple.com/design/human-interface-guidelines/buttons

## Topic Axes

- Header/navigation space
- Record detail access
- Crate switching and genre controls
- Thumb-first record movement

## Ranked Ideas

### 1. Compact Crate Header

**Description:** Replace the standalone `← Store` button plus separate tab row with one compact mobile crate header: a 44px-tall row containing an icon back button, the active crate name/count, and a compact crate-switcher affordance. Keep the existing larger desktop header behavior if it is working there. The store description should not persist inside this view; once a user enters a crate, the job is browsing records, not re-reading store positioning.

**Axis:** Header/navigation space

**Basis:** `direct:` `crate_view.tsx:149-157` spends a full row on `← Store`; `crate_view.tsx:370-373` immediately spends another row on tabs. `external:` Apple recommends 44x44 pt hit regions, so the answer is not a visually tiny target; it is an icon-sized hit area with less label/chrome.

**Rationale:** This directly addresses the oversized back control and description-persistence concern without reducing tap safety. It reclaims vertical space while preserving a reliable escape hatch.

**Downsides:** The label "Store" is clearer than a bare icon; the compact header needs an accessible name and enough visual affordance that users do not lose the way back.

**Confidence:** 90%

**Complexity:** Low

**Status:** Unexplored

### 2. Bottom Record Detail Tray

**Description:** Add a collapsed mobile detail tray below the active record or docked above the paginator. The default collapsed state shows title, artist, price, and pile/discogs actions in one dense strip; tapping or swiping expands to notes, genres, styles, and metadata. Keep the desktop `RecordDetails` panel unchanged.

**Axis:** Record detail access

**Basis:** `direct:` `crate_view.tsx:382-386` hides `RecordDetails` on mobile, while `record_card` flipping is the only mobile detail path. `direct:` the prior viewport learning says crate view is where details should be available because small wall cards intentionally disable flips.

**Rationale:** Mobile users should not have to spend vertical space on static store copy or instructional text while the active record's buy/add context is hidden. A tray makes the screen feel more like a listening station: cover first, details within thumb reach.

**Downsides:** It adds another stateful surface and needs careful gesture priority so it does not fight the card drag.

**Confidence:** 86%

**Complexity:** Medium

**Status:** Unexplored

### 3. Crate Switcher Sheet Instead Of Endless Tabs

**Description:** Replace the mobile horizontal `CrateTabs` row with a "Crates" button that opens a bottom sheet grouped by featured crates and genres. Use large list rows or a two-column compact grid with counts, current-crate state, and search/filter if the genre count grows. Keep horizontal tabs on desktop where scan width is cheap.

**Axis:** Crate switching and genre controls

**Basis:** `direct:` `crate_tabs.tsx:25-47` maps every crate into a single overflow-x tab list. `direct:` user feedback says the genre buttons scroll for a long time and are not easy to hit on mobile. `external:` WCAG 2.2 target sizing makes tightly packed `px-2.5 py-1` chips a risk unless spacing and dimensions remain sufficient.

**Rationale:** The current control optimizes for a handful of tabs, but genre crates are an inventory taxonomy and can grow. A sheet gives the taxonomy room, bigger targets, and a clearer "change section" mental model.

**Downsides:** Switching crates becomes two taps instead of one when the desired crate is nearby. The sheet needs focus management and escape behavior.

**Confidence:** 88%

**Complexity:** Medium

**Status:** Unexplored

### 4. Cover-First Stack With Adaptive Height

**Description:** Make the mobile stack footprint depend on the viewport: keep the cover square large, but remove the fixed `min-h-[390px]` on very short screens and cap the square with `min(78vw, calc(100svh - header - controls - tray))`. The stack should be visually dominant without forcing the paginator and details below the fold.

**Axis:** Thumb-first record movement

**Basis:** `direct:` `crate_view.tsx:192-201` reserves `min-h-[390px]` plus an `82vw` square before progress, paginator, and instructions. `reasoned:` mobile viewport height is the scarce resource here; a fixed minimum makes the layout least efficient on the devices where efficiency matters most.

**Rationale:** This preserves the crate metaphor instead of shrinking it into a list, but lets the rest of the interaction breathe. It also gives the detail tray a chance to exist without making the page feel buried.

**Downsides:** Dynamic sizing needs visual testing across small phones, address-bar states, and standalone PWA mode.

**Confidence:** 82%

**Complexity:** Medium

**Status:** Unexplored

### 5. Gesture-First Navigation, Buttons As Secondary

**Description:** Keep drag/swipe as the primary mobile record movement and demote the two 56px circular paginator buttons to a compact secondary rail: smaller visual icons with 44px hit areas, or a single segmented control near the progress counter. Retain full keyboard support and desktop buttons.

**Axis:** Thumb-first record movement

**Basis:** `direct:` `crate_view.tsx:166-175` already supports drag navigation, and `crate_view.tsx:330-359` still renders two large circular buttons plus a count. `external:` Apple recommends a press state and sufficient hit region, not necessarily large visual buttons.

**Rationale:** The app already invested in a tactile card-stack gesture. On mobile, visible controls should support the gesture rather than compete with it for vertical space.

**Downsides:** Some users do not discover gestures; the first-run instructional affordance needs to be more elegant than permanent copy.

**Confidence:** 78%

**Complexity:** Low

**Status:** Unexplored

### 6. One-Time Gesture Hint, Not Permanent Instruction Copy

**Description:** Replace the persistent text "pull forward for next · push back for previous · tap for details" with a short-lived affordance: a subtle first-card nudge, a small "Swipe" hint that disappears after interaction, or an accessible helper tied to the progress area. Store the dismissal in local state or local storage if needed.

**Axis:** Header/navigation space

**Basis:** `direct:` `crate_view.tsx:361-363` renders permanent mobile instruction copy below the paginator. `reasoned:` persistent instructions are expensive in a vertically constrained flow once the user has learned the gesture.

**Rationale:** This is a small space win that makes the interface feel more confident. The product should behave like a familiar tactile object after the first cue, not keep explaining itself.

**Downsides:** If the cue is too subtle, gesture discovery may suffer. It should be tested with users who have not seen the crate view before.

**Confidence:** 74%

**Complexity:** Low

**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Keep store description pinned above crate view | Conflicts with the user's instinct and the view's task; better suited to the store floor. |
| 2 | Convert crate view to a plain vertical record list | Subject-replacement: abandons the physical crate metaphor that is central to the product strategy. |
| 3 | Make every genre chip larger in the existing horizontal tab row | Helps hit targets but worsens the long-scroll problem the user named. |
| 4 | Hide all crate switching until returning to store | Overcorrects; users browsing crates per session is a key metric, so switching should stay available. |
| 5 | Add a search box to the crate view header | Useful only at larger inventory scale; not grounded enough for this specific mobile space problem. |
| 6 | Turn the back button into a browser-style breadcrumb | Takes more horizontal space than an icon back button and does not solve the vertical-space issue. |
| 7 | Move all controls into a floating radial menu | Novel but too expensive and likely less accessible than a sheet/header combination. |
