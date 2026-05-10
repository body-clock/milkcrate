---
date: 2026-05-09
topic: mobile-first-design
focus: Full pass on mobile-first design
mode: repo-grounded
---

# Ideation: Mobile-First Design Pass

## Grounding Context

Rails 8 + Inertia.js + React 19 + TypeScript + Framer Motion 12.38 + Tailwind CSS v4. Record store browsing app (milkcrate) — ~14 React components, dark-mode-first design, PWA foundation.

**Current mobile state:** Single 768px binary breakpoint (`useIsDesktop`), inline `sm:` Tailwind classes only, one JS-branched responsive component (store_floor), no mobile navigation (no hamburger, no bottom nav, no drawer), sticky header identical across all viewports, `touchAction: "none"` everywhere, bare two-line service worker with no caching. matchMedia mock always returns `false` in tests — desktop code path has zero test coverage. Four-layer animation token architecture is proven and reusable.

**Product strategy:** Make online record browsing feel like walking into a record store — spatial bins, walls, genre sections. Tracks: Digital storefront character, Digger's algorithm, Store onboarding. Key metrics: outbound clicks to Discogs, items added to pile, crates browsed per session.

## Topic Axes

1. **Breakpoint infrastructure** — The token/hook/provider system that defines viewport tiers and how components query them
2. **Navigation & app chrome** — The header, navigation patterns, and structural UI at every viewport size
3. **Touch-first interactions** — How cards, crates, piles, and spatial elements respond to tap, swipe, drag, and scroll on touch devices
4. **Component-level responsive layout** — How individual components reflow at different breakpoints
5. **Typography & visual scale** — Font sizing, line heights, spacing tokens, and icon scaling that maintain visual hierarchy across viewports

## Ranked Ideas

### 1. Responsive Infrastructure Layer
**Axis:** Breakpoint infrastructure + Typography & visual scale
**Basis:** `direct:` `hooks/use_is_desktop.ts` (single 768px binary), `components/storefront_motion_config.tsx` (four-layer architecture proven reusable), `test/setup.ts:1-16` (matchMedia mock always returns `false`), `application.css` (existing `:root` custom property pattern)
**Rationale:** The entire responsive strategy is one hook gating one binary branch. A centralized provider + token cascade makes responsiveness mechanical. The test infrastructure gap (zero desktop-code-path tests today) makes every future responsive change unsafe until fixed.
**Downsides:** Adds abstraction layer; team must agree on named tier boundaries. Fluid clamp() for type conflicts with components wanting deliberate binary branches.
**Confidence:** 85%
**Complexity:** Medium
**Status:** Explored → [Requirements doc](../brainstorms/2026-05-09-responsive-infrastructure-layer-requirements.md)

### 2. Navigation That IS the Store Floor
**Axis:** Navigation & app chrome
**Basis:** `direct:` `layouts/app_layout.tsx:22-67` (flat sticky header, identical across viewports, no scroll-awareness, no bottom navigation), `manifest.json:8` (portrait-primary lock, display: standalone — header IS the only chrome on PWA mobile). `external:` Luke Wroblewski, Mobile First — bottom navigation maps to thumb zone. `reasoned:` Product strategy is "walking into a record store" — navigation should embody that metaphor, not fight it with a website header.
**Rationale:** On mobile PWA standalone, a 56px sticky header at top of 375px phone consumes 15% of viewport height with zero navigation utility. Bottom tab bar + collapsing header reclaims space and gives users spatial orientation.
**Downsides:** May feel like generic app pattern. Spatial metaphor mapping (Bins = genres, Wall = featured) needs explanation on first use. Scroll-aware header adds JS complexity.
**Confidence:** 80%
**Complexity:** Medium-High
**Status:** Explored → [Requirements doc](../brainstorms/2026-05-09-navigation-store-floor-requirements.md)

### 3. Unified Gesture Primitives Library
**Axis:** Touch-first interactions
**Basis:** `direct:` `hooks/use_tactile_hover.ts:81-84` (isTouchRef pattern), `components/crate_view.tsx:26-28` (DRAG_THRESHOLD = 72, drag proven), `components/pile_sheet.tsx:74-76` (dragHandle rendered but no drag prop wired — broken affordance), `application.css:132-137` (.mc-crate-row CSS class defined but never applied in JSX — dead CSS). `external:` WCAG 2.2 Target Size 2.5.8 (minimum 24×24px; pile × button is ~14px).
**Rationale:** The codebase already has three-quarters of a gesture system implemented but not extracted — touch detection, proximity tracking, and drag handling all exist in separate components. Formalizing into primitives makes every future touch interaction a one-liner instead of 40 lines of duplicated pointer-event wiring.
**Downsides:** Gesture disambiguation (tap vs. long-press vs. swipe) is inherently complex and edge-case-prone. Gesture-only actions need onboarding affordances.
**Confidence:** 75%
**Complexity:** Medium
**Status:** Explored → [Requirements doc](../brainstorms/2026-05-09-gesture-primitives-library-requirements.md)

### 4. Component-Level Mobile Adaptations (Grid + Detail Sheet)
**Axis:** Component-level responsive layout + Touch-first interactions
**Basis:** `direct:` `components/store_floor.tsx:49-98` (full isDesktop ternary with two different markup trees), `components/crate_view.tsx:231-240` (details panel `hidden md:flex` — completely absent on mobile). `reasoned:` CSS Grid auto-fit with minmax() handles the "missing tablet tier" automatically. The listening station metaphor separates "browsing" from "evaluating."
**Rationale:** The picks wall JS branch is the only component-level responsive split, and both paths have problems — horizontal scroll fights thumb ergonomics, and 46vw cards have no upper bound. CSS Grid auto-fit solves both. The hidden details panel on mobile means pile/add actions require an unreliable flip gesture.
**Downsides:** CSS Grid auto-fit doesn't animate between column counts. Listening station sheet adds another gesture target to CrateView.
**Confidence:** 90% (Grid) / 70% (Detail sheet)
**Complexity:** Low (Grid) / Medium (Detail sheet)
**Status:** Explored → [Requirements doc](../brainstorms/2026-05-09-component-mobile-adaptations-requirements.md)

