---
title: 'refactor: Extract store sync mechanisms into strategy objects'
type: refactor
status: active
date: 2026-05-22
origin: docs/brainstorms/2026-05-22-store-sync-strategies-requirements.md
---

# Refactor: Extract Store Sync Mechanisms into Strategy Objects

## Summary

Replace the scattered `if oauth_authorized?` routing between `StoreSyncService` (public API pagination) and `CsvExportSyncService` (OAuth CSV export) with interchangeable strategy objects. Each strategy implements a common `call → SyncResult(listings, complete?)` interface. `FullStoreSyncJob` becomes the universal sync entry point — it calls `store.sync_strategy.call` without knowing which strategy runs. `CsvExportSyncJob` is deleted, and its callers (`AuthCallbackService`, `DashboardController#resync`) use `FullStoreSyncJob` instead.

---

## Problem Frame

The `sync_source` enum on Store already captures which sync mechanism a store uses, but the routing logic lives outside the model — `FullStoreSyncJob` checks `store.oauth_authorized?` and dispatches to either `StoreSyncService` or `CsvExportSyncService`. Two additional callers (`DashboardController#resync` and `AuthCallbackService`) bypass the routing entirely and call `CsvExportSyncJob` directly. This scatters the decision logic across 4 files. Adding a third sync source would require changes in N places instead of one. The two sync pipelines also duplicate upsert logic (`ListingReconciler` vs inline `CsvExportSyncService#import_listings`) with slightly different `UPDATE_FIELDS` constants and material-change detection.

---

## Requirements

- R1. Each strategy implements `call` returning `SyncResult(listings, complete?)` (see origin: R1, R2, R3)
- R2. `Store#sync_strategy` returns the appropriate strategy — the only place that selects which sync mechanism runs (see origin: R4)
- R3. `FullStoreSyncJob` is the only sync job entry point — no routing logic, no `oauth_authorized?` checks (see origin: R5)
- R4. `CsvExportSyncJob` is removed; `AuthCallbackService` and `DashboardController#resync` use `FullStoreSyncJob` (see origin: R6, R7)
- R5. Adding a new sync source requires exactly two changes: a new strategy class and one addition to `Store#sync_strategy` (see origin: R8)

