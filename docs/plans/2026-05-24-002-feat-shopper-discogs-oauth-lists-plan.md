---
title: "Shopper Discogs OAuth + Lists Integration"
type: feat
status: active
date: 2026-05-24
origin: docs/brainstorms/2026-05-24-shopper-discogs-oauth-lists-requirements.md
---

# Shopper Discogs OAuth + Lists Integration

## Summary

Give Milkcrate shoppers the ability to authenticate with Discogs, then send their pile of record listings to a private Discogs list for easy purchasing. A small Discogs icon in the header shows auth state. The pile sheet provides the "Send to Discogs" action.

---

## Problem Frame

The pile sheet has a disabled "Add all to Discogs cart" button labeled "Coming soon," but Discogs has no public cart API. Shoppers have no way to efficiently move their pile into a Discogs purchase flow. The existing "Discogs ↗" header link is vague and its destination (seller profile page) doesn't match what users expect. This feature replaces the header link with a shopper auth icon and enables list creation via the Discogs Lists API.

---

## Requirements

- R1. Create a `discogs_shoppers` table for persistent shopper OAuth tokens. (origin: R1)
- R2. Add shopper OAuth callback handling. Reuse the existing `/auth/discogs/callback` route, differentiating flows via session keys. (origin: R2, R3)
- R3. Create a Discogs Lists API client service for creating lists and adding items. (origin: R4)
- R4. Map pile listings to Discogs release IDs for the list API. Skip items with missing release data. (origin: R5)
- R5. List names follow the format "Picks from {store_name}". Lists are private. (origin: R6)
- R6. Replace "Discogs ↗" / "Store ↗" header link with a small Discogs icon showing auth state. (origin: R7, R8)
- R7. Pile sheet's disabled button becomes "Send to Discogs" — if not authed, initiate OAuth; if authed, create list. (origin: R9, R10)

**Origin actors:** A1 (Shopper), A2 (Discogs API)
**Origin flows:** F1 (Shopper authenticates via header icon), F2 (Shopper creates Discogs list from pile)
**Origin acceptance examples:** AE1 (header auth state), AE2 (list creation with skip counting), AE3 (unauthenticated redirect)

---

## Scope Boundaries

- **Direct one-click purchase** is deferred. This creates a list for browsing-based purchasing, not an automated buy.
- **Wantlist integration** is deferred.
- **Public or shareable lists** are deferred. Lists default to private.
- **Cross-store aggregated lists** are deferred.

### Deferred to Follow-Up Work

- Server-side pile persistence (pile remains localStorage-only for now).
- Polling or webhook for list creation status — current approach is fire-and-redirect.

---

## Context & Research

### Relevant Code and Patterns

- **OAuth flow pattern:** `AuthorizeStoreService` → session → Discogs redirect → callback → `AuthCallbackService` → create/update record. Shopper flow mirrors this exactly, minus inventory checks.
- **Discogs OAuth client:** `DiscogsOauthClient` handles request token, exchange, identity verification. Reusable as-is.
- **Session-based auth:** `SessionAuthenticatedController` pattern for `session[:store_owner_id]`. Shopper uses `session[:shopper_id]`.
- **Encrypted tokens:** `encrypts :discogs_oauth_token, :discogs_oauth_token_secret` on `StoreOwner`. Same pattern on `Shopper`.
- **Service result pattern:** `Data.define(:field, :error) { def success? = error.nil? }` throughout all services.
- **Inertia props pattern:** Props built in controller/presenter, typed in `app/frontend/types/inertia.ts`, passed to `render inertia:`.
- **Frontend provider pattern:** `PileProvider` wraps `AppLayoutInner`. A `ShopperProvider` follows the same pattern.
- **Pile sheet button:** Currently disabled at line 179 of `app/frontend/components/pile_sheet.tsx`.
- **Header links:** Current "Discogs ↗" and "Is this your store?" in `app/frontend/layouts/app_layout.tsx`.

### Institutional Learnings

