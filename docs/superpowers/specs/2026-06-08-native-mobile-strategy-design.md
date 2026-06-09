# Native Mobile App Strategy: Hybrid Architecture

**Date:** 2026-06-08
**Status:** Design (pre-implementation)
**Issue:** https://github.com/body-clock/milkcrate/issues/238

## Context

Milkcrate is a Rails + Inertia + React DOM web application. The core experience — a record-store browsing interface with a swipeable card stack — works well on desktop but feels constrained on mobile. The app is demoed at record fairs on phones; the mobile experience *is* the sales pitch.

The question: should Milkcrate remain web-only, move fully to React Native + React Native Web, or adopt a hybrid strategy?

## Decision

**Hybrid architecture: keep the React DOM + Inertia web app, add a React Native mobile app for hero interactions, both sharing a Rails service layer.**

React Native Web was rejected because it degrades the desktop experience (loses cursor proximity effects, tactile hover, CSS grid, keyboard navigation, backdrop-filter) that is a point of pride for the product. The big bang rewrite was rejected because it risks breaking a working web app without first validating that native gestures deliver the expected improvement.

## Architecture

```
┌─ Rails Backend ─────────────────────────────────────┐
│                                                      │
│  Models (unchanged)                                  │
│  ├─ Store, Crate, Listing, Waitlist, DiscogsShopper  │
│                                                      │
│  Service Layer (new, shared)                         │
│  ├─ StorefrontData.for(store, shopper:)              │
│  ├─ CrateListingsService.call(crate, page:)          │
│  ├─ WallRecordsService.call(store, page:)            │
│  ├─ PileService.add(store, shopper, listing_id)      │
│  └─ ShopperAuthService.authenticate(token)           │
│                                                      │
│  Controllers                                         │
│  ├─ Inertia Controllers (web, refactored)            │
│  │  └─ Call services → render inertia props          │
│  └─ API Controllers (new, for mobile)                │
│     └─ Call same services → render :json             │
│                                                      │
│  Auth                                                │
│  ├─ Cookie-based (web, existing)                     │
│  └─ JWT token-based (mobile, new)                    │
└──────────────────────────────────────────────────────┘
         │                          │
         ▼                          ▼
┌─ Desktop Web ─────────┐  ┌─ Phone App ──────────────┐
│ React DOM + Inertia   │  │ React Native + Expo      │
│ framer-motion         │  │ Reanimated + Gesture     │
│ Tailwind CSS          │  │   Handler                │
│ All screens           │  │                          │
│                       │  │ Screens:                 │
│ Keeps:                │  │ • Card stack (swipe)     │
│ • Cursor proximity    │  │ • Wall grid              │
│ • Tactile hover       │  │ • Pile sheet             │
│ • CSS grid            │  │ • Auth flow              │
│ • Keyboard nav        │  │                          │
│ • Backdrop blur       │  │ Gains:                   │
│                       │  │ • 60fps native gestures  │
│                       │  │ • Haptic feedback        │
│                       │  │ • App Store presence     │
│                       │  │ • Push notifications     │
└───────────────────────┘  └──────────────────────────┘
```

### Service Layer Extraction

Current controllers mix business logic with Inertia rendering. The extraction pulls data-fetching logic into service objects:

**Before (StoresController):**
```ruby
def render_store(store)
  cached = StorefrontCuration.cached_curation(store, ...)
  render inertia: "stores/show", props: {
    store: store_props(store),
    shopper: shopper_props,
    crates: cached[:crates],
    sections: cached[:sections]
  }
end
```

**After:**
```ruby
# Inertia controller (web)
def show
  data = StorefrontData.for(store, shopper: current_shopper)
  render inertia: "stores/show", props: data.to_inertia_props(flash: flash.to_h)
end

# API controller (mobile)
def show
  data = StorefrontData.for(store, shopper: current_shopper)
  render json: data.to_api_json
end
```

Same service, two serializations. No business logic duplication.

