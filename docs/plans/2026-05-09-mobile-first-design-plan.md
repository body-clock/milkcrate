---
date: 2026-05-09
topic: mobile-first-design
origin: docs/ideation/2026-05-09-mobile-first-design-ideation.md
origin_docs:
  - docs/brainstorms/2026-05-09-responsive-infrastructure-layer-requirements.md
  - docs/brainstorms/2026-05-09-navigation-store-floor-requirements.md
  - docs/brainstorms/2026-05-09-gesture-primitives-library-requirements.md
  - docs/brainstorms/2026-05-09-component-mobile-adaptations-requirements.md
  - docs/brainstorms/2026-05-09-animated-spatial-transitions-requirements.md
  - docs/brainstorms/2026-05-09-offline-first-mobile-requirements.md
status: draft
---

# Plan: Mobile-First Design Pass

## Summary

A full mobile-first design pass across the milkcrate frontend, implemented in six workstreams. Foundation: a `ViewportContext` Provider replacing the binary `useIsDesktop()` hook with three named tiers. Built on top: mobile tab bar navigation, gesture primitives, component-level responsive fixes, animated page transitions, and offline PWA support. The workstreams are sequenced by dependency — infrastructure first, then navigation, then gestures, then component adaptations, then transitions, with the independent PWA workstream runnable in parallel.

---

## Problem Frame

The app has a single responsive mechanism — `useIsDesktop()` with a 768px binary check. No tablet tier exists. Four components branch on a boolean with no shared vocabulary for viewport state. The test suite hardcodes `matchMedia` to always return `false`, giving zero desktop-code-path coverage. Mobile navigation is absent — users scroll through a single long page with no section-jumping. Touch gestures are embedded in individual components with no reusable primitives. The StoreFloor→CrateView transition is an instant page replacement with no animation. The PWA foundation exists but does nothing — a two-line service worker with no caching.

The product strategy says "make online record browsing feel like walking into a record store." A static header, jarring page transitions, unreliable touch gestures, and broken offline behavior all contradict that metaphor on mobile.

---

## Implementation Units

### IU-1: Responsive Infrastructure Layer

**Origin:** `docs/brainstorms/2026-05-09-responsive-infrastructure-layer-requirements.md`

**What:** ViewportContext Provider + useViewport() hook + CSS custom property + test utility + migration of 4 useIsDesktop call sites.

**Files to create:**
- `app/frontend/hooks/use_viewport.ts` — `useViewport()` hook reading from ViewportContext, returns `{ tier, isCompact, isComfy, isWide }`
- `app/frontend/contexts/viewport_context.tsx` — `ViewportProvider` component + `ViewportContext` + `useViewportContext()` (internal, with missing-provider throw)
- `app/frontend/hooks/use_viewport.test.ts` — unit tests for the hook and provider
- `app/frontend/test/viewport-test-utils.tsx` — `setViewportTier(tier)` test utility wrapping `render()` with injected tier

**Files to modify:**
- `app/frontend/layouts/app_layout.tsx` — add `<ViewportProvider>` to provider nest (alongside `StorefrontMotionConfig` and `PileProvider`), replace `useIsDesktop` import with `useViewport`, update header text/link labels to use `tier !== 'compact'` instead of `isDesktop`
- `app/frontend/components/store_floor.tsx` — replace `useIsDesktop` with `useViewport`, update picks wall `isDesktop` ternary (this will be further simplified in IU-4)
- `app/frontend/components/crate_view.tsx` — replace `useIsDesktop` with `useViewport`, update `disableFlip` prop and details panel visibility
- `app/frontend/components/pile_sheet.tsx` — replace `useIsDesktop` with `useViewport`, update `isDesktop` logic for side drawer vs bottom sheet positioning
- `app/frontend/components/storefront_shell.test.tsx` — migrate `vi.mock("@/hooks/use_is_desktop")` to use `setViewportTier`

**Files to delete:**
- `app/frontend/hooks/use_is_desktop.ts`

**Pattern to follow:** Mirror the `StorefrontMotionConfig` architecture (see `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md`):
- Layer 1: tokens (not in IU-1 — deferred to follow-up)
- Layer 2: `ViewportProvider` → wraps children, registers matchMedia listeners for 768px and 1024px boundaries, sets `--mc-viewport-tier` CSS custom property on `:root`
- Layer 3: `useViewport()` hook → reads ViewportContext
- Layer 4: wrappers (deferred to follow-up)