- **OAuth 1.0a gotchas:** Authorize URL must be manually constructed to `www.discogs.com` (not `api.discogs.com`). Request tokens expire after 15 minutes. Access tokens never expire. Callback URL must match Discogs developer settings exactly. (source: `docs/solutions/integration-issues/discogs-oauth-csv-export-2026-05-22.md`)
- **Rate limiting:** Shared across all Discogs API calls via `DiscogsRateLimitMiddleware` Faraday middleware. No per-endpoint concern. (source: `docs/solutions/integration-issues/discogs-rate-limit-middleware-2026-05-19.md`)
- **OAuth tokens never in Inertia props:** Only boolean flag (`oauth_authorized`) is passed to frontend. Tokens stay server-side.
- **Session keys must be distinct:** Current OAuth uses `session[:oauth_store_slug]`, `session[:oauth_request_token]`, `session[:oauth_request_token_secret]`. Shopper flow uses `session[:shopper_oauth_*]` prefix.

### External References

- Discogs Lists API: `POST /lists`, `POST /lists/{list_id}/items` — requires OAuth 1.0a auth.
- Discogs Lists are private by default when created via API (no `public` parameter sent).
- Discogs listing data includes `release.id` in the seller inventory response — this is the release_id we need.

---

## Key Technical Decisions

- **Reuse existing callback URL, differentiate via session keys:** Only one callback URL can be registered with Discogs. The existing `GET /auth/discogs/callback` handles both flows by checking which session keys are present (`oauth_store_slug` → store-owner flow, `shopper_oauth_store_slug` → shopper flow).
- **New Shopper model (not extending StoreOwner):** Different auth intent (buying vs selling), separate tokens, separate session. Cleaner separation.
- **No shopper-session Controller concern yet:** Simple `session[:shopper_id]` check inline in the controller actions. Extract to a concern if more shopper-protected endpoints emerge.
- **No server-side pile storage:** Pile stays in localStorage. The "Send to Discogs" action sends current pile contents to the server in one POST. Simpler than syncing.
- **Lists API client as new service class:** `Discogs::ShopperListClient` — distinct from `Discogs::Marketplace` (seller-only endpoints) and `Discogs::PublicClient` (read-only). Uses OAuth access token from Shopper model.

---

## Implementation Units

### U1. Create `discogs_shoppers` table and model

**Goal:** Persistent storage for shopper Discogs OAuth access tokens, enabling cross-session authentication.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Create: `db/migrate/XXXXXXXXXXXXXX_create_discogs_shoppers.rb`
- Create: `app/models/shopper.rb`
- Modify: `app/frontend/types/inertia.ts` (add `Shopper` interface for frontend prop)
- Test: `spec/models/shopper_spec.rb`

**Approach:**
- Migration creates `discogs_shoppers` with columns: `discogs_username` (string, not null), `oauth_token` (text), `oauth_token_secret` (text), `store_slug` (string — the store where they first authed), `last_used_at` (datetime), timestamps. Unique index on `discogs_username`.
- Model uses `encrypts :oauth_token, :oauth_token_secret, support_unencrypted_data: true` matching the `StoreOwner` pattern.
- Frontend TypeScript interface: `{ discogs_username: string }` — ID and tokens never leave the server. Only the username/connected status is passed.

**Patterns to follow:**
- `app/models/store_owner.rb` — encrypted token pattern
- `AuthorizeStoreService` — `Data.define` result pattern

**Test scenarios:**
- **Happy path:** Creates a valid Shopper record with encrypted tokens.
- **Edge case: duplicate username:** `validates :discogs_username, uniqueness: true` prevents duplicate records.
- **Edge case: nil tokens:** Model saves with nil tokens (gracefully handles failed partial writes during callback).
- **Edge case: token encryption round-trip:** Encrypted token can be read back correctly.

**Verification:**
- Migration runs cleanly up and down.
- Model validates presence of `discogs_username` and uniqueness.
- Tokens are encrypted at rest (confirmed via database column inspection).

---

### U2. Shopper OAuth authorisation and callback flow

**Goal:** Allow shoppers to authenticate with Discogs via OAuth 1.0a, obtaining and persisting access tokens in the `Shopper` model.

**Requirements:** R2

**Dependencies:** U1 (Shopper model must exist)