### API Endpoints (new)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/stores/:slug` | Store info + shopper status |
| `GET /api/v1/stores/:slug/crates` | Crate list with listing counts |
| `GET /api/v1/crates/:id/listings?page=` | Paginated listings for a crate |
| `GET /api/v1/stores/:slug/wall?page=` | Paginated wall records |
| `POST /api/v1/pile/items` | Add item to pile |
| `DELETE /api/v1/pile/items/:id` | Remove item from pile |
| `POST /auth/discogs/shopper/authorize` | Discogs OAuth → JWT token |
| `GET /api/v1/shopper` | Current shopper profile |

### Auth Strategy

- **Web:** Cookie-based sessions (existing, unchanged)
- **Mobile:** Discogs OAuth flow returns a JWT token. Token sent as `Authorization: Bearer <token>` header on all API requests.
- **Shared session state:** Pile contents tied to shopper ID, accessible from both web and mobile for the same authenticated user.

## Migration Path

### Phase 1: API Extraction (Week 1)

1. Extract service objects from existing controllers (no behavior change)
2. Add JWT auth alongside cookie auth
3. Add API controllers under `app/controllers/api/v1/`
4. Add request specs for API endpoints
5. Web app continues unchanged

### Phase 2: Mobile MVP (Weeks 2-4)

1. Scaffold React Native app with Expo
2. Build card stack component:
   - `PanGestureHandler` for drag detection
   - Reanimated `useSharedValue` + `useAnimatedStyle` for 60fps transforms
   - Spring animations for snap-to-dismiss
   - `AnimatePresence` equivalent via Reanimated layout animations
3. Build wall grid: `FlatList` with `numColumns`
4. Build pile sheet: `Modal` + Reanimated slide-up + gesture to dismiss
5. Add auth flow: WebView-based Discogs OAuth → token exchange
6. Ship to TestFlight, demo at record fair

### Phase 3: Expand (future)

- Push notifications for store updates
- Offline support for browsing cached data
- Deep links from App Store / social
- Camera/media for barcode scanning
- Additional screens (dashboard? store management?) if mobile usage justifies it

## Key Bets & Risks

| Bet | Risk | Mitigation |
|-----|------|------------|
| Reanimated card swipe feels dramatically better than framer-motion on mobile | It might not — framer-motion is already solid | Build and test in 2 weeks. If no meaningful improvement, pivot. |
| Service layer extraction is cheap | Current controllers mix some business logic with rendering | Controllers are already thin (StoresController ~40 lines of private methods). Extraction is pulling up, not rewriting. |
| "Two codebases" is overstated | Maintaining two UIs could create drift | Mobile app is 3-4 screens. Web app is unchanged. They serve different screens, not duplicate ones. |
| JWT auth alongside cookie auth is sustainable | Complexity from dual auth mechanisms | Scope JWT to mobile-only. Cookie auth for web stays exactly as-is. |

## Alternatives Considered

### React Native + React Native Web (one codebase)

**Rejected.** Degrades desktop experience: loses cursor proximity effects, tactile hover, CSS grid, keyboard navigation, backdrop-filter blur. Desktop is a point of pride for the product — making it worse to share code is the wrong trade.

### Big Bang Rewrite (replace everything with RN + RN Web)

**Rejected.** Months before anything demoable. No validation that native gestures deliver enough improvement to justify the cost. Web app works well today — don't break it.

### Do Nothing (stay Inertia-only, improve web interactions)

**Rejected.** The mobile web experience, while functional, doesn't sell the vision at record fairs. Native gestures, haptics, and App Store presence are meaningful differentiators for the product.

## References

- Issue #238: https://github.com/body-clock/milkcrate/issues/238
- Brainstorm session: `.superpowers/brainstorm/92374-1781026919/`
- Layered Rails skill: `/layers:gradual` for service layer extraction
- Inertia Rails testing: `inertia-rails-testing` skill for API spec patterns