**Origin actors:** A1 (Store), A2 (Sync strategy), A3 (FullStoreSyncJob), A4 (SyncAllStoresJob), A5 (StoreOnboarding), A6 (AuthCallbackService), A7 (DashboardController)
**Origin flows:** F1 (public API sync), F2 (CSV export sync), F3 (adding a new sync source)
**Origin acceptance examples:** AE1 (public API sync), AE2 (CSV export sync), AE3 (no routing outside Store#sync_strategy), AE4 (callers use FullStoreSyncJob), AE5 (error still marks failed)

---

## Scope Boundaries

- No change to the `Store` model's schema or attributes (`sync_source` enum, `store_owner` relationship, sync_status tracking, catalog_coverage).
- No change to the frontend — `oauth_authorized` props and storefront rendering are unaffected.
- No change to enrichment, curation, listing model, or any downstream consumer of synced listing data.
- No change to `SyncAllStoresJob` or the recurring schedule in `config/recurring.yml`.
- No change to the Discogs rate-limit middleware or Faraday connection configuration.
- No change to how stores are created (`StoreOnboarding`, `AuthCallbackService` create logic stays).

### Deferred to Follow-Up Work

- Unifying the two `UPDATE_FIELDS` constants (`ListingReconciler` vs `CsvExportSyncService#import_listings`) into a single source of truth — tracked as a separate cleanup after the strategy extraction is stable.
- The `StoreSync::ListingReconciler` currently takes raw API listings + a `Normalizer`. In the new world, strategies return pre-normalized data, so the reconciler's interface may change or a simpler upsert path may replace it entirely for the strategy path. Implementation determines the cleanest approach.

---

## Context & Research

### Relevant Code and Patterns

- **Strategy pattern conventions:** `app/services/crate_strategies/` and `app/services/score_strategies/` — both use a module namespace with one class per strategy, a single public method, and constructor dependency injection. The new `sync_strategies/` namespace follows this.
- **`Data.define` result objects:** Used everywhere — `StoreSyncService::Result`, `CsvExportSyncService::Result`, `InventoryFetcher::Result`, `ListingReconciler::Result`. The `SyncResult` value object follows this convention.
- **Existing services being extracted:**
  - `app/services/store_sync_service.rb` — `#sync` method (fetch desc + asc, reconcile, classify coverage). The fetch+normalize part becomes `SyncStrategies::PublicApi`.
  - `app/services/csv_export_sync_service.rb` — `#call` method (request export, poll, download, parse, filter, upsert). The fetch+parse+filter part becomes `SyncStrategies::CsvExport`.
- **Existing downstream sub-services (unchanged):**
  - `app/services/store_sync/inventory_fetcher.rb` — paginated API crawl (used by PublicApi strategy)
  - `app/services/store_sync/listing_normalizer.rb` — raw JSON → normalized hash (used by PublicApi strategy)
  - `app/services/store_sync/listing_reconciler.rb` — upsert + material-change detection (used by job after strategy returns)
  - `app/services/store_sync/coverage_classifier.rb` — coverage classification (used by job after sync completes)
  - `app/services/store_sync/status_manager.rb` — sync status transitions (used by job)
  - `app/services/csv_export_sync/export_requester.rb` — trigger → poll → download CSV (used by CsvExport strategy)
  - `app/services/csv_export_sync/csv_parser.rb` — CSV → normalized records (used by CsvExport strategy)
  - `app/services/csv_export_sync/record_filter.rb` — vinyl/sold/has-id filter (used by CsvExport strategy)

### Institutional Learnings

- **`docs/solutions/architecture-patterns/crate-strategies-pattern-2026-05-07.md`** — The definitive reference for how strategy patterns work in this codebase. Strategies select/differentiate; a shared engine consumes their output. Concurrency and cross-cutting concerns live at the orchestration layer, not in strategies. (see origin sources)
- **`docs/solutions/integration-issues/discogs-rate-limit-middleware-2026-05-19.md`** — The shared concurrency key on `FullStoreSyncJob` (`"discogs_api"`) is intentional. Both sync strategies run through the same job, so they automatically participate in the same concurrency limit. Faraday middleware handles API pacing — strategies should not re-implement sleep/retry.
- **`docs/solutions/integration-issues/discogs-oauth-csv-export-2026-05-22.md`** — Documents the full CSV export pipeline (trigger → poll → download, column mappings, error handling). The CsvExport strategy encapsulates this pipeline.

---

## Key Technical Decisions

- **`sync_strategies/` namespace under `app/services/`**: Follows the existing `crate_strategies/` and `score_strategies/` module conventions. Each strategy file is one class implementing `call`.
- **Strategies are pure fetcher/parsers**: They fetch from Discogs and normalize into listing hashes. They do not manage sync status, upsert into the database, or enqueue downstream jobs. Those responsibilities stay in `FullStoreSyncJob`.
- **Strategy selection via `Store#sync_strategy`**: A single method on the model. No other code checks `oauth_authorized?` or `sync_source` to decide which sync mechanism runs.
- **Coverage classification behavior**: For CSV export (`complete?: true`), coverage is always `near_complete`. For public API (`complete?: false`), coverage is set to `unknown` — the job uses a simplified path rather than running `CoverageClassifier` with fetcher-specific page metadata.
- **Concurrency on `FullStoreSyncJob`**: The existing `limits_concurrency to: 1, key: ->(*) { "discogs_api" }` covers both strategy paths. The per-store CSV export concurrency key from `CsvExportSyncJob` is intentionally dropped — the shared key is conservative and safe.

---

## Implementation Units

### U1. Create `SyncResult` value object

**Goal:** Define the common return type shared by all sync strategies.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Create: `app/services/sync_strategies/result.rb`
- Test: `spec/services/sync_strategies/result_spec.rb`

**Approach:**
- `Data.define(:listings, :complete?)` with a shared namespace under `SyncStrategies::Result`.
- `listings` is an array of normalized listing hashes (identical format to what `ListingNormalizer` produces and what `CsvExportSync::CsvParser` produces).
- `complete?` is a boolean — `true` means the result represents the full inventory snapshot (caller may remove listings not present).

**Patterns to follow:**
- `StoreSyncService::Result = Data.define(:listing_ids_for_enrichment, :catalog_coverage, :inventory_page_count)` — existing `Data.define` convention.
- `CrateStrategies` module namespace pattern.

**Test scenarios:**
- Happy path: Creating a `SyncStrategies::Result` with listings array and complete flag succeeds.
- Happy path: Creating a result with empty listings works (empty sync).
- Edge case: `complete?` defaults to false when not a keyword (Data.define requires it, so this is a compile-time test).

**Verification:**
- `SyncStrategies::Result` is a `Data` class.
- Instances respond to `.listings` and `.complete?`.
- All strategy specs can import and return this result type.

---

### U2. Create `SyncStrategies::PublicApi` strategy

**Goal:** Extract the fetch-and-normalize path from `StoreSyncService#sync` into a standalone strategy. Returns `SyncResult(listings, complete?: false)`.

**Requirements:** R1, R5

**Dependencies:** U1

**Files:**
- Create: `app/services/sync_strategies/public_api.rb`
- Test: `spec/services/sync_strategies/public_api_spec.rb`

**Approach:**
- Constructor accepts `client:` (defaults to `DiscogsClient.new`) and `normalizer:` (defaults to `StoreSync::ListingNormalizer.new`). Follows the existing dependency injection pattern.
- `call(store, max_pages: nil)` performs both desc and asc fetches via `InventoryFetcher`, normalizes each listing, and returns `SyncResult(listings: all_listings, complete?: false)`.
- The strategy does NOT run coverage classification, reconciliation, upsert, or status management — those belong in the job (U5).
- Reuses `StoreSync::InventoryFetcher` and `StoreSync::ListingNormalizer` without modification.

**Patterns to follow:**
- `CrateStrategies::Picks#initialize` — constructor kwargs with defaults.
- `StoreSync::InventoryFetcher#fetch` — paginated crawl returning raw listings.

**Test scenarios:**
- Happy path: Given a store and a mocked client returning listings, `call` returns all listings normalized via `ListingNormalizer`.
- Happy path: `complete?` is always `false`.
- Edge case: Empty inventory (no listings on Discogs) returns `complete?: false` with empty listings.
- Edge case: 100-page pagination limit hit — strategy still returns whatever was fetched.
- Error path: Rate limit hit — error propagates (no recovery in the strategy).
- Error path: API error — error propagates.

**Verification:**
- `SyncStrategies::PublicApi.new.call(store)` returns a `SyncStrategies::Result`.
- The returned listings match the normalized output of `ListingNormalizer`.
- No DB writes occur during strategy execution (confirm with DB query count or transaction check).

---

### U3. Create `SyncStrategies::CsvExport` strategy

**Goal:** Extract the fetch-parse-filter path from `CsvExportSyncService#call` into a standalone strategy. Returns `SyncResult(listings, complete?: true)`.

**Requirements:** R1, R5

**Dependencies:** U1

**Files:**
- Create: `app/services/sync_strategies/csv_export.rb`
- Test: `spec/services/sync_strategies/csv_export_spec.rb`

**Approach:**
- Constructor accepts `client:` (defaults to `DiscogsClient.new(access_token:, access_token_secret:)` — the client must be OAuth-signed).
- `call(store)` delegates to:
  1. `CsvExportSync::ExportRequester.new(client:).call` → triggers export, polls, downloads CSV
  2. `CsvExportSync::CsvParser.new.call(csv_body, store_id: store.id)` → parses into records
  3. `CsvExportSync::RecordFilter.call(records)` → filters vinyl/available/with-id
  4. Returns `SyncResult(listings: filtered_records, complete?: true)`
- Builds the OAuth-signed client from `store.store_owner` — raises if no owner.
- The strategy does NOT upsert, manage status, or enqueue jobs — those belong in U5.

**Patterns to follow:**
- The existing pipeline in `CsvExportSyncService#call` — same sub-services, just without the upsert and status management.
- `DiscogsClient.new(access_token:, access_token_secret:)` — existing auth pattern.

**Test scenarios:**
- Integration: Full pipeline with mocked export requester + CSV parser + filter returns correct listings and `complete?: true`.
- Edge case: Store has no `store_owner` (not OAuth authorized) — raises appropriate error.
- Edge case: CSV export fails (Discogs 409 conflict) — error propagates.
- Edge case: CSV export times out (no response within polling window) — error propagates.
- Edge case: Empty CSV (all records filtered out by `RecordFilter`) returns empty listings with `complete?: true`.
- Error path: Discogs API returns error during poll — error propagates.

**Verification:**
- `SyncStrategies::CsvExport.new.call(store)` returns a `SyncStrategies::Result`.
- `complete?` is always `true`.
- No DB writes occur during strategy execution.

---

### U4. Add `Store#sync_strategy` method

**Goal:** The single place where sync mechanism selection lives. No other code checks `oauth_authorized?` or `sync_source` to decide which sync mechanism runs.

**Requirements:** R2, R5

**Dependencies:** U2, U3

**Files:**
- Modify: `app/models/store.rb`
- Test: `spec/models/store_spec.rb`

**Approach:**
- Add a `sync_strategy` method:
  ```ruby
  def sync_strategy
    if oauth_authorized?
      SyncStrategies::CsvExport.new
    else
      SyncStrategies::PublicApi.new
    end
  end
  ```
- The method returns a new strategy instance each call (strategies are stateless fetchers — caching the instance is not needed).
- When a third sync source is added, this method gets one additional branch. No job, controller, or service changes.

**Patterns to follow:**
- The existing `oauth_authorized?` method on Store already exists — this is the only code that calls it for sync routing.
- The strategy instances are lightweight (no DB, no heavy initialization).

**Test scenarios:**
- Happy path: Store with `store_owner` and OAuth tokens returns `SyncStrategies::CsvExport`.
- Happy path: Store without `store_owner` returns `SyncStrategies::PublicApi`.
- Happy path: Both returned strategies respond to `call` and return `SyncStrategies::Result`.

**Verification:**
- `store.sync_strategy` always returns an object responding to `call(store)`.
- No other caller in the codebase directly checks `oauth_authorized?` or `sync_source` to select a sync mechanism (this is a codebase-wide search — see U5 and U6 for the callers being cleaned up).

---

### U5. Refactor `FullStoreSyncJob` to universal sync entry point

**Goal:** `FullStoreSyncJob` calls `store.sync_strategy.call`, handles upsert, reconciliation, status management, and downstream job enqueuing. No routing logic, no `oauth_authorized?` checks.

**Requirements:** R3, R5

**Dependencies:** U4

**Files:**
- Modify: `app/jobs/full_store_sync_job.rb`
- Modify: `spec/jobs/full_store_sync_job_spec.rb`
- Create/modify: `app/services/store_sync/listing_importer.rb` (optional — see approach)

**Approach:**
- The job's `perform` becomes:
  1. Find store, call `store.sync_strategy.call` → gets `SyncResult`
  2. Update `sync_status` to "syncing"
  3. **Upsert listings**: Use a shared path to upsert the normalized listings. Two options (implementation decides):
     - **Option A**: Use existing `StoreSync::ListingReconciler` by adapting it to accept pre-normalized data (modify its interface or create a thin adapter).
     - **Option B**: Inline the upsert logic in the job (simple `upsert_all` with material-change detection for enrichment).
  4. **Reconciliation**: If `complete?` is true, remove any existing listings whose IDs are not in the result set.
  5. Mark sync status success via `StoreSync::StatusManager`.
  6. Enqueue `EnrichmentJob` and `DailyCurationJob`.
  7. On error: mark sync status failed via `StoreSync::StatusManager`, re-raise.
- The job's concurrency key stays `"discogs_api"` — it covers both strategy paths.

**Patterns to follow:**
- Existing `FullStoreSyncJob` structure — the error handling (rescue → mark failed → re-raise → log in job) stays the same.
- `StoreSync::StatusManager` — used identically to current `StoreSyncService` and `CsvExportSyncService`.

**Test scenarios:**
- Covers AE1: Given a store with `sync_source: public_api`, when `FullStoreSyncJob` runs, it calls `store.sync_strategy`, upserts listings from the `SyncResult(complete?: false)`, skips full reconciliation, and marks sync success.
- Covers AE2: Given a store with `sync_source: csv_export` and a `store_owner`, when `FullStoreSyncJob` runs, it calls `store.sync_strategy`, upserts listings from the `SyncResult(complete?: true)`, removes listings not in the result, and marks sync success.
- Covers AE3: The job never calls `oauth_authorized?` or inspects `sync_source` — it only calls `store.sync_strategy.call`.
- Covers AE5: When the strategy raises an error, the job marks sync status as failed and re-raises.
- Edge case: Strategy returns empty listings — job marks sync success with 0 listings, no enrichment queued.
- Edge case: Full reconciliation (`complete?: true`) removes stale listings correctly.
- Error path: EnrichmentJob enqueue failure is non-fatal (wrapped in `rescue`).
- Integration: `SyncAllStoresJob` → `FullStoreSyncJob` still works for both strategy paths.

**Verification:**
- `FullStoreSyncJob` contains no `if oauth_authorized?` or `sync_source` references.
- Both public API and CSV export stores can sync to completion through this single job.
- All existing sync behavior (listing upsert, enrichment, curation) continues identically.

---

### U6. Replace `CsvExportSyncJob` callers and delete the job

**Goal:** `CsvExportSyncJob` is no longer called. `AuthCallbackService` and `DashboardController#resync` queue `FullStoreSyncJob` instead.

**Requirements:** R4

**Dependencies:** U5

**Files:**
- Delete: `app/jobs/csv_export_sync_job.rb`
- Delete: `spec/jobs/csv_export_sync_job_spec.rb`
- Modify: `app/services/auth_callback_service.rb`
- Modify: `app/controllers/dashboard_controller.rb`
- Modify: `spec/services/auth_callback_service_spec.rb` or related spec
- Modify: `spec/requests/dashboard_spec.rb` or `spec/controllers/dashboard_controller_spec.rb`

**Approach:**
- `AuthCallbackService`: Change `CsvExportSyncJob.perform_later(store.id)` to `FullStoreSyncJob.perform_later(store.id)`.
- `DashboardController#resync`: Change `CsvExportSyncJob.perform_later(current_store.id)` to `FullStoreSyncJob.perform_later(current_store.id)`.
- Delete `CsvExportSyncJob` entirely. Its logic lives in `SyncStrategies::CsvExport` + `FullStoreSyncJob`.
- Delete `CsvExportSyncJob` spec.

**Patterns to follow:**
- `FullStoreSyncJob.perform_later(store.id)` is already the pattern used by `StoreOnboarding` and `SyncAllStoresJob`.

**Test scenarios:**
- Covers AE4: `AuthCallbackService` queues `FullStoreSyncJob` (not `CsvExportSyncJob`).
- Covers AE4: `DashboardController#resync` queues `FullStoreSyncJob` (not `CsvExportSyncJob`).
- The callers otherwise behave identically — same arguments, same enqueue timing, same error handling.

**Verification:**
- Codebase-wide search for `CsvExportSyncJob` returns zero results.
- `AuthCallbackService` and `DashboardController#resync` trigger sync that works for both strategy paths (depending on store state).

---

### U7. Clean up obsolete services

**Goal:** Remove the old orchestrator services whose logic has been extracted into strategies.

**Requirements:** R1, R3

**Dependencies:** U5

**Files:**
- Modify: `app/services/store_sync_service.rb` — either delete or reduce to a dev-console helper
- Modify: `app/services/csv_export_sync_service.rb` — delete
- Modify: `spec/services/store_sync_service_spec.rb`
- Delete: (no spec exists for `CsvExportSyncService`)

**Approach:**
- `CsvExportSyncService`: Delete the file. Its `call` method's fetch+parse+filter is in `SyncStrategies::CsvExport`, and its upsert+status logic is in `FullStoreSyncJob`.
- `StoreSyncService`: Two sub-options (implementation decides):
  - **Option A**: Keep the `#full_sync` method for dev-console usage (it's a simpler sync without coverage classification). Rename it to make clear it's a dev helper, or keep `StoreSyncService` as a thin wrapper around `SyncStrategies::PublicApi`.
  - **Option B**: Delete and update dev scripts to use `SyncStrategies::PublicApi.new.call(store)` directly.
- The sub-services (`InventoryFetcher`, `ListingNormalizer`, `ListingReconciler`, `CoverageClassifier`, `StatusManager`) stay — they're used by the strategy or the job.

**Test scenarios:**
- Existing specs for `StoreSyncService` either adapt to use the new strategy or are removed if the service is deleted.
- No behavioral regression: sync still works identically end-to-end.

**Verification:**
- `CsvExportSyncService` is gone.
- `StoreSyncService` is either gone or reduced to a dev-only helper.
- All specs pass.

---

## System-Wide Impact

- **Interaction graph:** `FullStoreSyncJob` is called from `SyncAllStoresJob`, `StoreOnboarding`, `AuthCallbackService`, and `DashboardController#resync`. After this refactor, all four callers use the same job, which delegates to the strategy. No structural change to the call graph beyond removing `CsvExportSyncJob`.
- **Error propagation:** Both strategies raise on API errors. `FullStoreSyncJob`'s existing `rescue` block logs and marks failed. Error behavior is unchanged.
- **State lifecycle risks:** During the transition from public API to CSV export (OAuth), the store's `sync_source` changes to `csv_export`. The next `FullStoreSyncJob` run selects the CSV strategy. If the previous public API sync left stale listings behind, the `complete?: true` reconciliation in the CSV path cleans them up. No partial-write risk.
- **API surface parity:** No external API changes. No frontend changes. No config changes.
- **Integration coverage:** The OAuth callback flow (`AuthCallbackService` → `FullStoreSyncJob` → `SyncStrategies::CsvExport`) needs integration-level coverage — a request spec that walks through the OAuth flow and verifies the store syncs.
- **Unchanged invariants:** `SyncAllStoresJob` recurring schedule, `StoreOnboarding` store creation, `DiscogsClient` auth and middleware, `Store` schema, `Listing` model, enrichment and curation jobs.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Upsert/reconciliation logic is duplicated between `ListingReconciler` and `CsvExportSyncService#import_listings` — cleanup may be more work than expected | Deferred to follow-up work. The initial extraction keeps the existing reconciler for the public API path and uses a simplified upsert for the CSV path in the job. Full unification can happen separately. |
| Coverage classification loss for public API stores | Explicit decision in Key Technical Decisions — public API stores use `unknown` coverage instead of running `CoverageClassifier` with fetcher-specific metadata. No behavioral degradation for storefront or curation, since coverage is informational. |
| Dropping the per-store concurrency key from `CsvExportSyncJob` | The shared `"discogs_api"` key is conservative. CSV exports for different stores could theoretically run in parallel (they use different OAuth tokens), but the shared key prevents accidental hammering. Acceptable until contention becomes measurable. |
| `CsvExportSyncJob` spec is deleted — coverage regression | The strategy spec (U3) and job spec (U5) cover the same behavioral surface. The integration spec (`spec/integration/csv_export_sync_integration_spec.rb`) remains and adapts. |

---

## Documentation / Operational Notes

- The `config/recurring.yml` entry for `full_store_sync` needs no changes — it calls `SyncAllStoresJob`, which already calls `FullStoreSyncJob`.
- Dev sync workflow: devs using `StoreSyncService#full_sync` from the console can switch to `SyncStrategies::PublicApi.new.call(store)` after the cleanup in U7. Document the migration in the dev README or console helpers.
- Monitor sync completion times after deploy — CSV export stores may take longer due to the polling-based export, but this is unchanged from current behavior (they already use the slow path).

---

## Sources & References

- **Origin document:** `docs/brainstorms/2026-05-22-store-sync-strategies-requirements.md`
- **Strategy pattern convention:** `app/services/crate_strategies/picks.rb` and `app/services/score_strategies/price_strategy.rb`
- **Rate-limit learnings:** `docs/solutions/integration-issues/discogs-rate-limit-middleware-2026-05-19.md`
- **OAuth CSV export pipeline:** `docs/solutions/integration-issues/discogs-oauth-csv-export-2026-05-22.md`
