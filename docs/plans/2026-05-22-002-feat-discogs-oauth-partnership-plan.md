---
title: "Discogs OAuth partnership — claim flow, CSV export sync, and store dashboard"
type: feat
status: active
date: 2026-05-22
---

# Discogs OAuth Partnership — Claim Flow, CSV Export Sync, and Store Dashboard

## Summary

Build a Discogs OAuth 1.0a claim flow integrated into the existing storefront invitation system — when a vendor visits `/:slug` and we find their Discogs profile, they can claim their store via OAuth instead of joining a waitlist. OAuth unlocks full-inventory sync via Discogs' CSV export API (no 10k ceiling) and a store owner dashboard. Target: demo-ready for Philamoca record fair on June 6.

---

## Problem Frame

The public Discogs inventory API caps at 10,000 listings (100 pages × 100 records). Stores like Philadelphia Music with 90,000 listings are unreachable. There is no push mechanism for listing changes — if a record sells, the app keeps showing it until the next sync, destroying buyer trust. The current onboarding flow requires an admin to create stores from a waitlist — no self-service for store owners.

Discogs OAuth 1.0a unlocks two capabilities: the Inventory Export API (full CSV, no 10k ceiling) and the List Orders API (poll for sold-item detection). The OAuth flow also serves as identity verification — the store owner proves they control the Discogs account by completing the OAuth dance.

The invitation page at `/:slug` already does the discovery work (probes Discogs, finds the seller). OAuth should be the next step in that same flow, not a separate endpoint.

---

## Requirements

- R1. Store owners can claim their store by authenticating with Discogs OAuth directly from the existing invitation page at `/:slug`
- R2. Claimed stores receive full-inventory sync using Discogs' CSV export endpoint, replacing the paginated API for OAuth-authorized stores
- R3. Store owners see a minimal dashboard after claiming: sync status, storefront URL, basic stats
- R4. The existing public-API free demo continues working unchanged for unclaimed stores
- R5. Existing free-demo stores have a path to upgrade to OAuth
- R6. Founding member email capture for the soft-commitment pricing model
- R7. Demo-ready by June 6 for the Philamoca record fair

---

## Scope Boundaries

- OAuth 1.0a only (Discogs does not support OAuth 2.0)
- No payment/subscription integration — OAuth is free during beta
- No store-owner password auth — OAuth IS the authentication
- No storefront UI changes for buyers — free demo and OAuth stores look the same to buyers
- No admin dashboard changes — admin flow remains unchanged
- No Stripe, billing, or subscription logic

### Deferred to Follow-Up Work

- Order polling job for sold-item detection — valuable but not essential for Philamoca; can ship as second pass
- Advanced store dashboard features (analytics, conversion proof) — covered in strategy doc as paid tier features

---

## Context & Research

### Relevant Code and Patterns

- `app/services/discogs_client.rb` — existing Faraday client with static token auth; must evolve to support per-store tokens
- `app/services/discogs_rate_limit_middleware.rb` — rate-limit middleware
- `app/services/store_onboarding.rb` — existing admin-triggered onboarding; `Data.define` results, `.call` class method, dependency injection
- `app/services/store_sync/inventory_fetcher.rb` — existing paginated API fetcher
- `app/jobs/full_store_sync_job.rb` — existing sync job; will branch on sync source
- `app/models/store.rb` — store model; will gain OAuth token columns
- `app/controllers/stores_controller.rb` — renders invitation page for unknown stores, storefront for known stores
- `app/frontend/pages/stores/invitation.tsx` — the invitation page that probes Discogs and offers "Claim this storefront"
- `app/services/discogs_seller_lookup.rb` — uses `Rails.cache` for Discogs lookups
- FactoryBot patterns: `spec/factories/stores.rb`
- Request spec patterns: `spec/requests/stores_spec.rb` — Inertia request specs
- Service spec patterns: `spec/services/store_onboarding_spec.rb`

### Institutional Learnings

- Existing rate-limit middleware (`docs/solutions/integration-issues/discogs-rate-limit-middleware-2026-05-19.md`)
- `StoreSync::StatusManager` pattern for sync state tracking
- Existing cache patterns (Discogs lookups: `FOUND_TTL = 1.hour` / `NOT_FOUND_TTL = 24.hours`)

