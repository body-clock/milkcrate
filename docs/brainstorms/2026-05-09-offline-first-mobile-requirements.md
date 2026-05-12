---
date: 2026-05-09
topic: offline-first-mobile
---

# Offline-First Mobile Experience

## Summary

Replace the bare two-line service worker with a native Cache API strategy: cache-first for album art (stale-while-revalidate), precache the static shell on install, and show an in-app install prompt after the user's first crate browse. Polish the PWA manifest with icons and screenshots. No Workbox dependency.

---

## Problem Frame

The app has a PWA foundation that does nothing. `sw.js` is two lines — `skipWaiting()` and `clients.claim()` — with no caching strategy. The manifest has no icons, no screenshots, and no categories. There is no install prompt. The app is entirely network-dependent: lose connectivity in a record store basement, at a convention, or on transit, and album covers break, the app shows a blank screen, and the experience falls apart.

This is a mobile-first design problem, not just a performance optimization. The mobile usage context includes intermittent connectivity. A record store browsing app that can't show album art offline fails exactly where the product metaphor is strongest — in physical browsing contexts like record fairs and basement shops.

The PWA infrastructure already exists (viewport meta, `apple-mobile-web-app-capable`, `theme-color`, service worker registration in the HTML). It just needs a caching strategy, an install prompt, and a manifest worth installing.

---

## Actors

- A1. **Offline mobile user**: Opens the app with no connectivity — sees cached album art and the app shell instead of broken images and a blank screen.
- A2. **Returning mobile user**: Sees an install prompt after browsing, installs the app to their home screen, returns via the app icon instead of a browser tab.
- A3. **First-time visitor on patchy WiFi**: Album art loads from cache on repeat views instead of re-fetching over a slow connection.

---

## Key Flows

- F1. **Service worker installs and precaches the shell**
  - **Trigger:** User visits the app for the first time (or after a service worker update).
  - **Actors:** System
  - **Steps:** Service worker `install` event fires → fetches static shell assets (CSS bundle, JS bundle, app shell HTML) → stores them in a `shell-cache-v1` cache → `activate` event cleans any old cache versions.
  - **Outcome:** The static shell is available offline. Even if Inertia page data can't load, the app frame renders.
  - **Covered by:** R1

- F2. **Album art loads from cache, updates in background**
  - **Trigger:** Any `<img>` request for an album cover.
  - **Actors:** A3, A1
  - **Steps:** Service worker `fetch` event intercepts the image request → checks `image-cache-v1` → if found, returns cached image immediately → fetches the image from the network in the background → if the network response is newer, updates the cache for next time.
  - **Outcome:** Album art appears instantly on repeat views. On first view, it loads from the network and is cached. Offline, cached images still display.
  - **Covered by:** R2

- F3. **User sees install prompt after browsing**
  - **Trigger:** User has browsed at least one crate (or spent ~30 seconds on the StoreFloor) AND the browser supports `beforeinstallprompt`.
  - **Actors:** A2
  - **Steps:** A small banner appears at the bottom of the screen: "Add to Home Screen — browse records anytime." → user taps it → `beforeinstallprompt.prompt()` is called → native browser install dialog appears → user accepts → app is installed.
  - **Outcome:** User can launch the app from their home screen in standalone mode. The banner does not reappear after dismissal.
  - **Covered by:** R4, R5

- F4. **User opens the app offline**
  - **Trigger:** User launches the app (from browser or home screen) with no network connectivity.
  - **Actors:** A1
  - **Steps:** Service worker serves precached shell → Inertia page request fails (network-first, no fallback for data) → a subtle offline indicator bar appears: "You're offline — showing cached records." → album art loads from cache where available → broken images show a placeholder where not cached.
  - **Outcome:** The app is usable but degraded — cached images display, shell renders, data-dependent content shows whatever was last loaded.
  - **Covered by:** R3, R6

---

## Requirements

### Service Worker — Caching

