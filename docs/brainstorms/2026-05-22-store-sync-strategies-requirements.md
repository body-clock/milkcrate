---
date: 2026-05-22
topic: store-sync-strategies
---

# Store Sync Strategies

## Summary

Extract the two existing Discogs sync mechanisms (public API pagination and OAuth CSV export) into interchangeable strategy objects selected by the Store itself. This eliminates scattered `if oauth_authorized?` routing, makes `CsvExportSyncJob` unnecessary, and enables adding new sync sources without changing the callers.

---

## Problem Frame

A Store has a `sync_source` enum (`public_api` or `csv_export`) that already captures which mechanism populates its inventory. But the routing logic lives outside the model — `FullStoreSyncJob` checks `store.oauth_authorized?` and dispatches to either `StoreSyncService` or `CsvExportSyncService`. Two additional callers (`DashboardController#resync` and `AuthCallbackService`) bypass the routing entirely and call `CsvExportSyncJob` directly.

This means:
- Adding a third sync source requires changes in N places, not one
- Callers must know which sync mechanism a store uses
- `CsvExportSyncService` redundantly guards: "are you really OAuth authorized?" even though the caller already decided that
- The concurrency/lifecycle management is split across two job classes that do nearly the same wrapper work

Milkcrate needs to be able to create stores for on-demand demos (public API sync, no owner, no dashboard) and later transition them to fully claimed stores (CSV export sync, owner, dashboard access). The sync mechanism is a property of the store's current state, not a separate concept to be managed externally.

---

## Actors

- A1. Store: Owns its sync mechanism selection. Provides `sync_strategy` based on current state (public API or CSV export).
- A2. Sync strategy: A self-contained class that fetches inventory from Discogs and returns normalized listing data. Each strategy conforms to the same interface.
- A3. FullStoreSyncJob: The universal sync entry point. Calls the store's strategy, persists data, manages status, and enqueues downstream work.
- A4. SyncAllStoresJob: Periodic sync of all stores. Already calls FullStoreSyncJob — no behavioral change.
- A5. StoreOnboarding: Creates stores via admin flow. Already calls FullStoreSyncJob — no behavioral change.
- A6. AuthCallbackService: Completes OAuth, transitions the store to `csv_export`, queues sync. Currently calls `CsvExportSyncJob` directly — will call `FullStoreSyncJob` instead.
- A7. DashboardController#resync: Vendor-initiated re-sync from the dashboard. Currently calls `CsvExportSyncJob` directly — will call `FullStoreSyncJob` instead.

---

## Key Flows

- F1. **Store syncs via public API (demo/preview state)**
  - **Trigger:** A store is created (via `StoreOnboarding` or `AuthCallbackService`) with no OAuth.
  - **Actors:** A1, A2, A3, A4
  - **Steps:**
    1. `FullStoreSyncJob` is queued for the store.
    2. The job calls `store.sync_strategy`, which returns `PublicApiSyncStrategy`.
    3. The job calls `strategy.call`, which paginates the public Discogs inventory API and returns normalized listing hashes with `complete?: false`.
    4. The job upserts the listings and manages sync status. Because `complete?` is false, it skips full reconciliation.
    5. The job enqueues enrichment and daily curation.
  - **Outcome:** Storefront renders with public-API-quality inventory.
  - **Covered by:** R1, R2, R3, R4, R5

- F2. **Store syncs via CSV export (claimed/OAuth state)**
  - **Trigger:** A store has completed OAuth and transitions to `sync_source: csv_export`.
  - **Actors:** A1, A2, A3, A6, A7
  - **Steps:**
    1. Sync is triggered by `AuthCallbackService` (after OAuth) or `DashboardController#resync` (vendor request).
    2. `FullStoreSyncJob` is queued for the store.
    3. The job calls `store.sync_strategy`, which returns `CsvExportSyncStrategy`.
    4. The job calls `strategy.call`, which requests a CSV export via OAuth and returns normalized listing hashes with `complete?: true`.
    5. The job upserts the listings. Because `complete?` is true, it removes any existing listings not in the result set (full reconciliation).
    6. The job manages sync status and enqueues enrichment and daily curation.
  - **Outcome:** Storefront renders with full-export-quality inventory. Dashboard reflects sync state.
  - **Covered by:** R1, R2, R3, R4, R5, R7

- F3. **Adding a new sync source**
  - **Trigger:** A third sync mechanism is needed (e.g., manual CSV upload, non-Discogs seller import).
  - **Actors:** A1, A2, A3
  - **Steps:**
    1. A new strategy class is created implementing the same `call → SyncResult` interface.
    2. `Store#sync_strategy` is updated to select the new strategy when appropriate.
    3. No callers change — `FullStoreSyncJob`, `DashboardController`, `AuthCallbackService` all call the same path.
  - **Outcome:** New sync source works with zero changes to sync job, controllers, or services.
  - **Covered by:** R1, R2, R8

---

## Requirements

**Strategy interface**
- R1. Each strategy implements a single public method `call` that returns a `SyncResult`.
- R2. `SyncResult` is a value object with two fields:
  - `listings`: an array of normalized listing hashes, ready for upsert into the Listings table.
  - `complete?`: a boolean. `true` when the result represents the full inventory snapshot (caller may remove listings not present). `false` when the result may be partial (caller skips full reconciliation).
- R3. A strategy is responsible only for fetching from Discogs and normalizing into the standard listing hash format. It does not interact with the database, manage sync status, or enqueue downstream jobs.

**Store as strategy selector**
- R4. `Store#sync_strategy` returns the appropriate strategy instance based on the store's current state. Only this method contains the selection logic (no other caller checks `oauth_authorized?` or `sync_source` to decide which sync mechanism to use).