**Files:**
- Create: `app/services/authorize_shopper_service.rb`
- Create: `app/services/shopper_auth_callback_service.rb`
- Modify: `app/controllers/auth_controller.rb` (extend callback to handle shopper flow)
- Create: `app/controllers/shopper_auth_controller.rb` (or extend `stores_controller.rb` with a new action)
- Modify: `config/routes.rb` (add shopper authorize route)
- Test: `spec/services/authorize_shopper_service_spec.rb`
- Test: `spec/services/shopper_auth_callback_service_spec.rb`
- Test: `spec/requests/shopper_auth_flow_spec.rb`

**Approach:**
- New route: `POST /auth/discogs/shopper/authorize` → `ShopperAuthController#authorize` (or a new endpoint).
  - Takes `store_slug` as a param (the store the shopper is browsing).
  - Creates a new route before the catch-all `/:slug`, matching the existing OAuth route pattern.
- `AuthorizeShopperService` mirrors `AuthorizeStoreService` but:
  - No inventory check (anyone can be a shopper).
  - Stores session keys with `shopper_oauth_` prefix to avoid collision: `session[:shopper_oauth_store_slug]`, `session[:shopper_oauth_request_token]`, `session[:shopper_oauth_request_token_secret]`.
  - Stores the store slug so the callback can redirect back to the correct store page.
- Extend `AuthController#callback`:
  - Check for `session[:shopper_oauth_store_slug]` → if present, delegate to `ShopperAuthCallbackService`.
  - Otherwise, continue with existing store-owner flow (backward compatible).
- `ShopperAuthCallbackService`:
  - Exchanges verifier for access token via `DiscogsOauthClient`.
  - Verifies identity via `DiscogsOauthClient.verify_identity`.
  - Finds or creates a `Shopper` record by `discogs_username`.
  - Sets `session[:shopper_id]` to the Shopper record ID.
  - Redirects back to the store page (`/:slug`).

**Patterns to follow:**
- `AuthorizeStoreService` — session key management, OAuth client reuse
- `AuthCallbackService` — `Data.define` result, identity verification, transaction pattern

**Test scenarios:**
- **Happy path — full flow:** Shopper clicks "Connect with Discogs" → redirected to Discogs → authorizes → callback → Shopper record created → redirected to store page with connected status.
- **Happy path — existing shopper:** Shopper has already authed. Callback finds existing record, updates tokens, redirects to store page.
- **Error path — expired request token:** Callback with no session keys → redirect with error message.
- **Error path — missing verifier:** Callback with no `oauth_verifier` param → redirect with error message.
- **Error path — identity mismatch:** Verified username doesn't match... actually, there's no slug check needed for shoppers. Shopper can be anyone.
- **Error path — Discogs API error:** OAuth exchange fails → redirect with error message.
- **Integration — no collision with store-owner flow:** Both store-owner and shopper sessions can coexist (different session key prefixes).
- **Integration — backward compatible:** Existing store-owner OAuth flow still works identically.

**Verification:**
- A shopper can complete the OAuth flow and `Shopper.count` increments by 1.
- The existing store-owner OAuth flow continues to work with no changes.
- Callback redirects to the correct store page after auth.

---

### U3. Discogs Lists API client

**Goal:** Create and manage Discogs lists on behalf of an authenticated shopper using their OAuth access token.

**Requirements:** R3, R5

**Dependencies:** U1 (Shopper model provides tokens), U2 (shopper must be authenticated)

**Files:**
- Create: `app/services/discogs/shopper_list_client.rb`
- Test: `spec/services/discogs/shopper_list_client_spec.rb`

**Approach:**
- New service class under `Discogs::ShopperListClient`.
- Constructor takes `access_token` and `access_token_secret` (from `Shopper` model).
- Uses `OAuth::AccessToken.new(DiscogsOauthConsumer.build, token, secret)` for authenticated requests, matching the `Discogs::Marketplace` pattern.
- Methods:
  - `create_list(name:, description: nil)` → `POST https://api.discogs.com/lists` with JSON body `{ name:, description:, is_private: true }`. Returns list ID and URL.
  - `add_item(list_id:, release_id:)` → `POST https://api.discogs.com/lists/{list_id}/items` with JSON body `{ release_id: }`. Returns success.
- Handles pagination/batching for adding multiple items — batch items into single requests where the API supports it, otherwise sequential.
- Error handling: wraps Discogs API errors into a result type with `.success?`.
- Rate limiting is handled by existing Faraday middleware — no additional concern here since we use `OAuth::AccessToken#post` directly (Faraday not used for OAuth-authenticated calls).

