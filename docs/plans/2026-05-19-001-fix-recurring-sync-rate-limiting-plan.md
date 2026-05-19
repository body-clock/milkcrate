---
title: Fix recurring store sync to cover all stores while respecting Discogs rate limits
type: fix
status: completed
date: 2026-05-19
---

# Fix recurring store sync to cover all stores while respecting Discogs rate limits

## Summary

The nightly recurring sync (`config/recurring.yml`) only runs for the demo store (`philadelphiamusic`). Other onboarded stores are never synced again after their initial onboarding sync. Additionally, the sync path in `InventoryFetcher` uses a fixed 0.5s delay between API calls (~120 req/min), exceeding Discogs' 60 req/min authenticated rate limit, with no rate-limit-remaining header awareness and no retry on 429 responses.

This plan fixes both problems: sync all stores nightly with staggered scheduling, and centralize Discogs rate-limit handling in a Faraday middleware on `DiscogsClient` itself — so every caller (sync, enrichment, and any future consumers) automatically respects the rate limit without any per-path throttling logic.

---

## Problem Frame

The admin dashboard shows that stores "haven't synced in a couple days" because:
1. The nightly recurring sync only targets `Store.find_by(discogs_username: Settings.demo_store.discogs_username)` — a single-store lookup. Any store beyond the demo store gets a one-time sync during onboarding (`StoreOnboarding` → `FullStoreSyncJob.perform_later`) but never again.
2. The sync path's 0.5s page delay generates ~120 req/min — double Discogs' 60 req/min authenticated limit. When rate limits are hit, `DiscogsClient` raises `RateLimitError` (HTTP 429), which is not caught or retried in the sync path, failing the entire job.

The enrichment path has bespoke rate-limit awareness (1.1s delay, header check, retry on 429) baked into `EnrichmentService` itself. This means every new consumer of the Discogs API has to reimplement the same pattern. The fix should live in the HTTP client layer so all consumers benefit automatically.

---

## Requirements

- R1. Every onboarded store receives a nightly sync, not just the demo store.
- R2. All Discogs API calls respect the 60 req/min authenticated rate limit automatically.
- R3. Rate-limit handling backs off when `x-discogs-ratelimit-remaining` is nearly exhausted.
- R4. HTTP 429 responses are retried transparently at the HTTP client layer.
- R5. Store syncs are staggered so concurrent rate-limit contention across stores is minimized.
- R6. The sync → enrichment → curation pipeline chain is preserved (FullStoreSyncJob still enqueues EnrichmentJob and DailyCurationJob).
- R7. Rate-limit handling lives in `DiscogsClient` itself — callers do not manage delays, remaining headers, or 429 retries.

---

## Scope Boundaries

- Rate-limit handling is centralized in `DiscogsClient`. Both `InventoryFetcher` and `EnrichmentService` have their per-path rate-limit logic removed.
- The MusicBrainz client is a separate API with different limits — not affected by this change.
- No global rate-limit registry (cross-job shared state) — serialized and staggered execution is the mechanism for multi-store safety.
- No changes to `Store` model schema or sync status enums.
- No changes to the admin dashboard health computation logic.
- The existing Faraday `retry` middleware (503s only) is augmented, not replaced.

---

## Context & Research

### Relevant Code and Patterns