**Universal sync job**
- R5. `FullStoreSyncJob` is the only sync job entry point. It:
  - Fetches the store and calls `store.sync_strategy.call`
  - Upserts the returned listings into the Listings table
  - If `complete?` is true, reconciles by removing listings not in the result set
  - Manages sync status (syncing → success/failure)
  - Enqueues enrichment and daily curation jobs
- R6. `CsvExportSyncJob` is removed. All callers (`AuthCallbackService`, `DashboardController#resync`) use `FullStoreSyncJob` instead.

**Caller changes**
- R7. `AuthCallbackService` and `DashboardController#resync` queue `FullStoreSyncJob` instead of `CsvExportSyncJob`. No other behavioral change.

**Extensibility**
- R8. Adding a new sync source requires:
  - Creating a new strategy class implementing the `call → SyncResult` interface
  - Updating `Store#sync_strategy` to select it
  - No changes to `FullStoreSyncJob`, `DashboardController`, `AuthCallbackService`, or any other caller

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3, R5.** Given a store with `sync_source: public_api` and no `store_owner`, when `FullStoreSyncJob` runs, it receives a `SyncResult` with `complete?: false` from the public API strategy, upserts the listings, and skips full reconciliation. Sync status transitions from syncing to success.
- AE2. **Covers R1, R2, R3, R5.** Given a store with `sync_source: csv_export` and a `store_owner`, when `FullStoreSyncJob` runs, it receives a `SyncResult` with `complete?: true` from the CSV export strategy, upserts the listings, and removes any listings not in the result set. Sync status transitions from syncing to success.
- AE3. **Covers R4, R8.** Given a store, when any code calls `store.sync_strategy`, the returned strategy matches the store's sync state. No caller outside `Store#sync_strategy` inspects `oauth_authorized?` or `sync_source` to select a sync mechanism.
- AE4. **Covers R6, R7.** Given `AuthCallbackService` completes OAuth for a store, it queues `FullStoreSyncJob` (not `CsvExportSyncJob`). Given a vendor clicks "Re-sync" in the dashboard, it queues `FullStoreSyncJob` (not `CsvExportSyncJob`).
- AE5. **Covers R5.** Given a store where a sync errors, `FullStoreSyncJob` manages sync status (mark failed) regardless of which strategy was used.

---

## Success Criteria

- `FullStoreSyncJob` contains zero references to `oauth_authorized?` or `sync_source` — it delegates to the strategy.
- The only place that selects which sync mechanism runs is `Store#sync_strategy`.
- `CsvExportSyncJob` no longer exists. `AuthCallbackService` and `DashboardController#resync` call `FullStoreSyncJob`.
- Adding a new sync source requires exactly two changes: a new strategy class and one addition to `Store#sync_strategy`.
- All existing sync behavior (public API pagination, CSV export, enrichment, curation) continues to work identically.

---

## Scope Boundaries

- No change to the `Store` model's schema or attributes (`sync_source` enum, `store_owner` relationship).
- No change to how stores are created (`StoreOnboarding`, `AuthCallbackService` create logic stays).
- No change to the frontend — `oauth_authorized` props, storefront rendering, invitation page are unaffected.
- No change to enrichment, curation, listing model, or any downstream consumer.
- No change to concurrency or queue configuration (existing `limits_concurrency` keys on `FullStoreSyncJob` remain).
- `SyncAllStoresJob` is not modified (it already calls `FullStoreSyncJob`).

---

## Key Decisions

- Strategy pattern over inheritance: Behavior varies by sync mechanism, not by Store type. A single Store transitions between sync strategies over its lifecycle. Composition (strategy injected by `Store#sync_strategy`) is cleaner than STI or parallel models.
- Pure fetcher/parser strategy: The strategy only fetches from Discogs and normalizes. The job owns state management, upserts, and reconciliation. This keeps strategies thin and testable without database mocking.
- `complete?` flag: The strategy signals whether its result is a complete snapshot. This lets the job decide whether to reconcile without knowing which strategy ran — avoids re-introducing the conditional it eliminated.
- One universal sync job: `FullStoreSyncJob` is the single entry point. `CsvExportSyncJob` is deleted. The per-store concurrency key for CSV export is replaced by the job's existing shared concurrency key.

---

## Dependencies / Assumptions

- The existing `FullStoreSyncJob` concurrency key (`"discogs_api"`) is sufficient for both public API and CSV export syncs. CSV export is per-user OAuth and could theoretically run in parallel, but the shared key avoids rate-limit issues and is conservative. Can be optimized later if needed.
- The existing listing hash format produced by `StoreSync::ListingNormalizer` (public API path) and `CsvExportSync::CsvParser` (CSV export path) produce sufficiently compatible output to be returned through a shared `SyncResult` interface. Minor field normalization differences are resolved during planning.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R1, R2][Technical] Determine the exact listing hash contract — should both strategies produce byte-identical hashes, or is a shared subset sufficient with strategy-specific extras ignored by the job?
- [Affects R1][Technical] Decide the directory layout (`app/strategies/` vs namespaced under existing modules like `StoreSync::PublicApiStrategy`).
- [Affects R5][Technical] Handle concurrency key for the universal job — `"discogs_api"` covers both paths, but CSV export is per-user and could theoretically run alongside public API. Accept the conservative key for now.
- [Affects R5, R6][Technical] Handle `CsvExportSyncJob`'s concurrency key: currently `"csv_export:#{store_id}"`. When deleted, this concurrency guarantee goes away. Decide whether `FullStoreSyncJob`'s shared key is sufficient, or whether the universal job should support per-strategy concurrency keys.