### External References

- Discogs API authentication: OAuth 1.0a only, request token at `/oauth/request_token`, access token at `/oauth/access_token`, authorize at `https://www.discogs.com/oauth/authorize`
- Discogs inventory export: `POST /inventory/export` triggers CSV generation, `GET /inventory/export/{id}` checks status, `GET /inventory/export/{id}/download` retrieves CSV
- `oauth` gem (Ruby) handles OAuth 1.0a HMAC-SHA1 signing

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Use `oauth` gem directly** (not OmniAuth) | Single provider, custom UI flow embedded in existing invitation page. Lower overhead. |
| **Store OAuth tokens in `stores` table** (not a new User model) | A store owner IS the store — no separate user abstraction. OAuth verifies ownership. Session keyed to store ID. |
| **OAuth initiated from `StoresController#authorize`** (POST `/:slug/authorize`) | Follows the existing flow: visit `/:slug` → invitation page → "Claim with Discogs" button POSTs to authorize action. No separate `/claim` needed. |
| **Dedicated `AuthController` for callback** (`GET /auth/discogs/callback`) | The callback URL is registered in Discogs and must be fixed. A dedicated controller keeps this clean. |
| **DiscogsClient becomes configurable per-store** | Optional `access_token`/`access_token_secret` constructor args. OAuth-signed when present, falls back to app token. Backward compatible. |
| **Session cookie for store owner auth** | Signed cookie with `store_id`. No passwords, no Devise. OAuth IS the auth. |
| **CSV export sync as separate job type** | `CsvExportSyncJob` for OAuth stores, `FullStoreSyncJob` for free-demo stores. |
| **Existing store upgrade path** | Add a subtle "Is this your store?" link in the storefront page header for non-OAuth stores, leading to OAuth flow |
| **Free tier untouched** | Zero changes to public storefront or existing sync pipeline for non-OAuth stores |

---

## Implementation Units

### U1. Database migration — OAuth token columns

**Goal:** Add OAuth token storage to the `stores` table.

**Requirements:** R1, R2

**Dependencies:** None

**Files:**
- Create: `db/migrate/YYYYMMDDHHMMSS_add_discogs_oauth_to_stores.rb`
- Modify: `app/models/store.rb`
- Modify: `spec/factories/stores.rb`
- Test: `spec/models/store_spec.rb`

**Approach:**
- Add columns: `discogs_oauth_token` (string, nullable), `discogs_oauth_token_secret` (string, nullable), `oauth_authorized_at` (datetime, nullable), `sync_source` (string, default: "public_api"), `owner_email` (string, nullable)
- Add enum for `sync_source`: `public_api` (default), `csv_export`
- Add `oauth_authorized?` predicate method: returns true when all three OAuth columns are present

**Patterns to follow:**
- Existing string enums on Store: `sync_status`, `catalog_coverage`, `enrichment_status`

**Test scenarios:**
- Happy path: store with OAuth columns populated returns `oauth_authorized?` as true
- Edge case: store with nil token columns returns `oauth_authorized?` as false
- Edge case: `sync_source` defaults to `"public_api"` for new stores
- Edge case: `oauth_authorized_at` is nil for non-OAuth stores

**Verification:**
- Migration runs cleanly up and down
- Existing store factory still creates valid records
- `spec/models/store_spec.rb` passes

---

### U2. Discogs OAuth 1.0a client

**Goal:** Build the OAuth 1.0a dance client — request token, authorize URL, access token exchange.

**Requirements:** R1

**Dependencies:** U1 (token storage)

**Files:**
- Create: `app/services/discogs_oauth_client.rb`
- Add gem: `oauth` to Gemfile
- Test: `spec/services/discogs_oauth_client_spec.rb`

