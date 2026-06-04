---
title: "feat: Poll OAuth Discogs Sales to Keep Storefront Inventory Fresh"
type: feat
status: active
date: 2026-06-04
---

# feat: Poll OAuth Discogs Sales to Keep Storefront Inventory Fresh

## Summary

Add an OAuth-only sales polling path that checks recent Discogs orders for authorized stores, removes sold listing IDs from Milkcrate inventory, and invalidates storefront curation cache immediately. The goal is buyer trust: if a record sold on Discogs, Milkcrate should stop showing it quickly instead of waiting for the nightly full sync.

The plan intentionally avoids full recuration every minute. Removing sold records plus changing the cache key is enough for correctness; curation can rebuild lazily on next storefront request and optionally prewarm after removals.

---

## Problem Frame

Milkcrate promises premium/OAuth stores that their storefront will not drift far from real Discogs inventory. Current sync mechanisms are too coarse for sold-item correctness:

- OAuth CSV export sync is complete, but scheduled nightly.
- Public API sync cannot reliably detect sold items for large stores and may be partial.
- Storefront curation cache currently lives for 36 hours and its key does not include inventory mutation state.

If a buyer sees a sold record on Milkcrate, clicks through, and cannot buy it, the store takes the reputational hit. OAuth unlocks the Discogs marketplace order surface, so Milkcrate can react to sales as operational events rather than waiting for full inventory reconciliation.

---

## Requirements

- R1. OAuth-authorized stores are polled for recent Discogs marketplace orders on a minute-level schedule when due.
- R2. Polling uses seller-level OAuth credentials already stored on `StoreOwner`.
- R3. Sold listing IDs found in order payloads are removed from local `listings`.
- R4. Removal is idempotent. Reprocessing the same order does not double-count or error.
- R5. Storefront curation cache changes immediately after listings are removed, so cached payloads cannot continue exposing sold records.
- R6. The polling system respects Discogs API rate limits and does not create one external request per store per minute when fleet size grows.
- R7. Poll state and errors are tracked separately from full inventory sync state.
- R8. No buyer PII is persisted. Store only order IDs, status/activity timestamps, listing IDs, and operational counts.
- R9. Full sync remains source of truth for relists, cancellations, and inventory corrections.
- R10. Existing nightly `FullStoreSyncJob` and daily `DailyCurationJob` behavior remains intact.

---

## Scope Boundaries

In scope:

- OAuth store sales polling through Discogs marketplace orders.
- Removing sold listing IDs from Milkcrate local inventory.
- Cache invalidation/versioning for storefront curation.
- Polling observability on store records and order-event records.
- Tests for polling, removal, cache invalidation, and scheduler fan-out.

Out of scope:

- Non-OAuth premium inventory guarantees. Public inventory cannot observe seller orders; create a follow-up issue for the best non-OAuth promise, likely more frequent public sync plus stricter availability copy.
- Pushing changes back to Discogs.
- Buyer-facing order data, buyer identity, addresses, payment state, or order management UI.
- Automatic restoration when an order is cancelled. Nightly/full sync can re-add records if Discogs marks them available again.
- Recurating the whole storefront synchronously inside every poll job.

---

## Context & Research

### Existing Code

- `app/services/discogs/marketplace.rb` already owns OAuth marketplace endpoints and has `list_orders(status: nil, page: 1)`.
- `app/services/discogs_client.rb` delegates OAuth-only methods to `Discogs::Marketplace`.
- `app/models/store.rb` delegates OAuth token fields through `store_owner` and selects `SyncStrategies::CsvExport` when authorized.
- `app/jobs/full_store_sync_job.rb` performs complete inventory sync and enqueues enrichment/curation.
- `app/jobs/sync_all_stores_job.rb` already fans out recurring full sync work with staggered delays.
- `app/services/storefront_curation/cache_manager.rb` caches fully serialized curation payloads for 36 hours with key `storefront/curation/v3/<store>/<date>/<scope>/<wall_count>`.
- `app/presenters/crate_presenter.rb` serializes `discogs_listing_id` and Discogs listing URLs, so stale cache is a correctness problem.

