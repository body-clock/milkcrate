---
title: "Centralized Discogs rate-limit middleware and multi-store recurring sync"
date: 2026-05-19
category: integration-issues
module: discogs_client
problem_type: integration_issue
component: service_object
severity: high
symptoms:
  - "Only the demo store received nightly recurring syncs"
  - "Sync path exceeded Discogs 60 req/min limit with 0.5s delay (~120 req/min)"
  - "429 Too Many Requests received with no retry logic in sync path"
  - "Rate-limit logic duplicated across InventoryFetcher and EnrichmentService with different constants"
  - "Enrichment and sync jobs ran concurrently, competing for the same API quota"
root_cause: missing_workflow_step
resolution_type: code_fix
tags:
  - discogs
  - rate-limiting
  - faraday
  - middleware
  - activejob
  - concurrency
  - recurring-jobs
---

# Centralized Discogs Rate-Limit Middleware and Multi-Store Recurring Sync

## Problem

The Discogs sync system had two structural defects that compounded each other.

First, the nightly recurring sync (`config/recurring.yml`) only targeted a single hardcoded demo store via an inline `command:`. Any store onboarded after initial setup received a one-time sync during onboarding but was never synced again on the recurring schedule.

Second, Discogs enforces 60 authenticated requests per minute. The sync path used a fixed 0.5s delay between paginated API calls (~120 req/min), exceeding the limit with no retry on HTTP 429 responses. The enrichment path had its own bespoke rate-limit awareness (1.1s delay, header check, extended pause when remaining low, 429 retry) duplicated inline with different constants than the sync path. Neither approach scaled to multiple stores or coordinated with concurrent callers.

## Symptoms

- **Stale inventory.** Stores onboarded after the demo never received recurring updates. Inventory data grew increasingly stale for every store except the one hardcoded in `recurring.yml`.
- **Silent rate-limit failures.** The sync path made requests at double the allowed rate and had no 429 retry logic — throttled requests failed silently, producing incomplete syncs.
- **Inconsistent rate limiting.** Two independent pacing implementations with different constants (`RATE_LIMIT_DELAY = 0.5` in `InventoryFetcher`, `RATE_LIMIT_SLEEP = 1.1` in `EnrichmentService`) meant behavior varied by code path, and neither was guaranteed to apply to future callers.
- **Concurrent quota competition.** When enrichment for store N overlapped with sync for store N+1, two `DiscogsClient` instances made requests simultaneously, each pacing independently — combined throughput could exceed the 60 req/min limit.

## What Didn't Work

1. **A hardcoded store slug in `recurring.yml`.** The command `Store.find_by(discogs_username: Settings.demo_store.discogs_username)` worked for the demo store only. It was never generalized — every new store needed manual addition or a separate mechanism.

2. **A fixed 0.5s delay in `InventoryFetcher`.** Produced ~120 req/min — double Discogs' limit. No header-aware adjustment or backoff when throttled.

3. **Bespoke inline rate limiting in `EnrichmentService`.** Three constants (`RATE_LIMIT_SLEEP`, `RATE_LIMIT_LOW`, `RATE_LIMIT_PAUSE`) plus a `DiscogsClient::RateLimitError` rescue block. Correct-ish pacing (1.1s = ~55 req/min) but duplicated code that required manual reimplementation in every HTTP-consuming path.

4. **No coordination between job classes.** `FullStoreSyncJob` and `EnrichmentJob` both consumed the Discogs API through independent `DiscogsClient` instances. When they ran concurrently, each paced at ~55 req/min — combined ~110 req/min against a single API key.

## Solution

### 1. Faraday middleware for centralized rate limiting

Created `DiscogsRateLimitMiddleware < Faraday::Middleware` that owns all pacing, quota monitoring, and 429 retry logic — one class, tested once, used by every caller.