**Approach:**
- `DiscogsOAuthClient` wraps `OAuth::Consumer` with Discogs OAuth endpoints
- Methods: `request_token(callback_url:)` → returns `OAuth::RequestToken`; `exchange_access_token(request_token, verifier)` → returns access token + secret; `verify_identity(access_token, secret)` → calls `/oauth/identity`, returns username
- Consumer key/secret from `Rails.application.credentials.dig(:discogs, :consumer_key)` and `:consumer_secret`
- Request tokens are short-lived — stored in session during the OAuth flow

**Patterns to follow:**
- `DiscogsClient` for service object pattern and dependency injection
- `Data.define` for result types

**Test scenarios:**
- Happy path: `request_token` returns a valid `OAuth::RequestToken` with authorize URL
- Happy path: `exchange_access_token` returns valid access token and secret
- Happy path: `verify_identity` returns the Discogs username from `/oauth/identity`
- Error path: Discogs returns error during request token (invalid consumer key/secret)
- Error path: Discogs returns error during access token exchange (invalid/expired verifier)
- Edge case: token exchange with nil verifier raises appropriate error

**Verification:**
- Specs pass with mocked OAuth endpoints
- No real API calls in test suite

---

### U3. OAuth initiation from invitation page

**Goal:** Modify the existing invitation flow so the "Claim this storefront" button can start OAuth directly.

**Requirements:** R1, R5

**Dependencies:** U1, U2

**Files:**
- Modify: `app/controllers/stores_controller.rb` (add `#authorize` action)
- Modify: `app/frontend/pages/stores/invitation.tsx`
- Modify: `config/routes.rb`
- Test: `spec/requests/stores_spec.rb`

**Approach:**
- Add `StoresController#authorize` action that responds to `POST /:slug/authorize`
- Receives the Discogs username from params, looks up or creates a `Store` for that username
- Initiates OAuth via `DiscogsOAuthClient#request_token`, stores the request token in session along with the store ID
- Redirects to the Discogs authorization URL
- Modify the invitation page: when the Discogs probe finds a seller, the CTA button changes from linking to `/apply` to POSTing to `/:slug/authorize`
- Keep the `/apply` path as a secondary option for stores that prefer the waitlist
- Route: `post "/:slug/authorize" => "stores#authorize", constraints: { slug: /.../ }` — must be placed before the catch-all `/:slug` route

**How the routes interact:**

```
GET  /:slug                    → stores#show       (storefront or invitation)
POST /:slug/authorize          → stores#authorize   (start OAuth)
GET  /auth/discogs/callback    → auth#callback      (OAuth return) — registered as fixed URL in Discogs app settings
```

**Existing store upgrade path:**
- For stores that exist and are NOT OAuth'd (`store.persisted? && !store.oauth_authorized?`), the storefront header gets a subtle "Is this your store?" link
- This POSTs to the same `/:slug/authorize` endpoint, which recognizes the store already exists and initiates OAuth without creating a duplicate

**Patterns to follow:**
- `StoresController` existing structure
- `StoreOnboarding` for store creation
- Route ordering: the `/:slug/authorize` route must be defined before `/:slug` to avoid the catch-all matching

**Test scenarios:**
- Happy path: POST to `/:slug/authorize` for unknown store → store created, OAuth initiated, redirect to Discogs
- Happy path: POST to `/:slug/authorize` for existing non-OAuth store → OAuth initiated, no duplicate store
- Happy path: store creation via OAuth works (name lookup via `seller_profile`)
- Edge case: POST with blank slug returns error
- Edge case: invitation page renders "Claim with Discogs" button when probe finds seller
- Edge case: invitation page still shows "Apply to join" link as secondary option
- Edge case: existing store page shows "Is this your store?" link when not OAuth'd

**Verification:**
- Request specs pass for authorize action
- Existing storefront + invitation specs continue to pass
- Manual test: visit `/:slug` for unknown store, see "Claim with Discogs", click, redirected to Discogs

---

### U4. OAuth callback handler

**Goal:** Handle the OAuth callback from Discogs — exchange verifier for access token, verify identity, store tokens, set session.

**Requirements:** R1

**Dependencies:** U1, U2, U3

**Files:**
- Create: `app/controllers/auth_controller.rb` (with `#callback` action)
- Modify: `config/routes.rb`
- Test: `spec/requests/auth_spec.rb`