### Existing Learnings

- `docs/solutions/integration-issues/discogs-oauth-csv-export-2026-05-22.md` documents that seller-level OAuth is required for marketplace orders and that List Orders is intended for sold-listing detection.
- `docs/solutions/integration-issues/discogs-rate-limit-middleware-2026-05-19.md` documents why all Discogs consumers must share rate-limit discipline and concurrency constraints.

### External References

- Discogs inventory management docs list statuses including Sold and describe deletion/relist behavior: `https://support.discogs.com/hc/en-us/articles/360007714754-How-Can-I-Manage-My-Inventory`
- Discogs API terms say API content becomes quickly outdated and public display cannot rely on content older than six hours: `https://support.discogs.com/hc/en-us/articles/360009334593-API-Terms-of-Use`
- Discogs developer docs mirror for `GET /marketplace/orders` shows status, sort, sort_order, pagination, and OAuth requirement: `https://www.postman.com/cdrecordsale/my-workspace/documentation/dy6eozk/discogs?entity=request-32055786-c9d92a01-2f24-4991-b590-6177ec863f4c`
- Solid Queue supports recurring YAML tasks and `limits_concurrency`; this project already uses both.

---

## Key Technical Decisions

- **Use List Orders, not "recent sales" naming.** The app already models Discogs marketplace order access as `list_orders`. If Discogs has no separate recent-sales endpoint, this feature should poll recent orders sorted by `last_activity desc`.
- **Remove first, reconcile later.** When an order references listing IDs, delete matching `Listing` rows immediately. This is conservative for shoppers. Full sync remains the recovery path if a seller relists or an order state later makes inventory available.
- **Version cache, don't chase cache keys.** Add an inventory/cache version to stores and include it in the curation cache key. Increment it inside the same transaction as listing removal.
- **Separate poll health from full sync health.** Sales poll failures should not mark `sync_status: failed`; dashboard/admin can show them separately later.
- **Dispatcher owns scale control.** A recurring job fires every minute, selects due OAuth stores, and enqueues within a request budget. It does not blindly enqueue every OAuth store every minute forever.
- **Persist only operational order facts.** No buyer data. Persist enough to dedupe order processing and audit removals.
- **Keep layers clean.** Jobs orchestrate. `StoreSales::*` services implement application workflow. Models stay mostly persistence/associations. Discogs client stays infrastructure.

---

## Data Model

### Store Poll State

Add fields to `stores`:

- `sales_poll_cursor_at: datetime`
- `last_sales_polled_at: datetime`
- `last_sales_poll_error: text`
- `last_sales_poll_error_at: datetime`
- `inventory_version: integer, default: 0, null: false`

Rationale:

- `sales_poll_cursor_at` is the high-water mark from Discogs order `last_activity` or `created` timestamps.
- `last_sales_polled_at` tracks worker health even when no orders changed.
- Error fields keep sale polling independent from full sync status.
- `inventory_version` gives cache invalidation without needing to delete unknown cache keys.

### Discogs Order Events

Create `discogs_order_events`:

- `store_id: bigint, null: false`
- `discogs_order_id: string, null: false`
- `status: string`
- `last_activity_at: datetime`
- `listing_ids: string[], default: [], null: false`
- `removed_listing_count: integer, default: 0, null: false`
- `processed_at: datetime, null: false`
- timestamps

Indexes:

- unique `[:store_id, :discogs_order_id]`
- index `[:store_id, :last_activity_at]`

Rationale:

- Idempotency and audit trail.
- No buyer PII.
- Reprocessing can update status/listing IDs if order activity changes.

---

## Implementation Units

### U1. Extend OAuth marketplace order client

**Goal:** Make the existing OAuth marketplace client suitable for polling recent orders.

