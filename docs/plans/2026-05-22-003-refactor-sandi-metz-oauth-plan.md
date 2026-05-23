---
title: "Refactor OAuth code per Sandi Metz POODR review"
type: refactor
status: active
date: 2026-05-22
---

# Refactor OAuth Code per Sandi Metz POODR Review

## Summary

Address the Sandi Metz reviewer findings on the OAuth diff: extract overgrown controller/service methods into focused objects, eliminate duplicated OAuth consumer configuration, split mixed-responsibility classes, and separate parsing from filtering. No behavioral changes — all existing tests must continue passing.

---

## Problem Frame

The OAuth implementation ships several violations flagged by the Sandi Metz reviewer: `AuthController#callback` at 62 lines, `StoresController#authorize` instantiating 2 objects, `CsvExportSyncService#call` at 44 lines doing 4 things, a triplicated `OAuth::Consumer` configuration in 3 files, `DiscogsClient` mixing two auth strategies, and the CSV parser blending parsing with business-rule filtering.

---

## Requirements

- R1. `AuthController#callback` delegates to a single service object
- R2. `StoresController#authorize` instantiates one object
- R3. `CsvExportSyncService#call` decomposed into private step methods
- R4. `OAuth::Consumer` configuration defined in one place
- R5. CSV parser separates type coercion from business-rule filtering
- R6. All 485 existing tests continue to pass — no behavioral changes

### Deferred to Follow-Up Work

- Split `DiscogsClient` into public and OAuth clients — significant interface change, best done when more OAuth-only endpoints are added
- Extract shared post-sync orchestration — both jobs currently handle this identically, but abstracting now risks premature abstraction
- Extract `ListingDiff` comparator — low risk, can inline when the pattern proves stable

---

## Implementation Units

### U1. Extract shared `DiscogsOauthConsumer.build`

**Goal:** Single source of truth for OAuth Consumer configuration, used by `DiscogsOauthClient`, `DiscogsClient`, and `AuthController`.

**Dependencies:** None

**Files:**
- Create: `app/services/discogs_oauth_consumer.rb`
- Modify: `app/services/discogs_oauth_client.rb`
- Modify: `app/services/discogs_client.rb`
- Modify: `app/controllers/auth_controller.rb`

**Approach:**
- Create `DiscogsOauthConsumer.build` class method that reads credentials and returns a configured `OAuth::Consumer`
- Replace the three inline `OAuth::Consumer.new(...)` calls with `DiscogsOauthConsumer.build`
- Tests already mock `DiscogsOauthClient` and `DiscogsClient` at the class level, so no test changes needed

**Test expectation:** None — pure code extraction, existing mocks/behavior unchanged.

**Verification:**
- `bundle exec rspec spec/` passes with 0 failures

---

### U2. Extract `AuthCallbackService`

**Goal:** Move OAuth callback logic out of `AuthController#callback` into a service object.

**Dependencies:** U1 (uses the shared consumer)

**Files:**
- Create: `app/services/auth_callback_service.rb`
- Modify: `app/controllers/auth_controller.rb`
- Test: `spec/services/auth_callback_service_spec.rb`

**Approach:**
- `AuthCallbackService.new(slug:, request_token:, request_token_secret:, oauth_verifier:).call` → `Result` with `store`, `error`
- Handles: reconstructing request token, exchanging for access token, verifying identity against slug, creating/looking up store, persisting tokens, setting session, enqueuing CSV sync
- Controller becomes: `result = AuthCallbackService.new(...).call` + redirect with notice/error
- The service should NOT set the session — it returns the store; the controller sets the session

**Patterns to follow:**
- `DiscogsOauthClient` for service object pattern (`Data.define` results, `.call` class method)
- `StoreOnboarding` for store creation with dependency injection

**Test scenarios:**
- Happy path: valid verifier and matching identity returns store with tokens
- Error: identity mismatch returns error, no store
- Error: OAuth exchange failure returns error
- Error: store creation failure returns error
- Error: missing session data returns error

