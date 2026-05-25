---
date: 2026-05-24
topic: mobile-cart-add-discogs
---

# Ideation: Adding Pile Items to Discogs Cart from Mobile

## Problem

The `discogs.com/sell/cart/?add={listing_id}` URL adds items to the cart server-side. This works on desktop via a hidden popup chaining through each URL. On mobile with the Discogs app installed, any navigation to a discogs.com URL triggers the app intercept — the user lands on a listing page instead of the cart.

**Core constraints:**
- No Discogs cart API
- `?add=ID` works but only one at a time
- SameSite=Lax cookies block cross-origin fetch/XHR
- `X-Frame-Options: SAMEORIGIN` blocks iframes
- App intercepts any `window.open` or `location.href` to discogs.com

---

## Survivors (ranked)

### 1. Server-side session proxy
**Axes:** Request delivery, App intercept
**Cost:** Medium (backend work, OAuth or cookie provisioning)

Milkcrate's server maintains its own authenticated session with Discogs. User authenticates once (OAuth or one-time cookie), then all `?add=` requests go server-to-server. No browser navigation to discogs.com ever happens on mobile. No app intercept possible.

**Variants:**
- Discogs OAuth flow (if API supports cart operations — needs investigation)
- User pastes their Discogs session cookie into Milkcrate once (store encrypted, short-lived)
- Server hosts a headless browser session that performs adds

**Why survivor:** Eliminates the entire problem category. Every frame converged on this.

---

### 2. Batch single navigation — test multi-add URL
**Axes:** Request delivery, User experience
**Cost:** Low (5-minute test)

Test whether `?add=id1&add=id2&add=id3` or `?add=id1,id2,id3` works in a single navigation. If bulk add works, one app intercept lands the user on the cart page with all items pre-loaded. Cost of adding N items ≈ cost of adding 1.

**Why survivor:** Highest leverage per unit of effort. A single `curl` test answers it.

---

### 3. Resource hint burial (prefetch/preload)
**Axes:** Request delivery, App intercept
**Cost:** Low (client-side change)

Use `<link rel="prefetch">` or `<link rel="preload" as="document">` to fire add URLs as browser-engine resource loads — NOT as navigations. Prefetch requests carry cookies but don't trigger the OS app handler because they aren't full-page navigations.

**Why survivor:** If browser behavior allows this, it's invisible. No popup, no redirect, no app intercept.

---

### 4. Dead drop: mobile builds pile → desktop executes adds
**Axes:** Post-add landing, User experience
**Cost:** Low (shared link generation)

User builds pile on mobile, taps "Prepare for checkout." Milkcrate generates a URL (or copies to clipboard) containing all listing IDs. User opens that URL on desktop where the app isn't installed. Desktop browser cycles through adds normally.

**Why survivor:** Decouples decision (mobile) from execution (desktop). Honest about the mobile constraint without pretending to solve it.

---

### 5. Queue + notification background carting
**Axes:** Request delivery, User experience, Fallback/recovery
**Cost:** Medium (background job infrastructure)

User taps "Add all to cart" → items enqueued server-side → user gets push notification when cart is ready → opens the notification → one navigation to `discogs.com/sell/cart` with everything loaded. Server handles all the adds via whichever mechanism works (API proxy, headless browser, etc.).

**Why survivor:** The "ATM envelope deposit" pattern — user submits, gets confirmation, trusts async processing. Works with any backend add mechanism.

---

### 6. Pull-to-confirm rhythmic flow (app intercept as feature)
**Axes:** User experience, App intercept
**Cost:** Medium (UI development)

Stop fighting the intercept. Design a deliberate rhythm: each pile item is a card, user pulls to "toss" it to Discogs. App opens, item adds server-side, user returns, next card glows. The app switch becomes a satisfying confirmation of each add, not a bug.

**Why survivor:** Doesn't eliminate the intercept but makes it feel owned. Particularly good for small piles (2-5 items) where the rhythm feels natural.

---

### 7. Blob/data URI navigation bypass
**Axes:** App intercept
**Cost:** Low (frontend change)

Navigate to a `data:text/html,...` blob that contains a meta-refresh to the add URL. OS-level app interception triggers on the initial navigation, not the second hop from inside the browser engine. Worth a 5-minute test.

---

### 8. ASWebAuthenticationSession / SVC bypass (iOS)
**Axes:** App intercept
**Cost:** Low (iOS-only frontend test)

`ASWebAuthenticationSession` on iOS creates an isolated browser context that may not fire Universal Links the same way as a normal tab. If adds work inside this context without triggering the app, it's an iOS-specific win.

---

## Rejected with reasons

| Idea | Reason |
|------|--------|
| `<iframe>` form submissions | Discogs blocks with `X-Frame-Options: SAMEORIGIN`; query params stripped on GET |
| Service Worker fetch proxy | SameSite=Lax still blocks cross-origin credentialed requests inside SW scope |
| Deep link assembly line | We don't control Discogs' app URL scheme |
| Clipboard queue | Too manual, scales poorly, bad UX |

---

## Recommended test order

1. **Test batch add URL** — `?add=id1&add=id2&add=id3`. If it works, the problem is solved for $0.
2. **Test resource hint prefetch** — inject `<link rel="prefetch">` for each add URL and see if items reach cart.
3. **Test blob/data URI navigation** — `data:text/html,<meta http-equiv="refresh" content="0;url=?add=ID">` to see if app intercept fires on the second hop.
4. **Build server-side proxy** — OAuth flow + server-to-server adds. Cleanest long-term solution.
