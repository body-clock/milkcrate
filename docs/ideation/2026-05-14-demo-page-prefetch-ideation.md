---
date: 2026-05-14
topic: demo-page-prefetch
focus: prefetch the demo store page from the marketing home page
mode: repo-grounded
---

# Ideation: Demo Page Prefetch

## Grounding Context

**Project:** Milkcrate — Rails 7+ / Inertia.js v3 (React 19) app. Online record store browsing experience.

**The problem:** When a visitor is on the marketing home page and clicks "Demo" (header link or hero CTA), there's a noticeable loading delay. The server runs `StorefrontCuration` (scoring algorithms across picks/featured/genre strategies) + `CratePresenter` on every request, then Inertia sends full props and React hydrates with a different layout (`MarketingLayout` → `AppLayout`).

**Current state:** No page-data prefetching exists. Only image preloading inside `CrateView`. Inertia v3 has full built-in prefetch support (`<Link prefetch="hover">`, `cacheFor`, `hoverDelay`) but it's unused.

**Architecture boundary:** Marketing surface (`MarketingLayout` with `ViewportProvider`) → Store browsing surface (`AppLayout` with `StorefrontMotionConfig`, `PileProvider`, separate `ViewportProvider`). Full React tree replacement on navigation.

**Key insight:** The home page's `MarketingPreviewPresenter` already runs the identical `StorefrontCuration` + `CratePresenter` chain (capped at 4 records) — the home page pays ~90% of the compute cost, then the demo page throws it away and recomputes.

## Topic Axes

1. **Trigger surface** — Events that initiate prefetch (mount, hover, viewport entry, idle, scroll velocity)
2. **Data scope** — What data to prefetch (full page, partial props, just structure, images, JS chunks)
3. **Server-side cost** — Backend caching and computation reduction strategies
4. **UX and feedback** — Visual indicators, loading states, transition smoothness, perceived performance
5. **Fallback and degradation** — Network failure handling, cache eviction, slow connections, stale data

## Ranked Ideas

### 1. Inertia Built-in Prefetch — `<Link prefetch="hover">`
**Description:** Add `prefetch="hover"` to the two Demo `<Link>` components (marketing layout header and hero CTA). Inertia v3 already ships this with configurable `cacheFor` and `hoverDelay` — it's just not wired. Also add `<link rel="prefetch">` in the page `<head>` for browser-level idle prefetch. This is the single highest-impact, lowest-effort change.

**Axis:** Trigger surface

**Basis:** `direct:` — `marketing_layout.tsx` lines 24-29 and `home.tsx` lines 82-87 render `<Link>` components without any prefetch attribute. `@inertiajs/react ^3.0.3` has full `prefetch` support with `LinkPrefetchOption: 'mount' | 'hover' | 'click'` and configurable `cacheFor` / `hoverDelay`. Global config in `createInertiaApp` supports default `prefetch.cacheFor` and `prefetch.hoverDelay`.

**Rationale:** The hover-to-click gap is a real, measurable window of dead time. Inertia's built-in prefetch handles cache management, duplicate request prevention, and transition integration. Turning the user's natural hesitation into a head start. Combine with `<link rel="prefetch">` for browser-level prefetch during idle CPU after home page loads.

**Downsides:** Hover prefetch wastes bandwidth if user hovers but doesn't click; full page payload prefetched even for browse-and-leave; increases server load from prefetch requests.

**Confidence:** 90%

**Complexity:** Low — ~3 lines changed (two `<Link>` props + one optional `<link>` tag in head)

**Status:** Unexplored

### 2. Cached Curation — `Rails.cache` around `StorefrontCuration`
**Description:** Cache the full `StorefrontCuration` result in `Rails.cache` keyed by `[store_id, listings_updated_at]`. Both `MarketingPreviewPresenter` (home page render) and `StoresController#render_store` (demo page) read from the same cache — the first write is "free" (paid by the home page render), the demo page gets a cache hit. This is the root cause fix: server-side recomputation is why TTFB is slow.

**Axis:** Server-side cost