### 5. Animated Spatial Transitions (Enfilade)
**Axis:** Navigation & app chrome
**Basis:** `direct:` `pages/stores/featured.tsx:36-47` (activeSlug ternary with no AnimatePresence), `lib/motion_tokens.ts:28` (springDrawer preset already defined), `components/pile_sheet.tsx:57-72` (AnimatePresence + springDrawer proven for drawers). `reasoned:` Product strategy says "walking into a record store" — page replacement without spatial animation breaks the metaphor at the most critical moment.
**Rationale:** Highest impact-to-effort ratio — animation tokens already exist, AnimatePresence is already used elsewhere, the StoreFloor/CrateView boundary is a single ternary. Adding spatial transitions makes navigation feel like moving through a space.
**Downsides:** AnimatePresence exit animations add navigation latency. Shared-element transitions via layoutId require matching element keys across components.
**Confidence:** 85%
**Complexity:** Low-Medium
**Status:** Explored → [Requirements doc](../brainstorms/2026-05-09-animated-spatial-transitions-requirements.md)

### 6. Offline-First Mobile Experience
**Axis:** Navigation & app chrome + Cross-cutting
**Basis:** `direct:` `public/sw.js:1-2` (entire service worker is skipWaiting() + clients.claim()), `public/manifest.json` (PWA manifest configured but bare — no icons, no screenshots, no shortcuts). `external:` Web.dev PWA criteria — offline support sees ~30% higher re-engagement.
**Rationale:** Mobile-first design isn't just about screen size — it's about the mobile usage context (intermittent connectivity, standalone app expectations). The PWA foundation exists but does nothing useful. Filling it in changes the app from "a website that looks ok on phones" to "a record store in your pocket."
**Downsides:** Aggressive image caching could consume device storage. Workbox adds a build dependency. Orthogonal to responsive layout — could be tracked separately.
**Confidence:** 75%
**Complexity:** Medium
**Status:** Explored → [Requirements doc](../brainstorms/2026-05-09-offline-first-mobile-requirements.md)

## Rejection Summary

| # | Idea | Reason |
|---|------|--------|
| A1 | Viewport-tier provider (Pain) | Absorbed into #1 |
| A2 | Delete useIsDesktop, container queries only | Container queries complement but don't replace tiers; absorbed into #1 |
| A3 | Input-mode-driven tier (pointer/touch/hybrid) | Over-engineered for current stage |
| A4 | Orientation as first-class layout axis | Absorbed into #2 |
| A7 | "Lighting zones" viewport token cascade | Absorbed into #1 |
| A8 | CSS custom-prop tier via single observer | Absorbed into #1 |
| A9 | Infinite fluid continuum — kill every breakpoint | Loses deliberate tier semantics for product metaphor |
| A10 | Container queries on all 14 components | Absorbed into #1 + #4 |
| B1 | Bottom tab bar with collapsing header | Absorbed into #2 |
| B2 | Scroll-padding for sticky header | Supportive detail, not standalone |
| B3 | Delete header entirely | Too radical; #2's collapsing header is better balance |
| B4 | Ambient disappearing header | Absorbed into #2 |
| B7 | "Thrust stage nav" orientation-aware chrome | Absorbed into #2 |
| B9 | Crate-as-nav bottom sheet | Better suited for ce-brainstorm |
| B11 | Sheet-based z-stack navigation | Major architectural shift; brainstorm candidate |
| C1 | Touch flip vs drag zone split | Absorbed into #3 |
| C2 | Swipe-to-dismiss PileSheet | Absorbed into #3 |
| C3 | Momentum scroll + snap points | Absorbed into #3 |
| C4 | Invert pile removal — swipe to dismiss | Absorbed into #3 |
| C5 | Remove instruction text — pulse affordance | Absorbed into #3 |
| C6 | Long-press peeking inline crate preview | Absorbed into #3 |
| C9 | "Tactile pressure zones" adaptive gestures | Absorbed into #3 |
| C10 | Orientation-responsive gyroscope views | Gimmicky; DeviceOrientation reliability concerns |
| C11 | No buttons — continuous gesture surface | Too radical for current stage; discoverability risk |
| D1 | Min/max-clamped 46vw card sizing | Absorbed into #4 + #1 |
| D3 | Content-density provider | Absorbed into #4 |
| D4 | Physical-store layout analogues per viewport | Absorbed into #2 |
| D5 | Container-query reflow everywhere | Absorbed into #4 + #1 |
| D6 | Cross-tier layout animations | Absorbed into #5 |
| D7 | "Face-out shelving" density scaling | Absorbed into #2 |
| D8 | "Scale-dependent rendering" detail levels | Absorbed into #4 |
| D9 | Nav morphing via container queries | Absorbed into #2 |
| E1 | Mobile-first type ramp tokens | Absorbed into #1 |
| E2 | Fluid type from clamp() | Absorbed into #1 |
| E3 | Fluid typography mirroring animation tokens | Absorbed into #1 |
| E5 | "Splash page rhythm" section spacing | Absorbed into #1 |
| E6 | Smartwatch flick — 44mm first | Creative exercise, not practical |
| B5 | Device-native PWA (full install/haptic/share) | Partially absorbed into #6 |
| B10 | Offline-first service worker pre-caching | → Promoted to #6 |