**Patterns to follow:**
- `Discogs::Marketplace` — OAuth `AccessToken` construction, response parsing, error handling
- `Discogs::PublicClient` — but this is OAuth so follow Marketplace pattern

**Test scenarios:**
- **Happy path — create list:** Valid name + description → returns list ID and list URL.
- **Happy path — add item:** Valid list_id + release_id → item added successfully.
- **Happy path — add multiple items:** Sequentially adds N items, all succeed.
- **Edge case — empty list name:** API rejects empty strings. Service validates name length before calling API.
- **Error path — invalid list ID:** API returns 404 → service returns error result with API message.
- **Error path — duplicate item:** API rejects duplicate release_id in list → service returns error result.
- **Error path — auth failure:** Token invalid/expired → API returns 401 → service returns error result.
- **Error path — rate limit:** API returns 429 → propagate `Errors::RateLimitError`.

**Verification:**
- Creating a list returns a usable list URL that resolves on discogs.com.
- Adding items to a list is idempotent (re-adding same release may be handled differently).
- All error paths return structured result types, not raw exceptions.

---

### U4. Backend endpoint for list creation from pile

**Goal:** Provide a server endpoint that accepts a shopper's pile contents, resolves release IDs, creates a Discogs list, and returns the list URL.

**Requirements:** R4, R5

**Dependencies:** U3 (Lists API client), U2 (shopper auth), U1 (Shopper model)

**Files:**
- Create: `app/controllers/pile_lists_controller.rb`
- Create: `app/services/create_pile_list_service.rb`
- Modify: `config/routes.rb` (add `POST /pile/create_list`)
- Test: `spec/requests/pile_list_creation_spec.rb`
- Test: `spec/services/create_pile_list_service_spec.rb`

**Approach:**
- New route: `POST /pile/create_list` → `PileListsController#create`, placed before the catch-all `/:slug` route.
- Controller action:
  - Protected by `session[:shopper_id]` check (redirect to auth if not set).
  - Accepts JSON body: `{ store_slug:, items: [{ discogs_listing_id:, title:, artist: }] }`.
  - Delegates to `CreatePileListService`.
  - Returns the Discogs list URL.
- `CreatePileListService`:
  - Takes `shopper` (Shopper record), `store_slug`, and `items` (array of listing hashes).
  - Resolves release IDs from `discogs_listing_id`. The Discogs listing data structure includes `release.id` in the seller inventory response. For each listing, look up the release_id. If we already have it from storefront curation data, use it. Otherwise, use Discogs API to resolve.
  - Creates a list named "Picks from {store.name}" using `Discogs::ShopperListClient`.
  - Adds each item's release_id to the list.
  - Skips items where release_id cannot be resolved.
  - Returns result with: `list_url`, `total_items`, `added_count`, `skipped_count`, `skipped_reason`.
- Name resolution: Fetch `store.name` by `store_slug` from the `Store` model.

**Patterns to follow:**
- `AuthController#callback` — session auth check pattern
- Service result type with detailed counts

**Test scenarios:**
- **Happy path:** 5 valid listings → list created with 5 items → returns `{ list_url:, added: 5, skipped: 0 }`.
- **Edge case — some items missing release_id:** 5 items, 4 have release_id → list created with 4 items → returns `{ added: 4, skipped: 1, skipped_reason: "release data unavailable" }`.
- **Edge case — all items missing release_id:** Returns error: "No items could be added to the list."
- **Edge case — empty pile:** Returns error with appropriate message.
- **Error path — shopper not authenticated:** Controller returns 401/redirect before service is called.
- **Error path — Discogs list creation fails:** API error → controller returns error with API message.
- **Error path — store not found:** Invalid store_slug → returns error.
- **Integration — full flow:** Authenticated shopper sends pile → list created → frontend receives list URL.

**Verification:**
- API endpoint exists and accepts POST with JSON body.
- Endpoint is idempotent for the same pile contents (creates a new list each time, which is the intended UX).
- Release ID resolution works for all listable items.

---

### U5. Frontend header: Discogs icon with auth state

**Goal:** Replace the "Discogs ↗" / "Store ↗" link in the header with a small Discogs icon that shows connection status via tooltip.

**Requirements:** R6