**Basis:** `direct:` — `storefront_curation.rb` has zero caching. `stores_controller.rb#render_store` calls `StorefrontCuration.new(store)` on every request. `marketing_preview_presenter.rb` calls the identical chain for the home page preview. Both compute the same curation result independently.

**Rationale:** The root cause of the demo page's TTFB is server-side computation: SQL for all listings, genre-count tally, `RecordScorer` pass over every listing, 4 curation strategies (picks, new arrivals, thematic, hidden gems), dedup across all of them, and genre crate building. Caching eliminates recomputation for the demo navigation when the home page already ran it seconds earlier. Invalidation triggered by Discogs sync.

**Downsides:** Cache invalidation on Discogs sync required; increased memory pressure; stale data window between sync and cache expiry; cache key must be carefully designed.

**Confidence:** 85%

**Complexity:** Medium — `Rails.cache.fetch` around curation result, `after_sync` callback to bust cache

**Status:** Unexplored

### 3. Preview-Aware Instant Navigation
**Description:** The home page already ships `preview.sections: StorefrontSection[]` (crate names, slugs, up to 4 records each) — same TypeScript type as the store page's `storefront_sections`. When navigating home → demo, render the store floor *instantly* from this existing preview data while the Inertia navigation request completes in the background. No additional bytes, no network wait for initial paint.

**Axis:** Data scope

**Basis:** `direct:` — `home.tsx` receives `preview` as `HomepagePreview` which contains `sections: StorefrontSection[]`. `FeaturedProps.storefront_sections` has the identical `StorefrontSection[]` type. The data is on the client, unused for navigation acceleration.

**Rationale:** The preview data is already loaded and rendered on the home page. Using it as an eager render fallback for the store page means the user sees crate structure immediately on navigation, then the full data (more records, more crates) enriches in place. No loading spinner, no blank flash. Perceived load time drops to React reconciliation speed.

**Downsides:** Preview data may not match full data if inventory changed between home page render and demo navigation; requires coordination between presenters for shape compatibility; the bounded data (4 records) means some crates appear sparse initially.

**Confidence:** 80%

**Complexity:** Medium — store page component needs fallback props from previous page; merge strategy for incremental enrichment

**Status:** Unexplored

### 4. Layout Boundary — Fix Provider Remount Flash
**Description:** `MarketingLayout` wraps with `ViewportProvider` → `MilkcrateShell`. `AppLayout` wraps with `StorefrontMotionConfig` → `ViewportProvider` (second instance) → `PileProvider` → `AppLayoutInner` → `MilkcrateShell`. These are entirely separate React trees. Clicking Demo forces React to unmount MarketingLayout's tree and mount AppLayout's tree — causing a visible flash that data prefetching alone can't fix. Two approaches: (A) lift shared providers to app root; (B) pre-mount AppLayout providers in a hidden container.

**Axis:** UX and feedback

**Basis:** `direct:` — The two layouts in `marketing_layout.tsx` and `app_layout.tsx` have zero shared provider state. `ViewportProvider` is mounted twice independently. `MarketingLayout` has no `PileProvider` or `StorefrontMotionConfig`.

**Rationale:** Even with perfect data prefetching, the layout swap causes React to tear down and rebuild the entire provider tree. Users perceive this as a flash. Lifting `ViewportProvider` to the app root and conditionally mounting `PileProvider`/`StorefrontMotionConfig` only when needed would eliminate the structural remount cost.

**Downsides:** Approach A requires architectural change to the Inertia app entry point (`application.tsx`); approach B adds memory overhead from dual-mounted trees. Either approach needs careful testing for provider lifecycle and context bugs.

**Confidence:** 75%

**Complexity:** High — architectural provider tree change; testing for context isolation

**Status:** Unexplored

### 5. Post-Render Cache Warm Job
**Description:** After rendering the home page, enqueue a low-priority ActiveJob that runs `StorefrontCuration` + `CratePresenter` for the demo store and writes the result to `Rails.cache`. The job runs on a separate process (GoodJob/Sidekiq), zero impact on home page response time. By the time the user clicks Demo (typically 2-10s after page load), the cache is warm.

**Axis:** Server-side cost

**Basis:** `direct:` — `PagesController#home` has access to the demo store identity via `Settings.discogs_username`. The controller action returns without any side-effect that pre-warms the demo store cache.