**Verification:**
- All callback request specs (`spec/requests/oauth_flow_spec.rb`) still pass with `allow_any_instance_of` stubs adjusted to mock the new service
- `bundle exec rspec spec/requests/oauth_flow_spec.rb` passes

---

### U3. Extract `AuthorizeStoreService`

**Goal:** Move inventory check + OAuth initiation out of `StoresController#authorize` into a service.

**Dependencies:** U1 (uses the shared consumer)

**Files:**
- Create: `app/services/authorize_store_service.rb`
- Modify: `app/controllers/stores_controller.rb`
- Test: `spec/services/authorize_store_service_spec.rb`

**Approach:**
- `AuthorizeStoreService.new(slug:).call` → `Result` with `authorize_url`, `error`, `session_data` (request token, store slug)
- Handles: seller inventory check (500 minimum), DiscogsClient call, OAuth request token, returns session data
- Controller becomes: `result = AuthorizeStoreService.new(slug:).call` + set session + redirect
- Controller no longer instantiates `DiscogsClient` or `DiscogsOauthClient` directly

**Patterns to follow:**
- Existing service pattern (`Data.define` results, `.call` class method, dependency injection)

**Test scenarios:**
- Happy path: sufficient inventory returns authorize URL
- Error: insufficient inventory (< 500) returns error message
- Error: Discogs API unavailable returns error
- Error: OAuth request token failure returns error

**Verification:**
- Authorize request specs still pass
- `bundle exec rspec spec/requests/oauth_flow_spec.rb` passes

---

### U4. Decompose `CsvExportSyncService#call`

**Goal:** Break the 44-line method into named private step methods.

**Dependencies:** U1 (uses the shared consumer)

**Files:**
- Modify: `app/services/csv_export_sync_service.rb`
- Test: no new tests needed — integration tests cover the behavior

**Approach:**
- `call` becomes: `setup_status!` → `fetch_and_parse!` → `upsert_listings!` → `finalize_status!`
- Each step method is ≤ 5 lines
- The `materially_changed?` method stays for now (deferred to a future `ListingDiff` extraction)

**Test expectation:** None — pure method decomposition, no behavioral change. Integration tests verify behavior.

**Verification:**
- `bundle exec rspec spec/integration/csv_export_sync_integration_spec.rb` passes

---

### U5. Separate CSV parser parsing from filtering

**Goal:** `CsvParser#normalize_row` should parse only; filtering moves to a separate step.

**Dependencies:** None

**Files:**
- Modify: `app/services/csv_export_sync/csv_parser.rb`
- Modify: `app/services/csv_export_sync_service.rb`
- Modify: `spec/services/csv_export_sync/csv_parser_spec.rb`

**Approach:**
- `CsvParser#call` returns ALL parsed records (including sold, non-vinyl, etc.)
- Add `CsvParser::RecordFilter` module with predicates: `vinyl?`, `available?`, `has_listing_id?`
- `CsvExportSyncService#call` calls the parser, then filters via `RecordFilter`
- `CsvParser#normalize_row` becomes a pure type-coercion method — no `return nil unless` guards
- Field coercion moves to a declarative mapping on `HEADER_TO_FIELD` (each field carries a `coerce:` lambda)

**Patterns to follow:**
- Duck typing for field coercion — each field specifies its own coercion strategy

**Test scenarios:**
- Happy path: parser returns all rows (including sold, non-vinyl)
- Filter: `RecordFilter.vinyl?` correctly filters non-vinyl
- Filter: `RecordFilter.available?` correctly filters sold/draft
- Integration: service parsing + filtering produces same result as before

**Verification:**
- Existing CSV parser specs updated to expect unfiltered output
- Integration tests pass
- `bundle exec rspec spec/services/csv_export_sync/` passes

---

## Sources & References

- **Sandi Metz reviewer findings:** JSON report from ce-sandi-metz-reviewer on feat/discogs-oauth diff
- **Existing plan:** `docs/plans/2026-05-22-002-feat-discogs-oauth-partnership-plan.md`
- **Existing tests:** `spec/requests/oauth_flow_spec.rb`, `spec/integration/csv_export_sync_integration_spec.rb`