**Requirements:** R1, R2, R6

**Files:**

- Modify: `app/services/discogs/marketplace.rb`
- Modify: `app/services/discogs_client.rb`
- Test: `spec/services/discogs/marketplace_spec.rb`
- Test: `spec/services/discogs_client_spec.rb`

**Approach:**

- Extend `list_orders` keyword args: `status: nil`, `page: 1`, `per_page: 50`, `sort: "last_activity"`, `sort_order: "desc"`.
- Build query via `URI.encode_www_form` or equivalent structured API, not manual string concatenation.
- Keep response parsing and existing error behavior.
- Add 429/backoff handling for OAuth marketplace calls or extract shared rate-limit behavior that can wrap `OAuth::AccessToken` requests. Current Faraday middleware does not protect this path.
- Add `get_order(order_id)` only if `list_orders` payload lacks item/listing detail during live verification.

**Test scenarios:**

- `list_orders` includes `page`, `per_page`, `sort`, `sort_order`, and optional `status`.
- `list_orders` URL-encodes Discogs status values with spaces.
- 429 response raises/retries according to chosen OAuth rate-limit behavior.
- Non-2xx response raises `Discogs::Errors::ApiError`.
- `DiscogsClient#list_orders` still requires OAuth credentials.

---

### U2. Add sales polling persistence

**Goal:** Store poll cursor, inventory version, and idempotent order event records.

**Requirements:** R4, R5, R7, R8

**Files:**

- Create: `db/migrate/20260604000000_add_sales_polling_to_stores.rb`
- Create: `db/migrate/20260604000001_create_discogs_order_events.rb`
- Create: `app/models/discogs_order_event.rb`
- Modify: `app/models/store.rb`
- Test: `spec/models/discogs_order_event_spec.rb`
- Test: `spec/models/store_spec.rb`

**Approach:**

- Add store poll/error/version fields.
- Create `DiscogsOrderEvent` model with `belongs_to :store`.
- Validate `discogs_order_id` presence and uniqueness scoped to store.
- Add a small store method only if needed for version bump, e.g. `increment_inventory_version!`.

**Test scenarios:**

- Order event requires store and Discogs order ID.
- Duplicate order ID for same store is rejected.
- Same order ID for different stores is allowed.
- New stores default `inventory_version` to 0.

---

### U3. Build order parsing and sold-listing removal services

**Goal:** Extract listing IDs from order payloads and remove matching local listings idempotently.

**Requirements:** R3, R4, R5, R8, R9

**Files:**

- Create: `app/services/store_sales/order_listing_ids.rb`
- Create: `app/services/store_sales/sold_listing_remover.rb`
- Test: `spec/services/store_sales/order_listing_ids_spec.rb`
- Test: `spec/services/store_sales/sold_listing_remover_spec.rb`

**Approach:**

- `OrderListingIds.call(order_hash)` returns normalized string listing IDs from known Discogs order item shapes.
- Start with defensive extraction from likely keys: `items`, `listing_id`, `id`, nested listing hashes. Keep parser explicit and tested.
- `SoldListingRemover.new(store).call(listing_ids)` deletes matching store listings in a transaction.
- If delete count is positive, update `stores.total_listings` and increment `inventory_version`.
- Return result object with `removed_count` and `removed_listing_ids`.

**Test scenarios:**

- Extracts single listing ID from common item payload shape.
- Extracts multiple listing IDs from multi-item order.
- Ignores blank/nil IDs.
- Removes only listings belonging to the target store.
- Unknown IDs are no-op.
- Deleting one or more listings increments `inventory_version`.
- No matching listing does not increment `inventory_version`.
- `total_listings` is updated after removal.

---

### U4. Build store sales order poller

**Goal:** Poll one store's recent orders, dedupe events, remove sold listings, and advance cursor.

**Requirements:** R1, R2, R3, R4, R7, R8, R9