**Rationale:** Decouples the curation computation from the request-response cycle. The home page finishes quickly; the curation job runs in the background. If the user never clicks Demo, the work is wasted — but for the typical user flow (land on home → click Demo after reading), the cache is warm before the click. Works especially well combined with cached curation (S2).

**Downsides:** Job queue dependency; slightly delayed cache warm (~1-2s for job scheduling + execution); wasted work if user bounces without clicking Demo.

**Confidence:** 80%

**Complexity:** Medium — new job class, `after_action` in controller, cache key convention shared with S2

**Status:** Unexplored

### 6. Preview-As-Fallback — Guaranteed Non-Blank Render
**Description:** If Inertia navigation to the demo page fails (network error, server 500, cache miss, prefetch timeout), render the store floor from the existing page's preview data — store name, crate names, up to 4 records per crate. A small banner reads "Showing preview — refresh for full experience." The user never sees a blank page, spinner, or error screen.

**Axis:** Fallback and degradation

**Basis:** `direct:` — The home page always ships `preview` data (even the fallback path returns typed empty sections from `MarketingPreviewPresenter#preview_data`). Inertia retains previous page props in `window.__inertia_page` until next render. Preview `StorefrontSection[]` is a proper bounded subset of the store page's props.

**Rationale:** The fallback is *guaranteed* because the preview data is part of the current page — it can't be lost to a network failure. This is the app-level equivalent of stale-while-revalidate with zero infrastructure. The preview data may be bounded, but a bounded storefloor is vastly better than a white screen.

**Downsides:** Requires store page component to accept a fallback prop path; preview data is limited (4 records/crate) so the fallback is functional but sparse; potential confusion from stale data if inventory changed.

**Confidence:** 80%

**Complexity:** Low-Medium — store page component needs a conditional render path; ~1-2 conditionals

**Status:** Unexplored

### 7. Connection-Adaptive Prefetch
**Description:** Use `navigator.connection.effectiveType` to gate prefetch behavior: skip on `slow-2g` or when `navigator.connection.saveData` is true; fire eagerly on `4g`/`wifi`. Re-evaluate on `connectionchange` events. Use `prefers-reduced-data` CSS media query as a fallback for browsers without the Network Information API.

**Axis:** Fallback and degradation

**Basis:** `reasoned:` — Network Information API has ~90% browser support (Chrome, Firefox, Safari 16.4+). On slow/metered connections, prefetching the full store page payload (potentially MBs of crate data + images) could be actively harmful. On fast connections, the cost is negligible.

**Rationale:** This prevents the prefetch from being a net negative on constrained networks while still delivering the benefit on fast ones. It also respects user data-saver preferences, which is good UX and potentially a trust signal for a small app.

**Downsides:** Connection API not available in all browsers (Safari pre-16.4, some mobile browsers); adds client-side logic and a `useEffect` dependency; one more thing to test.

**Confidence:** 70%

**Complexity:** Low — `useEffect` with connection check before firing prefetch; `@media (prefers-reduced-data)` CSS fallback

**Status:** Unexplored

### 8. The Visual Commitment Void — Prefetch State Feedback
**Description:** Wire Inertia's progress events or a subtle page-transition indicator tied to prefetch state. When prefetch completes, show a subtle "ready" indicator on the Demo button (border glow or pulse via CSS animation). When click happens: if prefetched, instant transition; if not prefetched, show Inertia's progress bar. This addresses the UX friction of click → nothing → pause → page.

**Axis:** UX and feedback

**Basis:** `direct:` — Inertia's `onStart`/`onFinish` callbacks and `onProgress` event exist but are unused. The app already has `StorefrontMotionConfig` with spring-based entrance animations — the team clearly values transition quality. There's no loading state on the Demo navigation path.

**Rationale:** Perceived performance is often more important than actual performance. A 400ms delay with a "warm glow" on the button feels faster than a 200ms delay with nothing. The visual feedback also signals to the user that the app is responsive, reducing re-clicks and uncertainty.

**Downsides:** Progress bar may conflict with brand design principles ("anti-SaaS"); requires visual design review for the "ready" indicator; adds complexity for a transient visual state.