```ruby
class DiscogsRateLimitMiddleware < Faraday::Middleware
  SLEEP = 1.1       # baseline pacing: ~55 req/min
  LOW = 5           # remaining threshold to trigger extended pause
  PAUSE = 10        # seconds to sleep when remaining <= LOW
  MAX_RETRIES = 3   # max 429 retry attempts per request
  BACKOFF_BASE = 2  # exponential backoff base (2^attempt seconds)

  def call(env)
    sleep_if_needed
    response = request_with_retry(env)
    pause_if_quota_low(response)
    @last_request_time = Time.now.to_f
    response
  end

  private

  def request_with_retry(env, attempt: 1)
    response = @app.call(env)
    return response unless response.status == 429
    return response if attempt > MAX_RETRIES
    sleep(backoff_for(attempt))
    request_with_retry(env, attempt: attempt + 1)
  end

  def backoff_for(attempt)
    [(BACKOFF_BASE**attempt), 60].min
  end

  def pause_if_quota_low(response)
    @last_remaining = response.headers["x-discogs-ratelimit-remaining"]&.to_i
    return unless @last_remaining && @last_remaining <= LOW
    sleep(PAUSE)
  end

  def sleep_if_needed
    return unless @last_request_time
    elapsed = Time.now.to_f - @last_request_time
    if elapsed < SLEEP
      sleep(SLEEP - elapsed)
    end
  end
end
```

Key structural choices (Sandi Metz style):
- `call` is a 4-line pipeline — sleep, retry, pause, timestamp. No conditionals.
- `request_with_retry` uses guard clauses with no `else` — early return on non-429, early return on exhausted retries, recursive retry (max depth 3).
- `backoff_for` capped at 60s: `[(BACKOFF_BASE**attempt), 60].min`
- Per-instance state (`@last_request_time`, `@last_remaining`) — no global state, safe for isolated usage per `DiscogsClient` instance.

### 2. Register middleware in DiscogsClient

```ruby
# app/services/discogs_client.rb
def build_connection
  Faraday.new(url: BASE_URL) do |f|
    f.options.timeout = 10
    f.options.open_timeout = 5
    f.request :url_encoded
    f.response :json
    f.use DiscogsRateLimitMiddleware
    f.request :retry, max: 3, interval: 2.0, retry_statuses: [ 503 ]
    f.headers["Authorization"] = "Discogs token=#{@token}"
    f.headers["User-Agent"] = "Milkcrate/1.0 +https://milkcrate.fm"
  end
end
```

Placed after the JSON response parser (so response headers are still accessible for the `x-discogs-ratelimit-remaining` read) and before the existing retry middleware (which handles 503s — a separate concern).

### 3. Remove per-path rate-limit code

**`InventoryFetcher`** — removed `RATE_LIMIT_DELAY = 0.5` constant and the `sleep(RATE_LIMIT_DELAY)` call from `each_page`. The middleware handles all pacing.

**`EnrichmentService`** — removed constants `RATE_LIMIT_SLEEP`, `RATE_LIMIT_LOW`, `RATE_LIMIT_PAUSE`, the inline remaining-header check with conditional sleep, and the `DiscogsClient::RateLimitError` rescue block. MusicBrainz pacing preserved under explicit `MUSICBRAINZ_SLEEP = 1.1` (separate API, separate limits).

### 4. Multi-store sync job with staggered scheduling

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

Each store's `FullStoreSyncJob` is enqueued with a 5-minute delay from the previous one. At current scale (handful of stores), the full sweep completes within 30-60 minutes. The stagger spreads load across the night and provides natural ordering for the concurrency limit (see below).

### 5. Shared concurrency limit across Discogs API jobs

```ruby
class FullStoreSyncJob < ApplicationJob
  limits_concurrency to: 1, key: -> { "discogs_api" }
  # ...
end

class EnrichmentJob < ApplicationJob
  limits_concurrency to: 1, key: -> { "discogs_api" }
  # ...
end
```

Both jobs share the same concurrency limit key (`"discogs_api"`), so only one Discogs API consumer runs at any given moment. This prevents the enrichment for store N from overlapping with the sync for store N+1 — the queue naturally serializes them.