**Key decision:** Provider owns matchMedia listeners; the hook is a pure context read. The provider uses `matchMedia(query).addEventListener("change", handler)` — the modern API already used in `useIsDesktop`. Breakpoints 768px and 1024px are hardcoded constants in the provider.

**Risks from prior migration (Bug #1):** The provider must be wired into `AppLayout` before any consumer calls `useViewport()`. Write a smoke test that renders `AppLayout` and asserts `useViewport()` returns a tier without throwing. This is the exact bug that hit `StorefrontMotionConfig` — the provider was built but never added to the component tree.

**Test scenarios:**
- Provider renders and exposes tier via context
- useViewport() returns correct tier at each boundary (375px → compact, 800px → comfy, 1200px → wide)
- Resize across boundaries triggers re-render in consuming components
- CSS custom property --mc-viewport-tier is set on :root and updates on tier change
- setViewportTier('compact') renders component in compact tier without matchMedia mock
- setViewportTier('comfy') and setViewportTier('wide') work identically
- Missing-provider scenario: useViewport called outside ViewportProvider throws
- All 4 migration sites render correctly at each tier
- Search for useIsDesktop in codebase returns zero results after migration

---

### IU-2: Navigation That IS the Store Floor

**Origin:** `docs/brainstorms/2026-05-09-navigation-store-floor-requirements.md`

**What:** Bottom tab bar (Browse/Genres/Pile) on compact tier, scroll-aware collapsing header, tab bar persistence across StoreFloor and CrateView.

**Dependencies:** IU-1 (ViewportContext — `tier === 'compact'` gates the tab bar and header collapse).

**Files to create:**
- `app/frontend/components/mobile_tab_bar.tsx` — Fixed-position bottom tab bar with three tabs, active indicator animation using `springTactile`, PileContext badge, `env(safe-area-inset-bottom)` padding
- `app/frontend/hooks/use_scroll_aware_header.ts` — `useScroll` on main content, `useTransform` on header y, threshold at 60px, show on any upward scroll
- `app/frontend/components/mobile_tab_bar.test.tsx` — tab rendering, badge count, active tab indicator, tier visibility

**Files to modify:**
- `app/frontend/layouts/app_layout.tsx` — add `activeTab` state (`'browse' | 'genres' | 'pile'`), render `<MobileTabBar>` when `tier === 'compact'`, wire header collapse via `use_scroll_aware_header`, add `pb-[56px]` to main content on compact tier, remove pile button from header on compact tier (redundant with tab), hide footer on compact tier
- `app/frontend/components/store_floor.tsx` — add `data-section` attributes on picks wall (`data-section="picks_wall"`), featured crates row (`data-section="featured_crates"`), and genre grid (`data-section="genre_grid"`) containers
- `app/frontend/pages/stores/featured.tsx` — expose a way for the tab bar to detect whether CrateView is mounted (e.g., a context value or route check)

**Key decisions:**
- Tab bar is layout-owned, not page-owned. `AppLayout` manages `activeTab` state and dispatches scroll/navigate actions.
- Browse tab in CrateView: calls `router.visit('/')` to return to floor (via Inertia).
- Genres tab in CrateView: navigates to floor, then scrolls to `[data-section="genre_grid"]` after mount.
- Section scroll uses `element.scrollIntoView({ behavior: 'smooth' })` — no custom animation.
- Header collapse is independent of tab bar — tab bar stays fixed.
- Pile tab opens existing PileSheet overlay (calls `setPileOpen(true)`), reverts to previous tab on close.
- Tab bar is always visible on compact tier — does not hide on scroll.

**Test scenarios:**
- Tab bar renders on compact tier, hidden on comfy/wide
- Tapping Genres tab scrolls genre grid into view
- Tapping Browse tab scrolls to top of floor
- Tapping active tab again re-triggers the action (Browse → scroll to top, Genres → re-scroll)
- Tapping Pile tab opens PileSheet, reverts to previous tab on close
- Pile badge shows correct count from PileContext, hidden when zero
- In CrateView, Browse tab navigates back to StoreFloor
- In CrateView, Genres tab navigates to floor then scrolls to genre grid
- Header collapses on scroll-down >60px, reappears on any upward scroll
- Header collapse animation is smooth (no jank, uses springDrawer)
- Desktop/tablet: header unchanged, no tab bar, footer visible, pile button in header
- Tab bar respects safe-area-inset-bottom on notched devices
- Main content has padding-bottom equal to tab bar height on compact tier

---

### IU-3: Unified Gesture Primitives Library

**Origin:** `docs/brainstorms/2026-05-09-gesture-primitives-library-requirements.md`

**What:** Four gesture hooks (`useSwipeable`, `useLongPress`, `useTapOrDrag`, `usePullToAction`) with shared config, plus two immediate applications (swipe-to-dismiss PileSheet, long-press-to-pile).

**Dependencies:** IU-1 (useViewport for gating long-press to compact tier, though can fall back to pointerType detection).

**Files to create:**
- `app/frontend/lib/gesture_tokens.ts` — Config constants: `SWIPE_THRESHOLD` (72px), `LONG_PRESS_DURATION` (500ms), `TAP_MOVE_THRESHOLD` (10px), `PULL_THRESHOLD` (100px). Same location pattern as `motion_tokens.ts`.
- `app/frontend/hooks/use_swipeable.ts` — Detects unidirectional drag past threshold, returns `{ handlers, isSwiping, offset }`
- `app/frontend/hooks/use_long_press.ts` — Timer-based hold detection with haptic, returns `{ handlers, isPressed, isLongPressing }`
- `app/frontend/hooks/use_tap_or_drag.ts` — Cumulative movement disambiguation, returns `{ handlers, isDragging }`
- `app/frontend/hooks/use_pull_to_action.ts` — Pull-progress tracking for scroll containers, returns `{ handlers, pullProgress }`
- `app/frontend/hooks/use_swipeable.test.ts` — pointer event simulation tests for all four hooks
- `app/frontend/hooks/use_long_press.test.ts`
- `app/frontend/hooks/use_tap_or_drag.test.ts`
- `app/frontend/hooks/use_pull_to_action.test.ts`

**Files to modify:**
- `app/frontend/components/pile_sheet.tsx` — apply `useSwipeable` to the drag handle area with `direction: 'down'`, `onSwipe` calls `onClose`. Drag handle is a distinct element from scrollable content to avoid scroll-vs-swipe conflict.
- `app/frontend/components/record_card.tsx` — apply `useLongPress` on compact tier with `onLongPress` → `addToPile(record)`. Suppress `onClick` (flip) when long-press detected.

**Key decisions:**
- All hooks use `pointer` events (pointerdown/move/up/cancel) — consistent with `useTactileHover`.
- No provider or wrapper layer — hooks + config only. Follows `useIsDesktop` usage pattern, not `StorefrontMotionConfig`.
- Long-press gated to compact tier via `useViewport()` (falls back to `pointerType !== 'mouse'` if IU-1 not yet landed).
- Swipe-to-dismiss only from drag handle, not scrollable content — avoids scroll-vs-swipe disambiguation.
- Haptic feedback: `navigator.vibrate(10)` — no-op on iOS, functional on Android Chrome.

**Test scenarios:**
- useSwipeable: swipe past threshold fires onSwipe; below threshold does not; direction constraints work
- useLongPress: 500ms hold fires onLongPress; early release cancels; movement >10px cancels; haptic fires on supported browsers
- useTapOrDrag: movement < threshold → tap; movement > threshold → drag; cumulative tracking resets on pointerup
- usePullToAction: pullProgress 0→1 over pull distance; fires onPull at 1.0; only activates at scroll limit
- PileSheet: dragging handle down past threshold closes sheet; scrolling pile content does not close sheet
- RecordCard: long-press adds to pile, flips suppressed; tap still flips; long-press only active on compact tier
- All hooks handle pointer cancel (e.g., OS gesture interrupt)

---

### IU-4: Component-Level Mobile Adaptations

**Origin:** `docs/brainstorms/2026-05-09-component-mobile-adaptations-requirements.md`

**What:** CSS Grid auto-fit for picks wall, RecordCard flip improvements, apply page audit, admin waitlist stacked cards.

**Dependencies:** IU-1 (useViewport), IU-3 (long-press coexists with improved flip).

**Files to modify:**
- `app/frontend/components/store_floor.tsx` — delete `isDesktop` ternary (lines 39-71). Single markup: `grid` with `repeat(auto-fit, minmax(120px, 1fr))` via Tailwind classes, `TactileCard` wrappers on every card, `slice(0, 12)` on all tiers, `gap-1 sm:gap-2`. Delete horizontal scroll row markup entirely.
- `app/frontend/components/record_card.tsx` — increase `movedSincePointerDown` threshold from 8px to 16px when `pointerType !== 'mouse'`. Review back face text sizes: minimum `text-xs`, pile button ≥44×44px, Discogs link ≥44×44px. Display back cover image if present in listing data.
- `app/views/admin/waitlists/index.html.erb` — add `@media (max-width: 767px)` rule: hide table (`display: none`), show stacked card list. Each card: store name heading, labeled rows for all 6 columns. Use existing dark theme colors.
- `app/frontend/pages/apply.tsx` — audit at 375px width. Verify Turnstile widget fits viewport, form inputs are tappable, submit button ≥44px. Fix any overflow or touch-target issues found.

**Test scenarios:**
- Picks wall: 375px → 2 columns, 800px → 3-4 columns, 1200px → 5-6 columns. No horizontal scroll row at any width.
- Picks wall: all cards have TactileCard wrapper at all tiers
- Picks wall: `isDesktop` reference removed from file
- RecordCard flip: touch tap with 12px movement → flip fires. Same movement on mouse → may not fire.
- RecordCard back face: pile button ≥44×44px, Discogs link ≥44×44px, no text below `text-xs`
- RecordCard back cover: displays image when `back_cover_image_url` present, metadata-only when absent
- Long-press + flip coexistence: 500ms hold → pile add + no flip. Quick tap → flip.
- Admin page: 375px → stacked cards, 800px → table. No horizontal overflow at any width.
- Apply page: 375px → Turnstile fits, form usable, no horizontal scroll

---

### IU-5: Animated Spatial Transitions

**Origin:** `docs/brainstorms/2026-05-09-animated-spatial-transitions-requirements.md`

**What:** `AnimatePresence` + `layoutId` shared-element zoom transition between StoreFloor ↔ CrateView.

**Dependencies:** IU-1 (this is additive UI polish, can run in parallel with IU-2/3/4).

**Files to modify:**
- `app/frontend/pages/stores/featured.tsx` — wrap the `activeSlug === null` ternary in `<AnimatePresence mode="wait">`. Add `motion.div` wrappers with exit/enter animations. StoreFloor exit: `{ opacity: 0, scale: 0.95 }`. CrateView enter: inherited from layoutId match. Deep-link fallback: CrateView enters with `{ opacity: 0, scale: 0.97 }`.
- `app/frontend/components/crate_card.tsx` — add `layoutId={`crate-${slug}`}` to the outermost motion container. If the component doesn't use a motion element, wrap in `motion.div`.
- `app/frontend/components/crate_view.tsx` — add `layoutId={`crate-${activeSlug}`}` to the root motion container.

**Key decisions:**
- `mode="wait"` ensures exit completes before enter — avoids visual overlap.
- `layoutId` matching on crate slug connects the card and the view — Framer Motion handles position/size interpolation automatically.
- If `layoutId` crossfade doesn't work smoothly with CSS Grid source elements, fall back to fade + scale (no shared element). Planning verifies with a prototype.
- `springTactile` preset used for transitions (~300ms).

**Test scenarios:**
- Tapping CrateCard → card expands to fill screen, StoreFloor fades out
- Back navigation → CrateView shrinks to card, StoreFloor fades in
- Deep link to CrateView → fade + subtle scale entrance (no zoom from card)
- Multiple round-trips (floor → crate → floor → crate) work correctly
- Back/forward browser buttons trigger correct animations
- No layout thrash or jank during transitions

---

### IU-6: Offline-First Mobile Experience

**Origin:** `docs/brainstorms/2026-05-09-offline-first-mobile-requirements.md`

**What:** Native Cache API service worker (cache-first for images, precache static shell), in-app install prompt, polished PWA manifest.

**Dependencies:** None — independent workstream. Can run in parallel with any other IU.

**Files to create:**
- `public/sw.js` — Replace current two-line skeleton. Install: precache static shell URLs (CSS bundle, JS bundle). Activate: clean old caches. Fetch: cache-first for image requests (stale-while-revalidate), network-first for navigation requests, pass-through for other requests.
- `public/icon-192.png` and `public/icon-512.png` — App icons (generate from wordmark or create design asset)
- `app/frontend/components/install_banner.tsx` — In-app install prompt banner. Listens for `beforeinstallprompt`, shows after first crate browse, dismisses to localStorage.
- `app/frontend/components/offline_indicator.tsx` — Subtle "You're offline" bar when `navigator.onLine` is false or a fetch fails.
- `app/frontend/components/install_banner.test.tsx`

**Files to modify:**
- `public/manifest.json` — add `short_name: "Milkcrate"`, `categories: ["music", "shopping"]`, `icons` array (192×192 and 512×512), `screenshots` array
- `app/frontend/layouts/app_layout.tsx` — render `<InstallBanner>` (above tab bar if IU-2 present) and `<OfflineIndicator>` (below header, above content)
- `app/frontend/entrypoints/application.tsx` (or wherever service worker is registered) — register `sw.js`

**Key decisions:**
- Native Cache API — no Workbox dependency. Two caches: `shell-cache-v1` (precached static assets) and `image-cache-v1` (runtime album art).
- Navigation requests are network-first with no data fallback — only images and shell are cached.
- Install prompt: `beforeinstallprompt` stored, shown after CrateView first mounts (detected via localStorage flag or context). Only on Chrome/Edge/Samsung Internet.
- `skipWaiting()` + `clients.claim()` preserved — new SW activates immediately.

**Test scenarios:**
- Service worker installs and precaches static shell
- Album art loads from cache on repeat visits, updates in background
- Offline: cached images display, uncached images show placeholder
- Offline indicator appears when network drops, dismissible
- Install banner appears after first crate browse on Chrome/Android
- Install banner calls beforeinstallprompt.prompt() on tap
- Install banner does not reappear after dismissal (localStorage flag)
- Manifest passes Lighthouse PWA audit installability checks
- iOS: install banner does not appear (beforeinstallprompt unsupported)

---

## Dependency Graph

```
IU-1 (ViewportContext + useViewport)
├── IU-2 (Navigation: tab bar + collapsing header)
├── IU-3 (Gesture Primitives Library)
│   └── IU-4 (Component Adaptations) — long-press coexists with flip
├── IU-4 (Component Adaptations) — grid auto-fit, flip fixes, admin, apply
└── IU-5 (Animated Transitions) — additive, can run in parallel

IU-6 (Offline PWA) — fully independent, parallel with any IU
```

**Sequencing recommendation:**
1. **IU-1 first** — everything depends on `useViewport()` and `ViewportProvider`.
2. **IU-2 and IU-3 in parallel** — both depend on IU-1 but not on each other. IU-2's PileSheet swipe (optional enhancement) uses IU-3's `useSwipeable` but the tab bar and header collapse work without it.
3. **IU-4 after IU-1 and IU-3** — the improved flip coexists with long-press-to-pile from IU-3.
4. **IU-5 after any IU** — pure UI polish, additive.
5. **IU-6 anytime** — fully independent.

---

## Risks

| Risk | Mitigation |
|------|------------|
| **Provider not wired (Bug #1 from animation migration):** ViewportProvider built but not added to AppLayout. Consumers throw. | Write smoke test that renders AppLayout and asserts useViewport returns a tier. Add provider to AppLayout as first commit in IU-1. |
| **matchMedia mock masks desktop regressions:** All existing tests render at compact tier. New responsive branching could break desktop without test failures. | IU-1's setViewportTier utility + describe.each matrix ensures all tiers are exercised. Migrate storefront_shell.test.tsx to use the utility. |
| **Framer Motion layoutId crossfade from CSS Grid source:** The CrateCard lives inside a CSS Grid (genre grid, featured row). Framer Motion's layoutId may not correctly capture the position within a grid layout. | Prototype in IU-5 before committing. Fall back to fade + scale transition (no shared element) if grid context interferes. |
| **Scroll-vs-swipe disambiguation in PileSheet:** The PileSheet has scrollable content. Swipe-to-dismiss from the drag handle avoids the conflict, but users may try to swipe from content. | Restrict swipe detection to the drag handle element only. Accept that swipe-from-content won't work — this matches the visual affordance (the pill handle says "swipe here"). |
| **Inertia.js navigation vs. AnimatePresence:** `AnimatePresence` depends on React mounting/unmounting. Inertia page visits may not trigger unmount in the way expected. | IU-5 operates on the `activeSlug` ternary within `featured.tsx`, not on Inertia page transitions. This is React state, not routing — safe. |
| **Service worker cache invalidation:** Stale-while-revalidate for images means users may see outdated album art. Album art rarely changes — low risk. | Cache-bust by versioning the cache name (`image-cache-v2`) if changes are ever needed. |
| **iOS install prompt:** `beforeinstallprompt` doesn't fire on iOS. The install banner only appears on Chrome/Android. iOS users get manifest improvements but no prompt. | Accept as platform limitation. The manifest improvements (icons, screenshots, categories) still improve the iOS "Add to Home Screen" experience. |

---

## Key Decisions

- **ViewportProvider pattern mirrors StorefrontMotionConfig:** Four-layer architecture (tokens → provider → hook → wrappers). Provider at app root, hook for consumers. Proven by the animation token migration.
- **matchMedia over ResizeObserver:** The provider uses `matchMedia` listeners for boundary detection — they fire only at breakpoint crossings, not continuously. This matches the existing `useIsDesktop` pattern and avoids unnecessary re-renders.
- **Tab bar is layout-owned:** AppLayout manages tab state and dispatches actions. Pages expose `data-section` attributes for scroll targets but don't know about tabs. This follows the existing PileSheet pattern (layout owns the overlay, pages don't).
- **Gesture hooks use pointer events:** Consistent with `useTactileHover`. No Framer Motion drag for the hooks themselves — raw pointer events for detection, Framer Motion for the resulting animations.
- **No Workbox:** The caching requirements (two caches, two strategies) are ~60 lines of native Cache API code. Workbox adds a build dependency for no additional capability.
- **Flip stays; detail sheet removed:** User pushed back on the detail sheet as a UI abstraction away from the physical record-store metaphor. The flip IS the metaphor — fixing it is better than replacing it.

---

## Dependencies / Assumptions

- Tailwind CSS v4 `@theme` directive is available for responsive token integration (deferred to token cascade follow-up).
- Framer Motion 12.38.0 supports `layoutId`, `AnimatePresence mode="wait"`, and `useScroll` / `useTransform` — all confirmed in the current dependency.
- Inertia.js 3.0.3 `router.visit()` is available for tab bar navigation from CrateView.
- `navigator.vibrate` is available on Android Chrome; no-ops on iOS Safari. Acceptable.
- `beforeinstallprompt` is Chrome/Edge/Samsung Internet only. iOS and Firefox do not support it. Acceptable.
- The existing service worker registration code (if any) is updated. Current codebase has `sw.js` but no registration script found — IU-6 must add registration in the entrypoint.
- Back cover art image data may or may not exist in the listing data. IU-4 handles both cases.
- The `CrateCard` component across all three render sites (StoreFloor picks, FeaturedCratesRow, GenreGrid) uses a Framer Motion element or can be wrapped in one for layoutId. Planning confirms during implementation.

---

## Outstanding Questions

### Resolve Before Planning

(None — all scope-shaping decisions resolved in the requirements docs.)

### Deferred to Planning / Implementation

- [Affects IU-1] Should `ViewportProvider` use the modern `addEventListener` API exclusively, or include `addListener` fallback? The existing `useIsDesktop` uses the modern API — planning can confirm and standardize.
- [Affects IU-1] Should the `matchMedia` mock in `test/setup.ts` be removed entirely or kept as a safety net for third-party code?
- [Affects IU-2] How does AppLayout detect that CrateView is mounted? Options: Inertia page component name, route path matching, or a context flag.
- [Affects IU-2] Header collapse threshold: should 60px be a constant or derived from the header's rendered height?
- [Affects IU-3] Should the touch threshold (16px for flip) be configurable via `gesture_tokens.ts`?
- [Affects IU-3] PileSheet drag handle area structure — the current handle is inside the scrollable container. May need restructuring for swipe-to-dismiss.
- [Affects IU-4] Does the listing data type include `back_cover_image_url`? Planning verifies and adds if absent.
- [Affects IU-5] Does Framer Motion layoutId crossfade work from CSS Grid source elements? Prototype before committing.
- [Affects IU-6] What are the exact static shell URLs to precache? Depends on Vite output filenames (hashed). Read build manifest.
- [Affects IU-6] App icon source — does a suitable icon exist, or does one need to be created?