- R1. **Shell precaching**: On the `install` event, the service worker fetches and caches the static shell assets: the CSS bundle, JS bundle(s), and the app shell HTML. These are stored in a named cache (`shell-cache-v1`). The `activate` event deletes any caches from previous service worker versions.
- R2. **Album art cache-first**: On `fetch` events for image requests (URLs matching common album art patterns — Discogs image CDN, any request with `Accept: image/*`), the service worker checks the image cache first. If a cached response exists, it is returned immediately. A background fetch updates the cache with the latest version (stale-while-revalidate). If no cached response exists, the request goes to the network and the response is cached.
- R3. **Navigation requests network-first**: On `fetch` events for navigation requests (Inertia page loads), the service worker attempts the network first. If the network is unavailable, it does not serve a cached fallback for dynamic page data — the app shows its existing state (whatever was last rendered). The precached shell ensures the app frame is visible.

### Service Worker — Lifecycle

- R4. The existing `skipWaiting()` + `clients.claim()` behavior is preserved. When a new service worker is detected, it activates immediately without waiting for all tabs to close.
- R5. All caching uses the native Cache API (`caches.open()`, `cache.put()`, `cache.match()`). No Workbox or other service worker library is added as a dependency.

### Install Prompt

- R6. The app listens for the `beforeinstallprompt` event and stores it for later use.
- R7. An install prompt banner appears after one of these conditions is met: the user has navigated into a crate (CrateView has mounted at least once), OR the user has spent 30 cumulative seconds on the StoreFloor. The banner is a small, non-blocking bar: "Add to Home Screen — browse records anytime." with an "Install" button and a dismiss (×) button.
- R8. Tapping "Install" calls `beforeinstallprompt.prompt()`. Tapping dismiss sets a `localStorage` flag (`pwa-install-dismissed`) so the banner never reappears for that user.
- R9. The install banner renders at the bottom of the viewport, above the tab bar (Survivor #2) if the tab bar is present, or at the bottom with `safe-area-inset-bottom` if not. It does not overlap navigation chrome.
- R10. The install prompt is Android/Chrome/Edge/Samsung Internet only (`beforeinstallprompt` is not supported on iOS Safari). The banner is not rendered on unsupported browsers.

### PWA Manifest

- R11. `public/manifest.json` is updated with: a `short_name` of `"Milkcrate"`, `categories: ["music", "shopping"]`, a `screenshots` array with at least one screenshot (for the install dialog rich preview), and icon entries for 192×192px and 512×512px.
- R12. The existing manifest fields (`name`, `display: "standalone"`, `orientation: "portrait-primary"`, `theme_color`, `background_color` with dark/light variants) are preserved.

### Offline Indicator

- R13. When `navigator.onLine` is `false` OR a fetch fails with a network error, the app shows a subtle, non-blocking indicator bar: "You're offline — showing cached records." The bar appears below the header, above the main content, and is dismissible. It does not re-appear during the same session after dismissal.
- R14. The "Syncing inventory…" spinner (already in `featured.tsx`) is unchanged — it only displays when the sync status is actively `"syncing"` and the network is available. When offline, the last known store data is shown (whatever the page rendered before connectivity was lost).

---

## Acceptance Examples

- AE1. **Covers R1, R2.** Given the service worker is installed and the user has browsed the app online (album art cached), when the user goes offline and reloads the app, then the app shell renders and previously-viewed album covers display from cache. Album covers not yet cached show a placeholder.

- AE2. **Covers R6, R7, R8.** Given a first-time Chrome/Android user, when they navigate into a crate and return to the StoreFloor, then an install banner appears at the bottom of the screen. When they tap "Install," then the native PWA install dialog appears. When they dismiss the banner, then it does not reappear on subsequent visits.

- AE3. **Covers R10.** Given an iOS Safari user, when they browse crates, then no install banner appears (`beforeinstallprompt` is unsupported).

- AE4. **Covers R13.** Given the user is browsing with connectivity, when the network drops mid-session and the next fetch fails, then the offline indicator bar appears. When the user dismisses it, it does not reappear during that session.

- AE5. **Covers R11.** Given the updated manifest, when inspecting `public/manifest.json`, then `icons` contains entries for 192×192 and 512×512, `screenshots` has at least one entry, and `categories` includes `["music", "shopping"]`.

- AE6. **Covers R2.** Given a cached album cover image, when the user visits the same page again while online, then the cached image displays immediately. When a newer version is fetched in the background, then the cache is updated for the next visit. (The current visit still shows the cached version — stale-while-revalidate does not update the visible image mid-session.)

---

## Success Criteria

- A user on a patchy or offline connection can browse previously-viewed album art — no broken images for cached covers.
- A Chrome/Android user sees an install prompt after their first meaningful browse session and can install the app to their home screen.
- The PWA passes the Lighthouse PWA audit's installability and offline detection checks.
- The app shell renders even when the network is unavailable — no blank white screen.

---

## Scope Boundaries

- Workbox dependency — not added. Native Cache API only.
- Background sync for pile additions — not included. Pile additions made offline are lost (the user sees an error or the action is disabled when offline — planning determines the UX).
- Push notifications — not included.
- Web Share Target API — not included.
- Full offline crate navigation — Inertia page data requires a network connection. Only cached images and the precached shell are available offline. The app shows last-known state but does not navigate to new crates offline.
- iOS install prompt — `beforeinstallprompt` is unsupported. iOS users get manifest improvements but no custom install banner.
- Service worker update UI (reload prompt after update) — the current `skipWaiting` + `clients.claim` auto-activate behavior is preserved, which means users get the new service worker on next navigation without a prompt. A more sophisticated update flow is deferred.

---

## Key Decisions

- **Native Cache API over Workbox**: The caching requirements are simple (two caches, two strategies). Workbox would add a build dependency and ~30KB of JS for functionality that's ~60 lines of native code. No Workbox-only features (background sync, routing patterns) are needed.
- **Navigation requests are network-first with no data fallback**: Caching Inertia page responses would require a strategy for stale data, cache invalidation, and consistency — significant complexity. The precached shell ensures the app frame is visible; album art caching ensures the visual content survives offline. Dynamic data (crate contents, store inventory) is expected to require connectivity.
- **Install prompt after first crate browse**: Tying the prompt to actual engagement (browsed a crate) rather than a timer or page count means the prompt fires when the user has demonstrated interest. This is the standard PWA install prompt best practice — don't interrupt first-time visitors, prompt after value is demonstrated.
- **Stale-while-revalidate for images**: Cache-first with background update gives instant loads on repeat views without blocking on network. The user sees the cached image immediately; the update happens silently. This is ideal for album art which rarely changes.

---

## Dependencies / Assumptions

- The existing service worker registration in `inertia_application.html.erb` (or wherever `<script>` registers the SW) stays in place. The new `sw.js` is a drop-in replacement.
- Survivor #2 (tab bar) — the install banner renders above the tab bar. Without Survivor #2, it renders at the bottom of the viewport. The banner positioning handles both cases.
- A 192×192 and 512×512 app icon image exist or need to be created. Planning determines the icon source (design asset, generated from the wordmark, etc.).
- `navigator.onLine` and the `online`/`offline` events are used for the offline indicator. These are reliable for "definitely offline" detection but may have false positives (reports online when behind a captive portal). This is acceptable — the fetch failure fallback covers the captive portal case.

---

## Outstanding Questions

### Resolve Before Planning

(None — all scope-shaping decisions are resolved.)

### Deferred to Planning

- [Affects R1][Technical] What are the exact URLs of the static shell assets to precache? These depend on the Vite/Rails asset pipeline output filenames (hashed). Planning reads the build manifest to determine the URLs.
- [Affects R7][Technical] How is "first crate browse" detected? Options: a `localStorage` flag set when `CrateView` mounts for the first time, a React state flag in `AppLayout`, or a custom event dispatched by `CrateView`.
- [Affects R11][Needs research] App icon — does a suitable icon exist, or does one need to be designed/generated? The wordmark "🥛" could serve as a generated icon base, but a proper designed icon is preferred.
- [Affects R13][Technical] When the app is offline and a pile/add action is attempted, what UX is shown? Options: disable the button with a tooltip, show a toast error, or silently queue (deferred to background sync follow-up).