**Files:**

- Create: `app/services/store_sales/order_poller.rb`
- Test: `spec/services/store_sales/order_poller_spec.rb`

**Approach:**

- Build OAuth `DiscogsClient` from `store.store_owner`.
- Request orders sorted by `last_activity desc`.
- Use a safety overlap window, e.g. start from `sales_poll_cursor_at - 10.minutes`, because remote timestamps and retries can drift.
- Process newest-to-oldest or oldest-to-newest consistently; advance cursor to max seen activity only after successful processing.
- Upsert `DiscogsOrderEvent` by `store_id` and `discogs_order_id`.
- For each order, extract listing IDs and call `SoldListingRemover`.
- Mark `last_sales_polled_at` on success.
- On error, set `last_sales_poll_error` and `last_sales_poll_error_at`, then re-raise for job retry/visibility.

**Test scenarios:**

- OAuth store polls Discogs and removes sold listing IDs.
- Store without OAuth raises a clear not-authorized error.
- Existing processed order does not remove twice.
- Same order with later `last_activity_at` can update event status without double-counting already-deleted listings.
- Cursor advances to max processed `last_activity_at`.
- Cursor does not advance when client raises.
- Error fields are set on failure.
- Empty order list still updates `last_sales_polled_at`.

---

### U5. Add polling jobs and recurring schedule

**Goal:** Run polling continuously without one unbounded external call per store per minute.

**Requirements:** R1, R6, R7, R10

**Files:**

- Create: `app/jobs/sales_poll_dispatcher_job.rb`
- Create: `app/jobs/sales_poll_store_job.rb`
- Modify: `config/recurring.yml`
- Test: `spec/jobs/sales_poll_dispatcher_job_spec.rb`
- Test: `spec/jobs/sales_poll_store_job_spec.rb`

**Approach:**

- Add recurring task:

  ```yaml
  production:
    sales_poll_dispatcher:
      class: SalesPollDispatcherJob
      queue: default
      schedule: every minute
  ```

- `SalesPollDispatcherJob` selects OAuth-authorized stores where `last_sales_polled_at` is nil or older than the target interval.
- Add a conservative per-minute budget, e.g. `MAX_STORES_PER_RUN = 20`, tune later from live rate headers and fleet size.
- Stagger enqueued `SalesPollStoreJob` jobs by a few seconds if more than one store is due.
- `SalesPollStoreJob` runs `StoreSales::OrderPoller`.
- Use `limits_concurrency`:
  - per-store key to avoid duplicate poll for same store
  - global Discogs API key if OAuth marketplace requests share app/user quota enough to require serialization

**Test scenarios:**

- Dispatcher enqueues due OAuth stores only.
- Dispatcher skips non-OAuth stores.
- Dispatcher respects max stores per run.
- Dispatcher staggers jobs when multiple stores due.
- Store job calls `StoreSales::OrderPoller`.
- Store job handles deleted store gracefully or lets `RecordNotFound` fail according to existing job convention.
- Concurrency key lambdas accept job arguments.

---

### U6. Version storefront curation cache by inventory mutation

**Goal:** Ensure sold listings cannot survive in cached storefront payloads.

**Requirements:** R5

**Files:**

- Modify: `app/services/storefront_curation/cache_manager.rb`
- Modify: `spec/services/storefront_curation/cache_manager_spec.rb`
- Add coverage in: `spec/services/store_sales/sold_listing_remover_spec.rb`

**Approach:**

- Add `inventory_version` to `CURATION_CACHE_KEY`, e.g. `storefront/curation/v4/%<store_id>s/%<date>s/%<scope>s/%<wall_count>s/%<inventory_version>s`.
- Use `store.inventory_version` in `curation_cache_key`.
- Bump version only on inventory mutations that affect storefront availability:
  - sold-listing removal
  - full sync stale removal
  - future manual inventory changes