**Approach:**
- `GET /auth/discogs/callback` receives `oauth_token` and `oauth_verifier` params from Discogs
- Retrieves request token and store ID from session
- Exchanges request token + verifier for access token and secret
- Calls `/oauth/identity` to verify the returned username matches the store's `discogs_username`
- On success: stores tokens on the store, sets `sync_source` to `csv_export`, sets `oauth_authorized_at`, sets session cookie with store ID
- Enqueues `CsvExportSyncJob` to trigger the initial CSV sync
- Redirects to `/dashboard` with a success flash
- On failure (username mismatch, expired token, missing session): redirects to `/:slug` (the store's invitation page or storefront) with error flash

**Patterns to follow:**
- Rails flash messages for success/error feedback
- `StoreOnboarding` error handling pattern

**Test scenarios:**
- Happy path: valid callback → tokens stored, session set, initial sync enqueued, redirect to `/dashboard`
- Happy path: identity verification matches the expected username
- Error path: `oauth_verifier` missing or invalid → redirect to `/:slug` with error
- Error path: identity verification returns a different username than claimed → redirect to `/:slug` with error
- Error path: session expired (no request token) → redirect to `/:slug` with error
- Edge case: store was deleted between authorize and callback

**Verification:**
- Request specs pass for all callback scenarios
- Session contains store ID after successful callback

---

### U5. Per-store DiscogsClient for OAuth stores

**Goal:** Evolve `DiscogsClient` to support per-store OAuth-authenticated requests alongside the existing app-wide token.

**Requirements:** R2

**Dependencies:** U1

**Files:**
- Modify: `app/services/discogs_client.rb`
- Test: `spec/services/discogs_client_spec.rb`

**Approach:**
- Add optional `access_token:` and `access_token_secret:` keyword args to `DiscogsClient#initialize`
- When provided, use `OAuth::AccessToken` to sign requests instead of the static `Discogs token=#{@token}` header
- When not provided, use the existing personal access token (backward compatible)
- The `seller_inventory` method is unchanged — works the same for both auth types
- Add new methods for OAuth-only endpoints: `inventory_export` (POST), `check_export_status` (GET), `download_export` (GET), `list_orders` (GET)
- New methods raise `ApiError` if called without OAuth tokens

**Patterns to follow:**
- Existing Faraday connection pattern and middleware stack
- `DiscogsRateLimitMiddleware` remains shared

**Test scenarios:**
- Happy path: `DiscogsClient.new` without OAuth tokens works as before (backward compat)
- Happy path: `DiscogsClient.new(access_token:, access_token_secret:)` signs requests with OAuth
- Error path: OAuth-only methods raise `ApiError` when no tokens provided
- Integration: OAuth-signed `inventory_export` request returns expected response

**Verification:**
- Existing specs continue to pass without changes
- New specs pass for OAuth-authenticated methods

---

### U6. CSV export sync service and job

**Goal:** Build the full-inventory sync path using Discogs' CSV export API for OAuth-authorized stores.

**Requirements:** R2, R4

**Dependencies:** U5

**Files:**
- Create: `app/services/csv_export_sync_service.rb`
- Create: `app/services/csv_export_sync/export_requester.rb`
- Create: `app/services/csv_export_sync/csv_parser.rb`
- Create: `app/jobs/csv_export_sync_job.rb`
- Modify: `app/jobs/full_store_sync_job.rb` (route OAuth stores to CSV sync)
- Modify: `app/services/store_sync_service.rb` — may not need changes if CSV sync is fully separate
- Test: `spec/services/csv_export_sync_service_spec.rb`
- Test: `spec/services/csv_export_sync/csv_parser_spec.rb`
- Test: `spec/jobs/csv_export_sync_job_spec.rb`

**Approach:**
- `CsvExportSyncJob#perform(store_id)`: uses OAuth-authenticated client to trigger export (`POST /inventory/export`), polls `GET /inventory/export/{id}` until status is `"completed"`, downloads CSV, parses it, reconciles listings
- `CsvExportSync::ExportRequester`: handles the trigger + poll loop (exports can take minutes for large stores). Uses 30-second polling intervals with a 10-minute timeout
- `CsvExportSync::CsvParser`: parses Discogs CSV format into normalized listing hashes (columns: `listing_id`, `release_id`, `artist`, `title`, `label`, `catno`, `format`, `condition`, `price`, `sleeve_condition`, `status`, `posted`, `quantity`, `comments`)
- Reuse `StoreSync::ListingReconciler` for the upsert/reconcile step — the CSV has the same listing fields
- `FullStoreSyncJob` checks `store.sync_source` — if `csv_export`, enqueue `CsvExportSyncJob` instead of running paginated API sync
- `SyncAllStoresJob` (the nightly fan-out) also respects `sync_source` when selecting which sync to enqueue
- Concurrency: per-store key `limits_concurrency to: 1, key: ->(store_id) { "csv_export:#{store_id}" }` since each OAuth token has its own rate limit
- `StoreSync::StatusManager` is used for sync status updates

**Patterns to follow:**
- `StoreSync::InventoryFetcher` for fetcher abstraction
- `FullStoreSyncJob` for job structure
- Existing `StoreSync::ListingReconciler` for listing upsert

**Test scenarios:**
- Happy path: trigger export → poll to completion → download CSV → parse → reconcile listings
- Happy path: CSV parser handles all expected columns (with and without quotes)
- Edge case: export takes multiple poll cycles (simulate delay)
- Edge case: CSV has 0 listings (empty store)
- Edge case: CSV has 90,000+ rows (large store)
- Error path: export fails with Discogs API error → retry with backoff via Solid Queue
- Error path: CSV format is unexpected (missing columns) → graceful error, store marked as failed
- Error path: download returns error → retry
- Integration: `FullStoreSyncJob` routes to `CsvExportSyncJob` when `sync_source` is `csv_export`
- Integration: `FullStoreSyncJob` uses paginated API when `sync_source` is `public_api`
- Integration: `SyncAllStoresJob` fans out the correct job per store

**Verification:**
- Unit specs pass for each component
- Integration spec verifies routing between old and new sync paths
- Manual test: trigger sync on a test store via the dashboard

---

### U7. Store owner dashboard (post-OAuth)

**Goal:** Minimal dashboard page for OAuth-authorized store owners showing sync status, storefront URL, and basic stats.

**Requirements:** R3

**Dependencies:** U4 (session), U6 (sync status)

**Files:**
- Create: `app/controllers/dashboard_controller.rb`
- Create: `app/frontend/pages/dashboard/index.tsx`
- Create: `app/presenters/dashboard_presenter.rb`
- Modify: `config/routes.rb`
- Test: `spec/requests/dashboard_spec.rb`

**Approach:**
- `DashboardController` requires an authenticated session (store owner must have completed OAuth)
- `before_action :require_store_owner` checks session for store ID, verifies store exists and `oauth_authorized?`
- Renders a minimal dashboard with: store name, storefront URL (`/slug`), sync status, last synced time, total listing count, "Re-sync now" button
- The "Re-sync now" button POSTs to `/dashboard/resync` which enqueues `CsvExportSyncJob`
- Dashboard presenter follows `Admin::DashboardPresenter` pattern

**Patterns to follow:**
- `Admin::BaseController` for before_action pattern (but without HTTP Basic Auth)
- `Admin::DashboardPresenter` for presenter pattern
- Inertia page rendering from existing controllers

**Test scenarios:**
- Happy path: authenticated store owner sees dashboard with store info
- Edge case: unauthenticated visitor is redirected to the storefront at `/:slug`
- Edge case: store owner with expired/invalid session is redirected to `/:slug`
- Edge case: store owner triggers re-sync and sees status updating
- Error path: store record not found for session ID → clear session, redirect to `/:slug`

**Verification:**
- Request specs pass for authenticated and unauthenticated scenarios
- Dashboard renders correctly with store data

---

### U8. Founding member signup (soft commitment)

**Goal:** Capture email addresses from stores that authorize at Philamoca, for the soft-commitment pricing model.

**Requirements:** R6

**Dependencies:** U4 (post-OAuth), U7 (dashboard)

**Files:**
- Modify: `app/controllers/dashboard_controller.rb` (add `#signup` action)
- Modify: `app/frontend/pages/dashboard/index.tsx` (welcome overlay)
- Test: `spec/requests/dashboard_spec.rb`

**Approach:**
- First time an OAuth store owner visits the dashboard, show a welcome overlay
- "You're in! Milkcrate is free during beta. Leave your email for early access to premium features when we launch."
- Simple email form, POSTs to `/dashboard/signup`
- Stores email on `store.owner_email` (column added in U1)
- Track whether the overlay has been dismissed via a session flag or a `welcome_seen_at` column

**Test scenarios:**
- Happy path: submitting email stores it and dismisses the overlay
- Edge case: blank email shows validation error (can dismiss without submitting)
- Edge case: returning store owner does not see the overlay again

**Verification:**
- Email is persisted after form submission
- Welcome overlay only shows on first visit

---

## System-Wide Impact

- **Interaction graph:** `StoresController` gains an `authorize` action. New `AuthController` for the callback. New `DashboardController`. `FullStoreSyncJob` gains a conditional branch. No existing buyer-facing code changes.
- **Error propagation:** OAuth failures redirect to `/:slug` with flash messages. CSV export failures retry via Solid Queue. Fatal sync errors use `StoreSync::StatusManager#mark_failed!`.
- **State lifecycle risks:** OAuth tokens are long-lived (no expiry) but could be revoked. The sync job handles 401 responses by marking the token as invalid and falling back to public API.
- **API surface parity:** No changes to public storefront routes. New routes: `POST /:slug/authorize`, `GET /auth/discogs/callback`, `GET /dashboard`, `POST /dashboard/resync`, `POST /dashboard/signup`.
- **Unchanged invariants:** The existing public-API sync, storefront rendering, curation engine, and admin dashboard are completely unchanged.
- **Concurrency model:** `limits_concurrency to: 1, key: "discogs_api"` applies to `FullStoreSyncJob` and `EnrichmentJob` (shared app token). `CsvExportSyncJob` uses per-store keys.

---

## Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **OAuth 1.0a HMAC signing complexity** | Medium | High | Use the well-maintained `oauth` gem; Discogs docs have working examples |
| **Discogs CSV export API is slow for large stores** | High | Medium | Export can take minutes for 90k+ stores. Use async polling with 30s intervals and 10min timeout |
| **Two-week timeline is tight** | High | Medium | Prioritize U1-U6 and U7 for Philamoca; U8 is optional polish; cut scope aggressively |
| **No existing store-owner session mechanism** | Low | Medium | Simple signed cookie works for beta; can harden later |
| **Route ordering with `/:slug` catch-all** | Low | Medium | The `POST /:slug/authorize` route must be defined before `/:slug` — explicitly order in routes.rb |

## Documentation / Operational Notes

- Add `discogs_consumer_key` and `discogs_consumer_secret` to `Rails.application.credentials`
- Register milkcrate application in Discogs developer settings to get consumer key/secret
- Set callback URL in Discogs app settings to `https://milkcrate.fm/auth/discogs/callback` (production) and `http://localhost:3000/auth/discogs/callback` (development)
- After deployment, existing stores can upgrade by visiting their storefront page and clicking "Is this your store?"
- No database migration timing risk — additive columns only, safe to deploy before app update

## Sources & References

- **Strategy doc:** `STRATEGY.md` — OAuth partnership track, two-tier model
- **Discogs rate-limit middleware:** `docs/solutions/integration-issues/discogs-rate-limit-middleware-2026-05-19.md`
- **Discogs API docs:** https://www.discogs.com/developers#page:authentication
- **Discogs inventory export:** https://www.discogs.com/developers#page:inventory-export
- **Existing storefront/invitation flow:** `app/controllers/stores_controller.rb`, `app/frontend/pages/stores/invitation.tsx`
- **Existing sync architecture:** `app/services/store_sync_service.rb`, `app/services/store_sync/inventory_fetcher.rb`
- **Existing onboarding:** `app/services/store_onboarding.rb`
- **Faraday + OAuth 1.0a:** `oauth` gem