**Confidence:** 75%

**Complexity:** Low — Inertia `onProgress` integration or `@inertiajs/progress`; CSS animation for "ready" state

**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | The Hesitation Window | PROMOTED to S1 |
| 2 | The Double Compute Tax | Merged into S2 (Cached Curation) |
| 3 | The Layout Boundary Churn | PROMOTED to S4 |
| 4 | The Payload Size Surprise | Superseded by S3 (Preview-Aware Instant Nav) |
| 5 | Resource Contention | Better handled as refinement of S1 prefetch timing |
| 6 | The Visual Commitment Void | PROMOTED to S8 |
| 7 | The Stale Preview Mismatch | Low priority; edge case for initial implementation |
| 8 | The Cold Cache First-Visit Penalty | Merged into S2 |
| 9 | Server-Pushed Storefront Payload | Increases home page TTFB; worse tradeoff |
| 10 | Build-Time Static Pre-render | Data changes too frequently (Discogs sync) |
| 11 | Home Page as Live Embedded Demo | Weaker than S3; same effect more simply achieved |
| 12 | Service Worker Stale-While-Revalidate | Valuable but separate concern from initial prefetch |
| 13 | Idle-Time Speculative Prefetch Ring | Unnecessary background traffic for single demo store |
| 14 | In-Place Morph via Inertia Partial Replace | Not supported at needed level by current Inertia |
| 15 | Optimistic Off-Screen Render | Fragile React pattern; hard to maintain |
| 16 | HTTP 103 Early Hints | Requires CDN/proxy support; not universally available |
| 17 | Inertia Stream SSE | Over-engineered; SSE infrastructure disproportionate |
| 18 | Layout Elevator | Merged into S4 as possible implementation approach |
| 19 | Negative Cache | Premature optimization; adds avoidable complexity |
| 20 | Speculative Fragment Merge | Same effect as S3, achieved more simply |
| 21 | Hover-Scoped Predictive Queue with Backoff | Inertia handles this sufficiently |
| 22 | Redirect-as-Prefetch | Home page TTFB penalty too high |
| 23 | Skeuomorphic Loading | PROMOTED (merged into S8 as design approach) |
| 24 | Upward Sync | Requires shared auth/state not currently present |
| 25 | Cached Curation | PROMOTED to S2 |
| 26 | Preview-Aware Instant Navigation | PROMOTED to S3 |
| 27 | PrefetchLink component | Good DX but Inertia's built-in `<Link prefetch>` already works |
| 28 | Post-Render Cache Warm Job | PROMOTED to S5 |
| 29 | Browser Prefetch Resource Hint | Merged into S1 as complementary strategy |
| 30 | Service Worker Storefront Cache | Better handled separately from prefetch work |
| 31 | Preview-As-Fallback | PROMOTED to S6 |
| 32 | The Branch Predictor | ML/behavioral tracker complexity not justified |
| 33 | Piano Player's Leading Hand | Would prefetch data user may never use |
| 34 | Open-world Game Level Streaming | Scroll velocity is noisy signal; hover is more reliable |
| 35 | Airport Luggage Pre-sorting | Assumes too much about intent from session data |
| 36 | Construction Staging Yard | Merged into S5 |
| 37 | Neural Next-Token Prediction | Over-engineered confidence visualization |
| 38 | JIT Compiler's Inline Cache | Complex for marginal gain over single-tier approach |
| 39 | Conductor's Anticipatory Cue | Merged with HTTP 103 (rejected) |
| 40 | Infinite Budget | Wastes bandwidth; demo page could be 5-10MB full payload |
| 41 | Immutable Snapshot | Demo data changes via Discogs sync |
| 42 | Collapsed Layout | Merged into S4 |
| 43 | Pre-embedded Store | Same TTFB concern as server-pushed payload |
| 44 | Connection-Adaptive Prefetch | PROMOTED to S7 |
| 45 | 1 Million Records | Not relevant to current store scale |
| 46 | 50 Demo Stores | Not applicable to single-demo-store architecture |
| 47 | 100ms Deadline | SW concern not applicable to initial prefetch layer |