- For this feature, at minimum bump inside `SoldListingRemover`. Consider adding a bump in `StoreSync::InventoryUpdater#remove_stale` in same PR if tests show stale full-sync cache can survive too.

**Test scenarios:**

- Cache key includes inventory version.
- Same store/date/scope with different version produces different keys.
- Removing sold listing changes cache key and cached payload is not reused.
- Cache still separates `available` and `all` scopes.

---

### U7. Optional curation prewarm after removals

**Goal:** Keep first shopper request after a sale from doing all curation work when a poll removes listings.

**Requirements:** R5, R10

**Files:**

- Modify: `app/jobs/sales_poll_store_job.rb` or `app/services/store_sales/order_poller.rb`
- Test: `spec/jobs/sales_poll_store_job_spec.rb` or `spec/services/store_sales/order_poller_spec.rb`

**Approach:**

- If poller removed one or more listings, enqueue `DailyCurationJob.perform_later(store.id)`.
- Do not enqueue when no listings changed.
- If this creates too much churn for active stores, debounce later with a store field like `last_curation_queued_at`.

**Test scenarios:**

- Removal enqueues one curation job.
- No removal enqueues none.
- Multiple orders in same poll enqueue at most one curation job.

---

## End-to-End Flow

1. Solid Queue recurring scheduler runs `SalesPollDispatcherJob` every minute.
2. Dispatcher finds due OAuth stores within budget and enqueues `SalesPollStoreJob`.
3. Store job calls `StoreSales::OrderPoller`.
4. Poller calls `DiscogsClient#list_orders(sort: "last_activity", sort_order: "desc")`.
5. Poller upserts `DiscogsOrderEvent` records and extracts listing IDs.
6. `SoldListingRemover` deletes matching `Listing` rows and increments `Store#inventory_version`.
7. Storefront cache key changes, so next storefront request rebuilds from remaining available listings.
8. Optional `DailyCurationJob` prewarms new payload after removal.
9. Nightly `FullStoreSyncJob` remains authoritative and can re-add relisted records.

---

## Risks & Mitigations

- **Discogs order payload shape may not include listing IDs.** Add `get_order(order_id)` fallback if live payload lacks item details. Keep U1 tests fixture-driven after first live sample.
- **OAuth marketplace requests bypass Faraday middleware.** Add explicit OAuth request retry/backoff before enabling minute polling.
- **Fleet growth can exceed rate budget.** Dispatcher budget plus per-store due intervals prevents unbounded requests. Add adaptive interval later if stores exceed budget.
- **Cancelled orders could remove records that become available again.** This is acceptable for shopper trust; full sync restores relisted inventory.
- **Cache invalidation misses full sync stale deletion.** Add inventory version bump to `StoreSync::InventoryUpdater#remove_stale` if not already covered while implementing U6.
- **Order polling stores restricted marketplace data.** Persist only operational identifiers and timestamps, no buyer data.

---

## Verification Commands

- `bundle exec rspec spec/services/discogs/marketplace_spec.rb`
- `bundle exec rspec spec/services/store_sales`
- `bundle exec rspec spec/jobs/sales_poll_dispatcher_job_spec.rb spec/jobs/sales_poll_store_job_spec.rb`
- `bundle exec rspec spec/services/storefront_curation/cache_manager_spec.rb`
- `bundle exec rspec spec/jobs/full_store_sync_job_spec.rb`
- `bundle exec rubocop`

---

## Open Questions

- Does Discogs `list_orders` include listing IDs directly for seller OAuth responses, or must Milkcrate call `GET /marketplace/orders/{id}` per new/changed order?
- Which statuses should trigger removal if an order has item IDs but later becomes cancelled? Proposed default: any seen order item removes immediately; full sync restores if relisted.
- What initial interval should paid stores get once fleet size grows? Proposed default: every minute while under budget, then adaptive due interval by store tier.
- Should dashboard/admin surface sales poll health in this same feature or a follow-up issue?