- **DiscogsClient** (`app/services/discogs_client.rb`) — uses Faraday with `build_connection`. Currently has a `retry` middleware for 503s, and reads the rate-limit header in `#release` but not in `#seller_inventory`. **This is where the middleware will be inserted.**
- **EnrichmentService** (`app/services/enrichment_service.rb`) — has the bespoke rate-limit pattern to be removed: `RATE_LIMIT_SLEEP = 1.1`, `RATE_LIMIT_LOW = 5`, `RATE_LIMIT_PAUSE = 10`, retry loop for `RateLimitError`.
- **InventoryFetcher** (`app/services/store_sync/inventory_fetcher.rb`) — has `RATE_LIMIT_DELAY = 0.5`, no header read, no 429 retry. All of this is replaced by the middleware.
- **FullStoreSyncJob** (`app/jobs/full_store_sync_job.rb`) — single `store_id` parameter, chains to `EnrichmentJob` and `DailyCurationJob`.
- **DailyCurationJob** (`app/jobs/daily_curation_job.rb`) — already multi-store aware: iterates `Store.all` when `store_id` is nil.
- **config/recurring.yml** — has `production:`-only schedule entries; Solid Queue recurring jobs.
- **Solid Queue** (`config/queue.yml`) — single pool, 3 threads, 1 process, 0.1s polling.

### Institutional Learnings

- No existing `docs/solutions/` entries cover Discogs rate limiting or sync scheduling. Consider capturing via `ce-compound` after this fix lands.

### External References

- Discogs API rate limiting: 60 requests per minute for authenticated requests. The `x-discogs-ratelimit-remaining` header indicates remaining quota in the current window.
- Faraday middleware pattern: `Faraday::Middleware` subclasses implement `on_complete(env)` for response inspection, and `call(env)` for request interception. Rate-limit middleware typically goes as a response middleware in the handler stack.

---

## Key Technical Decisions

- **Faraday middleware on DiscogsClient, not a per-path concern**: Instead of extracting constants into a shared module and having each caller implement the same sleep/retry/backoff loop, a single `DiscogsRateLimitMiddleware` is registered in `DiscogsClient#build_connection`. It intercepts each response, reads `x-discogs-ratelimit-remaining`, applies baseline pacing, backs off when low, and retries 429s automatically. Every consumer of the client — sync, enrichment, future callers — gets rate-limit discipline for free. No per-path code needed.
- **Staggered store syncs via `SyncAllStoresJob`**: Rather than enqueuing all `FullStoreSyncJob` instances at 11pm (which Solid Queue would process with 3 concurrent threads, each burning the shared rate-limit bucket), a new `SyncAllStoresJob` iterates stores sequentially with staggered delays. This serializes API usage to one store at a time, avoiding concurrent rate-limit contention. No global state needed.
- **Middleware state is per-client-instance**: Each `DiscogsClient` instance has its own middleware state (remaining track, last-request timer). Since `SyncAllStoresJob` staggers by 5 minutes, only one store's sync or enrichment runs at a time, each using its own `DiscogsClient` instance — so there's never contention across middleware instances.

---

## Implementation Units

### U1. Create `DiscogsRateLimitMiddleware` Faraday middleware

**Goal:** Build a Faraday middleware that handles Discogs rate limiting at the HTTP client layer, so callers never manage delays, headers, or 429 retries themselves.

**Requirements:** R2, R3, R4, R7

**Dependencies:** None

**Files:**
- Create: `app/services/discogs_rate_limit_middleware.rb`
- Modify: `app/services/discogs_client.rb` (register middleware in `build_connection`)
- Test: `spec/services/discogs_rate_limit_middleware_spec.rb`

**Approach:**
- Create a class `DiscogsRateLimitMiddleware < Faraday::Middleware` that:
  1. Stores local state per-instance: `@last_request_time` (nil initially), `@last_remaining` (nil).
  2. Implements `call(env)` to call `@app.call(env).on_complete { |response_env| handle_response(response_env) }`.
  3. On completion, reads `response_env.response_headers["x-discogs-ratelimit-remaining"].to_i` and stores it as `@last_remaining`.
  4. Enforces a **minimum elapsed time** since `@last_request_time`: if less than `SLEEP` seconds (1.1) have passed, sleeps for the remaining duration before returning. This provides the baseline ~55 req/min pacing.
  5. If `@last_remaining <= LOW` (5), additionally sleeps `PAUSE` (10) seconds — additive on top of the baseline pacing.
  6. On a 429 response status, retries with exponential backoff: sleeps `2^attempt` seconds (capped at 60s), resets `@last_request_time` to account for the wait, and re-calls `@app.call(env)`. Up to `MAX_RETRIES` (3) attempts before allowing the `RateLimitError` to propagate.