**Dependencies:** U2 (shopper auth flow exists), U4 (backend provides shopper status)

**Files:**
- Create: `app/frontend/components/discogs_auth_icon.tsx`
- Create: `app/frontend/contexts/shopper_context.tsx`
- Modify: `app/frontend/layouts/app_layout.tsx`
- Modify: `app/frontend/types/inertia.ts` (add `shopper` prop to layout types)
- Modify relevant controllers to pass `shopper` prop to storefront pages
- Test: `app/frontend/test/components/discogs_auth_icon.test.tsx`

**Approach:**
- `ShopperContext` provider wraps the app:
  - Reads `page.props.shopper` (the shopper's Discogs username or null/undefined).
  - Provides `{ shopper, isConnected, connect, disconnect }`.
  - `connect` triggers a form POST to `/auth/discogs/shopper/authorize` with the current store slug.
  - `disconnect` clears the local state (server-side disconnect is deferred).
- `DiscogsAuthIcon` component:
  - Small 18x18 Discogs logo SVG icon (sourced from Discogs brand resources or a simple "D" icon).
  - Wraps it in a button that, on click, calls `connect()`.
  - Tooltip on hover (CSS or framer-motion tooltip):
    - Not connected: "Connect with Discogs"
    - Connected: "Connected as @{username}"
  - Connected state adds a small green dot indicator.
  - Uses `rounded focus-visible:outline-none focus-visible:ring-2` matching existing header button patterns.
- Modify `app_layout.tsx`:
  - Import and wrap app in `ShopperProvider`.
  - Replace the "Discogs ↗" link block with `<DiscogsAuthIcon />`.
- Modify `stores_controller.rb#store_props` to pass `shopper` info:
  - If `session[:shopper_id]` present, query the `Shopper` record and pass `{ discogs_username: shopper.discogs_username }`.
  - Otherwise pass `nil`.
  - Add `shopper?: { discogs_username: string } | null` to the `Store` interface or a separate prop.

**Patterns to follow:**
- `PileProvider` in `app/frontend/contexts/pile_context.tsx` — context pattern with provider wrapping AppLayoutInner.
- Existing header button styles in `app_layout.tsx`.
- `usePage` props pattern from existing pages.

**Test scenarios:**
- **Happy path — disconnected state:** Shopper not authenticated → icon shows, tooltip says "Connect with Discogs", click initiates OAuth redirect.
- **Happy path — connected state:** Shopper authenticated → icon shows green indicator, tooltip says "Connected as @username", click does nothing new (auth already done).
- **Edge case — no store context:** On pages without a store (homepage, apply), icon is hidden or shows differently.
- **Edge case — loading state:** While OAuth redirect is in progress, no flicker.

**Verification:**
- Icon renders correctly in the header without breaking layout.
- Clicking the icon when disconnected redirects to Discogs OAuth.
- After OAuth callback, page reloads and shows connected state.

---

### U6. Frontend pile sheet: "Send to Discogs" with auth integration

**Goal:** Enable the pile sheet's "Send to Discogs" flow — authenticate if needed, create the list, and show results.

**Requirements:** R7

**Dependencies:** U5 (shopper auth context), U4 (list creation endpoint)

**Files:**
- Modify: `app/frontend/components/pile_sheet.tsx`
- Modify: `app/frontend/contexts/shopper_context.tsx` (add `createListFromPile` method)
- Create: `app/frontend/components/pile_list_result.tsx` (success/error states)
- Test: `app/frontend/test/components/pile_sheet.test.tsx` (extend existing tests)

**Approach:**
- Replace the disabled "Add all to Discogs cart" button with a live "Send to Discogs" button.
- Button behavior:
  - If shopper is not connected → click triggers `connect()` from `ShopperContext` (redirects to OAuth).
  - If shopper is connected → POST to `/pile/create_list` with the current pile items and store slug.
- State management in `PileSheet`:
  - States: `idle`, `connecting` (OAuth redirect), `creating`, `success`, `error`.
  - `creating` state shows a spinner or "Creating your Discogs list…" text.
  - `success` state replaces the list area with `PileListResult` component showing:
    - "✓ Added X of Y items to your Discogs list."
    - Link to the list on discogs.com (opens in new tab).
    - "Close" button to dismiss.
  - `error` state shows the error message with a "Try again" button.
- After list creation succeeds, the pile is not cleared (user may want to add more or try again).
- `ShopperContext.createListFromPile(items, storeSlug)`:
  - Makes a `fetch('/pile/create_list', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ store_slug: storeSlug, items }) })` call.
  - Returns the parsed response (list URL, counts).
- The pile items passed to the server include only the fields needed for release ID resolution: `discogs_listing_id`, and optionally `title`/`artist` for display.

**Patterns to follow:**
- Existing `PileSheet` component patterns — framer-motion transitions, sheet layout, button states.
- CSRF token retrieval pattern from `app_layout.tsx` (meta tag reading).
- Fetch pattern from `admin/dashboard.tsx` (Discogs onboarding lookup).

**Test scenarios:**
- **Happy path — authed shopper:** Shopper connected → clicks "Send to Discogs" → list created → shows success with link and counts.
- **Happy path — unauthed shopper:** Shopper not connected → clicks "Send to Discogs" → OAuth flow initiated → after callback, returns to pile → can now create list.
- **Edge case — all items skipped:** No items have release_id → shows "No items could be added" with explanation.
- **Edge case — network error:** POST fails → shows error state with "Try again" button.
- **Edge case — empty pile:** Button is disabled when pile is empty (same as current behavior for the disabled button).
- **Edge case — list creation API error:** Discogs API fails → shows error state with "Try again" button.

**Verification:**
- Button is enabled when pile has items (regardless of auth state — it triggers auth if needed).
- Successful list creation shows the list URL and item counts.
- Failed list creation shows a recoverable error state.
- Pile still exists after list creation (non-destructive).

---

## Implementation Sequence

The units should be implemented in dependency order:

1. **U1** (database + model) — foundation, no dependencies
2. **U2** (shopper OAuth flow) — depends on U1
3. **U3** (Lists API client) — depends on U1 (for token access)
4. **U4** (pile list creation endpoint) — depends on U2, U3
5. **U5** (header icon + auth context) — depends on U2 (must have auth endpoints to call)
6. **U6** (pile sheet integration) — depends on U4, U5

U5 and U6 are the frontend capstone — they tie everything together.

---

## System-Wide Impact

- **Interaction graph:** New route `/auth/discogs/shopper/authorize` and `POST /pile/create_list` must be placed **before** the catch-all `/:slug` route. New callback is handled by extending existing `AuthController#callback`.
- **Error propagation:** OAuth failures redirect to the store page with a flash alert. List creation failures return an error JSON response to the frontend.
- **State lifecycle risks:** Shopper OAuth session (`session[:shopper_id]`) is set during callback, cleared on explicit disconnect or session expiry. No partial-write risk — `ShopperAuthCallbackService` wraps in a transaction.
- **API surface parity:** Existing store-owner OAuth flow is completely unchanged. The callback extension is backward-compatible (checks session keys).
- **Unchanged invariants:** Store owner OAuth tokens, sync jobs, and dashboard are unaffected. The pile remains client-side only.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Discogs Lists API may not support batch item creation | Sequential `add_item` calls per item. Acceptable for typical pile sizes (5-50 items). |
| Discogs Lists API may have undocumented rate limits for list creation | The existing rate limit middleware handles this. One list per pile action is well within normal limits. |
| Shopper OAuth callback URL conflicts with existing Discogs app config | Extending the existing callback endpoint avoids needing a new registered URL. The session key prefix ensures flow differentiation. |
| Release ID resolution may be costly for large piles | Storefront data already includes `release.id` from the Discogs seller inventory response. No additional API calls needed for items with cached data. |

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-24-shopper-discogs-oauth-lists-requirements.md](docs/brainstorms/2026-05-24-shopper-discogs-oauth-lists-requirements.md)
- Related code: `app/services/authorize_store_service.rb`, `app/services/auth_callback_service.rb`, `app/services/discogs_oauth_client.rb`, `app/services/discogs/marketplace.rb`
- Related patterns: `app/frontend/contexts/pile_context.tsx`, `app/frontend/layouts/app_layout.tsx`, `app/frontend/components/pile_sheet.tsx`
- Learnings: `docs/solutions/integration-issues/discogs-oauth-csv-export-2026-05-22.md`