`DailyCurationJob` does not need this limit — it performs local computation only, with no Discogs API calls.

### 6. Update recurring schedule

```yaml
# config/recurring.yml
production:
  full_store_sync:
    class: SyncAllStoresJob
    queue: default
    schedule: every day at 11pm
```

Changed from `command:` (inline Ruby with hardcoded store) to `class:` (Active Job class reference, same pattern as the existing `daily_curation` entry).

## Why This Works

**Root cause 1 — single-store scheduling:** `recurring.yml` hardcoded a store lookup in a `command:` string. The fix uses a dedicated job class that queries the database and fans out to all stores — a pattern the scheduler natively supports via `class:`.

**Root cause 2 — rate-limit in the wrong layer:** Rate limiting is an HTTP transport concern, not a business-logic concern. Placing it in a Faraday middleware on `DiscogsClient` means:
- Every API call through the client gets pacing automatically — callers can't forget to sleep.
- Retry and backoff are transparent — callers never see 429s (up to the retry limit).
- Quota awareness (`x-discogs-ratelimit-remaining`) is centralized — one place to tune, not two diverging implementations.
- Any future `DiscogsClient` consumer (import feature, manual refresh, bulk operation) gets rate-limit discipline for free.

**Root cause 3 — concurrent callers sharing a quota:** Two job classes both consuming the same API with independent middleware instances could each pace at ~55 req/min, totaling ~110 req/min. The shared `limits_concurrency to: 1, key: -> { "discogs_api" }` ensures only one runs at a time. Combined with the middleware's 1.1s pacing, this caps throughput at ~55 req/min — safely under Discogs' 60 req/min limit.

## Prevention

### Use middleware for cross-cutting HTTP concerns

Any pacing, retry, or quota management for external APIs belongs in a Faraday middleware on the client class, not in business-logic service objects. The middleware is guaranteed to apply to all calls through that connection and is testable in isolation.

### Share concurrency keys across jobs consuming the same API

When multiple job classes consume the same external API, they must use the same concurrency limit key. The key should name the API resource, not the job:

```ruby
# Correct — shares quota across all Discogs consumers
limits_concurrency to: 1, key: -> { "discogs_api" }

# Wrong — one job runs while the other starves
limits_concurrency to: 1, key: -> { "full_store_sync" }
limits_concurrency to: 1, key: -> { "enrichment" }
```

### Fan out from recurring jobs, don't hardcode

Use `class:` with a fan-out job that queries data dynamically. Test the fan-out job trivially:

```ruby
RSpec.describe SyncAllStoresJob do
  it "enqueues FullStoreSyncJob for each store with staggered delays" do
    stores = create_list(:store, 3)
    described_class.new.perform
    expect(FullStoreSyncJob).to have_been_enqueued.exactly(3).times
  end
end
```

### Stagger enqueue times for concurrency-limited fan-out

When a fan-out job enqueues work with `limits_concurrency to: 1`, staggering the enqueue times prevents a convoy of jobs piling up at the same moment. Use `wait:` with an index multiplier:

```ruby
Store.find_each.with_index do |store, index|
  FullStoreSyncJob
    .set(wait: STAGGER_INTERVAL * index)
    .perform_later(store.id)
end
```

## Related

- Middleware: `app/services/discogs_rate_limit_middleware.rb`
- Client: `app/services/discogs_client.rb`
- Jobs: `app/jobs/sync_all_stores_job.rb`, `app/jobs/full_store_sync_job.rb`, `app/jobs/enrichment_job.rb`
- Cleaned-up services: `app/services/store_sync/inventory_fetcher.rb`, `app/services/enrichment_service.rb`
- Schedule: `config/recurring.yml`
- Solid Queue concurrency limits: [Active Job `limits_concurrency`](https://api.rubyonrails.org/classes/ActiveJob/ConcurrencyControl/ClassMethods.html)