**Constants** (defined inline on the middleware class):
- `SLEEP = 1.1` — baseline pacing, targeting ~55 req/min
- `LOW = 5` — remaining threshold to trigger extended pause
- `PAUSE = 10` — seconds to sleep when remaining <= LOW
- `MAX_RETRIES = 3` — max 429 retry attempts per request
- `BACKOFF_BASE = 2` — exponential backoff base (2^attempt seconds)

**Registration in DiscogsClient#build_connection:**
- Add `f.response :discogs_rate_limit` (or use a custom handler name) in the middleware stack, placed **after** the `:json` response parser (so response headers are still accessible) but before the `:retry` middleware (which handles 503s — a separate concern).

```ruby
def build_connection
  Faraday.new(url: BASE_URL) do |f|
    f.options.timeout = 10
    f.options.open_timeout = 5
    f.request :url_encoded
    f.response :json
    f.use DiscogsRateLimitMiddleware
    f.request :retry, max: 3, interval: 2.0, retry_statuses: [503]
    f.headers["Authorization"] = "Discogs token=#{@token}"
    f.headers["User-Agent"] = "Milkcrate/1.0 +https://milkcrate.fm"
  end
end
```

**Patterns to follow:**
- Faraday middleware examples in the Faraday documentation; this is a `Faraday::Middleware` subclass with `call(env)`.
- The existing `DiscogsClient#release` already reads the rate-limit header — the middleware now does this universally instead.

**Test scenarios:**
- Happy path: Given a successful response with remaining > 5, the middleware applies baseline delay (1.1s) and passes the response through unchanged.
- Low quota: Given `remaining = 3` on a response, the middleware applies baseline delay + the extended `PAUSE` (10s) before returning.
- 429 handled: Given a 429 response, the middleware retries up to `MAX_RETRIES` times with exponential backoff. On success before max, the response is returned normally.
- 429 exhausted: Given persistent 429 after `MAX_RETRIES`, `RateLimitError` propagates to the caller.
- Consecutive requests: Given two rapid requests, the middleware ensures at least `SLEEP` seconds have elapsed between them.
- Missing header: Given a response without `x-discogs-ratelimit-remaining`, `@last_remaining` stays `nil` — middleware applies baseline delay and continues (no crash on nil <= 5 comparison — use `.to_i` or guard).

**Verification:**
- `DiscogsClient#seller_inventory` and `#release` both automatically have pacing and 429 retry with no changes to their method bodies.
- Rate of API calls stays under 60 req/min when measured over a window (validated by middleware's SLEEP + LOW/PAUSE logic).

---

### U2. Remove rate-limit logic from `InventoryFetcher`

**Goal:** Delete the per-path rate-limit code from the sync's inventory fetcher — the middleware now handles everything.

**Requirements:** R2, R3, R4, R7

**Dependencies:** U1

**Files:**
- Modify: `app/services/store_sync/inventory_fetcher.rb`
- Test: `spec/services/store_sync/inventory_fetcher_spec.rb`

**Approach:**
- Remove the `RATE_LIMIT_DELAY = 0.5` constant (no longer needed).
- Remove `sleep(RATE_LIMIT_DELAY)` from `each_page` — the middleware handles pacing between all outgoing requests.
- Remove the `DiscogsClient::RateLimitError` rescue block from `fetch_page` — the middleware handles 429 retry transparently.
- Remove the `RescueDiscogsClient::ApiError` catch that only matched the 100-page-limit message — this is a different class of error (business rule, not rate limit) and should remain.
- `seller_inventory` goes back to returning a single value (`body`) instead of a tuple, since the caller no longer reads the remaining header. (This reverts the U2 change from the previous plan version.)
- The `fetch_page` method becomes simpler — it just calls `client.seller_inventory(...)` and raises/handles the 100-page-limit `ApiError`.

**Patterns to follow:**
- The existing `Account` pattern — methods that call the client should not add their own rate-limit scaffolding.

**Test scenarios:**
- Existing pagination tests still pass (happy path, max_pages, empty result, 100-page limit) — but mocks no longer need to return `[body, remaining]` tuples.
- No rate-limit-specific tests remain in the fetcher spec — those are now tested in the middleware spec (U1).
- The 100-page-limit `ApiError` handling is preserved.
- Default pacing: middleware's 1.1s baseline still applies automatically — the fetcher doesn't manage it.

**Verification:**
- `InventoryFetcher` has no rate-limit-specific lines (no sleep, no header reads, no 429 retry).
- All existing fetcher tests pass after updating mocks to return single values.

---

### U3. Remove Discogs rate-limit logic from `EnrichmentService`

**Goal:** Delete the per-path rate-limit code from the enrichment service — the middleware now handles Discogs pacing and retry.

**Requirements:** R2, R3, R4, R7

**Dependencies:** U1

**Files:**
- Modify: `app/services/enrichment_service.rb`
- Test: `spec/services/enrichment_service_spec.rb`

**Approach:**
- Remove the `RATE_LIMIT_SLEEP = 1.1`, `RATE_LIMIT_LOW = 5`, `RATE_LIMIT_PAUSE = 10` constants (no longer needed for Discogs calls).
- In `enrich_releases`:
  - Remove `sleep(RATE_LIMIT_SLEEP)` after each Discogs release fetch — the middleware handles pacing.
  - Remove the `remaining <= RATE_LIMIT_LOW` check and `sleep(RATE_LIMIT_PAUSE)` — the middleware handles low-quota backoff.
  - Remove the `DiscogsClient::RateLimitError` rescue-retry block — the middleware handles 429 retry transparently.
  - Keep the `DiscogsClient::ApiError` rescue (for non-rate-limit API errors) and the per-release logging.
- In `enrich_music_brainz_images`:
  - Keep `sleep(RATE_LIMIT_SLEEP)` as-is — this is pacing for MusicBrainz calls (different API, different limits). Use a local constant (e.g., `MUSICBRAINZ_SLEEP = 1.1`) or just keep the value inline — it's no longer shared with Discogs logic.
- `DiscogsClient#release` can still return `[body, remaining]` or be simplified to just `body` — doesn't matter since the caller doesn't use `remaining` anymore. Simplifying to `body` is cleaner but optional.

**Patterns to follow:**
- The method body now focuses on Discogs/MusicBrainz business logic rather than HTTP pacing concerns.

**Test scenarios:**
- Stale releases are still enriched: Given listing IDs with stale releases, enrichment fires the expected number of Discogs release API calls.
- API errors are logged: Given `DiscogsClient::ApiError` on a release, enrichment logs a warning and continues the batch.
- Rate limit errors no longer caught here: Given a `RateLimitError` (now raised only after middleware exhausts 3 retries), it propagates to the job level — update or remove any tests that expected per-release 429 handling.
- MusicBrainz pacing is preserved: The `sleep` between MusicBrainz calls still applies.
- Remaining header not required: `DiscogsClient#release` return type is consistent (either `body` alone or `[body, remaining]` — whichever is chosen).

**Verification:**
- `EnrichmentService` has no Discogs rate-limit-specific lines (no sleep tied to Discogs remaining, no 429 retry for Discogs calls).
- All existing enrichment tests pass after removing rate-limit assertions.

---

### U4. Create `SyncAllStoresJob` with staggered scheduling

**Goal:** Create a new job that synchronizes all stores with staggered delays, preventing concurrent rate-limit contention.

**Requirements:** R1, R5, R6

**Dependencies:** U2 (InventoryFetcher is clean — no rate-limit logic), though U2's cleanup is independent of stagger timing

**Files:**
- Create: `app/jobs/sync_all_stores_job.rb`
- Test: `spec/jobs/sync_all_stores_job_spec.rb`

**Approach:**
- Create `SyncAllStoresJob` that iterates `Store.all` and enqueues each `FullStoreSyncJob` with a staggered `wait` delay:

```ruby
class SyncAllStoresJob < ApplicationJob
  queue_as :default

  STAGGER_INTERVAL = 5.minutes

  def perform
    Store.find_each.with_index do |store, index|
      FullStoreSyncJob
        .set(wait: STAGGER_INTERVAL * index)
        .perform_later(store.id)
    end
  end
end
```

- `STAGGER_INTERVAL` of 5 minutes ensures each store's sync and enrichment finish before the next store starts. A 50-page store = 100 API calls (two passes) at 1.1s/call ≈ 118s sync + enrichment time. 5 minutes provides comfortable margin even for larger stores up to ~100 pages (~4 min sync).
- At current scale (handful of stores), the full sweep completes within 30-60 minutes, well within the overnight window.
- The job itself runs instantly (just enqueues), so it doesn't tie up a worker.
- **Deleted store edge case:** `FullStoreSyncJob#perform` wraps `Store.find(store_id)` in a `begin/rescue ActiveRecord::RecordNotFound` that logs a warning and returns early, preventing a `RecordNotFound` from propagating as a confusing error chain. This is especially important with staggered scheduling — the window between job enqueue and execution can be hours.

**Patterns to follow:**
- `ActiveJob` `.set(wait:)` is supported by Solid Queue natively.
- `discard_on ActiveJob::DeserializationError` pattern already present (commented out) in `ApplicationJob`.

**Test scenarios:**
- Execution: Given 3 stores, `SyncAllStoresJob#perform` enqueues 3 `FullStoreSyncJob` instances with `wait` delays of 0, 5, and 10 minutes respectively.
- No stores: Given zero stores, no jobs are enqueued (graceful no-op).
- Stagger precision: The `wait` delays use `ActiveJob`'s `set(wait:)` API and correctly apply `STAGGER_INTERVAL * index`.

**Verification:**
- Running `SyncAllStoresJob.perform_now` enqueues the correct number of `FullStoreSyncJob` with staggered delays.

---

### U5. Update `config/recurring.yml` to use `SyncAllStoresJob`

**Goal:** Replace the single-store recurring command with the new multi-store job.

**Requirements:** R1, R5

**Dependencies:** U4

**Files:**
- Modify: `config/recurring.yml`

**Approach:**
- Replace the inline `command` with a `class`-based recurring schedule pointing to `SyncAllStoresJob`:

```yaml
production:
  full_store_sync:
    class: SyncAllStoresJob
    queue: default
    schedule: every day at 11pm
```

- The old schedule name `full_store_sync` is preserved for clarity.
- Using `class:` instead of `command:` means Solid Queue handles the job lifecycle directly (retries, failure tracking, MissionControl visibility) rather than executing inline Ruby in the scheduler process.
- The `clear_solid_queue_finished_jobs` and `daily_curation` schedules remain unchanged.

**Patterns to follow:**
- `daily_curation` entry in the same file already uses `class:` format with `DailyCurationJob`.

**Test scenarios:**
- Schedule loads: The `production` recurring schedule parses without error.
- Execution: When the schedule triggers, `SyncAllStoresJob` is enqueued.
- Existing schedules: `clear_solid_queue_finished_jobs` and `daily_curation` are unaffected.

**Verification:**
- The recurring configuration is valid YAML and Solid Queue accepts it (no syntax or schema errors).
- At 11pm nightly, all stores receive staggered syncs.

---

## System-Wide Impact

- **Interaction graph:** `SyncAllStoresJob` enqueues `FullStoreSyncJob`(s), which enqueue `EnrichmentJob` and `DailyCurationJob`. The chain is preserved unchanged. Rate-limit handling now lives in `DiscogsClient` middleware, transparent to all callers.
- **Error propagation:** If rate-limit retries in the middleware are exhausted, `RateLimitError` propagates to the caller (e.g., `FullStoreSyncJob`), which records the failure on the store. If `SyncAllStoresJob` itself fails (e.g., DB unavailable), no stores sync that night.
- **State lifecycle risks:** The staggered delay means first and last stores may be hours apart in sync timing. The `last_synced_at` field reflects actual completion time per store, so this is accurate.
- **Unchanged invariants:** `FullStoreSyncJob` still handles per-store sync lifecycle identically. The admin dashboard health computation, `Store#stale?` threshold (23 hours), `DailyCurationJob` multi-store iteration are all unchanged.
- **Removed code paths:** `InventoryFetcher` no longer manages rate-limit delays or 429 retries. `EnrichmentService` no longer manages Discogs rate-limit delays, remaining checks, or 429 retries. All of that moved to the middleware.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Middleware pacing doesn't account for concurrent client instances (e.g., enrichment running while next sync starts) | Staggered scheduling (U4) with 5-minute intervals ensures only one store's sync/enrichment runs at a time, so only one `DiscogsClient` instance is active. |
| Sync takes longer than stagger interval for a store with very large inventory | Each store sync makes **2N API calls** (two passes: desc + asc). A 50-page store = 100 calls at 1.1s/call ≈ 118s (~2 min). A 100-page store = 200 calls ≈ 238s (~4 min). The 5-minute stagger provides comfortable margin for most stores. For stores exceeding 100 pages, monitor and increase `STAGGER_INTERVAL` further. |
| Middleware 429 retry with backoff could delay return significantly | Exponential backoff caps at 60s per wait. With 3 retries, worst case = ~7s total added delay per request. This is acceptable for nightly batch work. |
| Enrichment overlaps with next store's sync under heavy load | With 5-minute stagger and enrichment adding ~1-2 minutes per store, overlap is unlikely. If it occurs, both operations share the same `DiscogsClient` rate limit through independent middleware instances — the middleware's per-request backoff prevents total failure but may slow both paths. Mitigation: monitor and increase stagger if needed. |
| `SyncAllStoresJob` fails silently | The job runs in the default queue and is retried by Solid Queue. Failure is visible in MissionControl::Jobs at `/jobs`. |
| Enrichment uses a `DiscogsClient` instance that's unrelated to the sync's instance | Each creates its own `DiscogsClient`, hence its own middleware state. With staggered scheduling, this is fine — only one runs at a time. |

---

## Documentation / Operational Notes

- After deployment, verify the first nightly sync by checking `last_synced_at` on each store the following morning, or trigger manually: `SyncAllStoresJob.perform_now` in Rails console.
- Monitor MissionControl::Jobs for retries or failures. `FullStoreSyncJob` failures will be visible as individual job failures in the `default` queue.
- If store count grows significantly (10+ stores), consider further increasing `STAGGER_INTERVAL` or switching to a rate-limit-aware token-bucket approach with shared state to compress the sweep window.
- The middleware applies universally — any future code that creates a `DiscogsClient` gets rate-limit discipline automatically. This is the main benefit of the middleware approach over per-path constants.

---

## Sources & References

- Related code: `app/services/discogs_client.rb` (middleware registered here)
- Related code: `app/services/enrichment_service.rb` (rate-limit logic to remove)
- Related code: `app/services/store_sync/inventory_fetcher.rb` (rate-limit logic to remove)
- Related code: `app/jobs/full_store_sync_job.rb` (existing per-store sync job)
- Related code: `app/jobs/daily_curation_job.rb` (existing multi-store pattern)
- Related config: `config/recurring.yml` (schedule to update)
- Faraday middleware documentation: `Faraday::Middleware` subclass pattern
