---
date: 2026-05-21
topic: storefront-curation-cache
status: active
---

# Plan: Cache Storefront Curation Output

## Summary

Cache the fully-rendered presenter output (`storefront_sections` + `crates`) in Rails.cache using a daily key, so store page loads serve precomputed curation *and* pre-serialized props without recomputing or re-presenting. Uses the existing `DiscogsSellerLookup` caching pattern as a template.

## Origin Document

`docs/brainstorms/2026-05-21-storefront-curation-cache-requirements.md`

## Problem Frame

Every store page load calls `StorefrontCuration.new(store)` which loads all eligible listings, runs 7 RecordScorer strategies across 4 selection strategies, builds genre crates, deduplicates, and serializes — all synchronously inside the HTTP request. No part of this output is cached. `DailyCurationJob` already runs the same computation daily but discards the crate assignments after stamping surface counts. Repeated recomputation is pure waste between data-change events.

## Design Decisions

### What to cache
Cache the **fully-rendered presenter output** — plain Ruby hashes, no ActiveRecord objects. Specifically cache a single entry holding both `storefront_sections` and `crates` as they are passed to the Inertia response:

```ruby
{
  sections: [{key: "picks_wall", crate: {slug:, name:, records: [{id:, artist:, ...}]}}, ...],
  crates:   [{slug:, name:, records: [...]}, ...]
}
```

This means:
- ✅ Curation runs only on cache miss (once per day)
- ✅ Presenter serialization runs only on cache miss
- ✅ On cache hit: zero curation compute, zero presenter serialization, zero AR instantiation
- ✅ Cache is portable (plain Ruby arrays/hashes — no Marshal of AR objects, no schema fragility)
- ✅ Frontend receives the exact same props as today

### Cache key
```
storefront/curation/v1/{store.id}/{Date.current.iso8601}
```

Daily key provides natural rotation. TTL of 36 hours covers the day boundary and provides tolerance for missed daily job runs. The key uses `v1` for future version bumps (e.g., if the curation output shape changes).

### Read pattern
`Rails.cache.fetch` with `race_condition_ttl: 30.seconds`. Standard Rails cache stampede protection — only one process recomputes on expiry; others serve the stale entry briefly.

### Cache warming
`DailyCurationService#curate` writes the cache after completing its computation. This ensures the new day's cache is warm before the first visitor arrives.

### Environment handling
- **Production:** Uses `solid_cache` (persistent, shared across processes). Cache key includes `Date.current` — separate from dev.
- **Development:** Uses `memory_store`. First request after restart misses and recomputes. Cache key includes `Date.current` — separate from production.
- **Test:** Uses `:null_store` (no-op). No caching logic is exercised in test by default. Tests that need caching inject `MemoryStore.new`.

### Follow the DiscogsSellerLookup pattern
The existing `DiscogsSellerLookup` establishes the convention:
- Constructor-inject `cache: Rails.cache`
- Cache-read → on-nil: compute + write → return
- TTL constants at the top of the class
- Test with `ActiveSupport::Cache::MemoryStore.new`

## Implementation Units

### IU-1: Add cache read/write methods

**File:** `app/services/storefront_curation.rb` (or new file `app/services/curation_cache.rb`)

Add a module or service that wraps the full curation + presentation pipeline in `Rails.cache.fetch`. The value stored is the fully-serialized presenter output (plain hashes, no AR objects):

```ruby
class StorefrontCuration
  CURATION_CACHE_TTL = 36.hours
  CURATION_CACHE_RACE_TTL = 30.seconds
  CURATION_CACHE_KEY = "storefront/curation/v1/%<store_id>s/%<date>s"

  # Returns { sections: [...], crates: [...] } — plain hashes, cache-safe.
  def self.cached_curation(store, filter_available: true, cache: Rails.cache)
    key = CURATION_CACHE_KEY % { store_id: store.id, date: Date.current.iso8601 }
    cache.fetch(key, expires_in: CURATION_CACHE_TTL, race_condition_ttl: CURATION_CACHE_RACE_TTL) do
      curation  = new(store, filter_available:)
      presenter = CratePresenter.new(store)
      {
        sections: presenter.build_storefront_sections(curation.storefront_groups),
        crates:   presenter.build_crates(curation.crates)
      }
    end
  end

  def self.write_curation_cache(store, curation_payload, cache: Rails.cache)
    key = CURATION_CACHE_KEY % { store_id: store.id, date: Date.current.iso8601 }
    cache.write(key, curation_payload, expires_in: CURATION_CACHE_TTL)
  end
end
```

**Why not cache** `storefront_groups` directly? That hash contains `CuratedCrate` wrappers holding ActiveRecord `Listing` instances — heavy to serialize, fragile to schema changes, and the presenter still has to run on every cache hit. Caching post-presenter avoids all three problems.

**Design note:** The `filter_available` parameter defaults to `true` in production. In development, `filter_available: false` is used — but the cache key doesn't include it because development uses `memory_store` (per-process, no sharing). If a future environment needs both modes cached simultaneously, append `"/filtered"` or `"/all"` to the cache key.

**Tests to add/modify** (`spec/services/storefront_curation_spec.rb`):
- Verifies `cached_curation` returns a hash with `:sections` and `:crates` keys
- Verifies that a cache hit returns the cached value without instantiating StorefrontCuration or CratePresenter
- Verifies that a cache miss computes curation, runs the presenter, writes to cache, and returns the payload
- Verifies the cache key includes store id and current date

### IU-2: Update StoresController to use cached curation

**File:** `app/controllers/stores_controller.rb`

In `render_store`, replace the direct `StorefrontCuration.new(...)` calls with the cached variant. No `CratePresenter` instantiation needed on cache hit:

```ruby
def render_store(store)
  cached = StorefrontCuration.cached_curation(store,
    filter_available: !Rails.env.development?)

  render inertia: "stores/show", props: {
    store: store_props(store),
    crates: cached[:crates],
    storefront_sections: cached[:sections]
  }
end

private

def store_props(store)
  {
    id: store.id,
    name: store.name,
    discogs_username: store.discogs_username,
    description: store.description,
    total_listings: store.total_listings,
    sync_status: store.sync_status,
    last_sync_error_at: store.last_sync_error_at,
    enrichment_status: store.enrichment_status,
    last_enriched_at: store.last_enriched_at
  }
end
```

The `store_props` data (store name, description, sync_status, etc.) is also cacheable but is a single cheap DB read — not worth caching.

Also: the `MarketingPreviewPresenter` at `app/presenters/marketing_preview_presenter.rb` calls `StorefrontCuration.new(...)` + `CratePresenter`. Update it to use the cached payload:

```ruby
def live_preview(store)
  cached = StorefrontCuration.cached_curation(store,
    filter_available: !Rails.env.development?)
  sections = cap_sections(cached[:sections])
  # ... rest unchanged
end
```

**Test to modify** (`spec/requests/stores_spec.rb`):
- Add a test that verifies the Inertia response includes both `:crates` and `:storefront_sections` from cache
- Add a test that verifies `CratePresenter` is NOT called on cache hit

### IU-3: Pre-warm cache in DailyCurationService

**File:** `app/services/daily_curation_service.rb`

After calling `curation.surfaced_listings` and stamping listings, build the serialized payload and write to cache:

```ruby
def curate(store)
  curation = StorefrontCuration.new(store)
  surfaced = curation.surfaced_listings
  picks_count = curation.crates.find { |crate| crate.slug == "picks" }&.listings&.size || 0

  Listing.where(id: surfaced).update_all(
    last_surfaced_at: Time.current,
    surface_count: Arel.sql("surface_count + 1")
  )

  # Pre-warm the cache with fully-serialized presenter output
  presenter = CratePresenter.new(store)
  payload = {
    sections: presenter.build_storefront_sections(curation.storefront_groups),
    crates:   presenter.build_crates(curation.crates)
  }
  StorefrontCuration.write_curation_cache(store, payload)

  Rails.logger.info "[DailyCurationJob] store=#{store.name} surfaced=#{surfaced.size} picks=#{picks_count}"
end
```

**Test to modify** (`spec/services/daily_curation_service_spec.rb` or `spec/jobs/daily_curation_job_spec.rb`):
- Verify that after `curate(store)`, the cache for that store (current date) is populated with a hash containing `:sections` and `:crates`
- Verify the cached payload matches a fresh compute+present of the same store

### IU-4: No frontend changes needed

Since we're caching the fully-serialized props (including the `crates` array), the frontend receives the exact same payload shape as today. No changes to `show.tsx`, `types/inertia.ts`, or frontend tests are needed. The existing `useMemo` and `CrateView` continue to work identically.

## Test Scenarios

| Scenario | Expected |
|----------|----------|
| **Cold cache**: first request of the day for a store | Cache miss → compute curation → write to cache → return. Response identical to pre-cache behavior. |
| **Warm cache**: second request within same day | Cache hit. `StorefrontCuration.new` is NOT called. Response shaped identically. |
| **DailyCurationJob runs**: pre-warms cache | After job completes, cache entry for that store + today exists. Next page load hits cache. |
| **Cache expiry**: TTL exceeded (e.g., no job ran for 2 days) | Next request is a cache miss, recomputes, re-caches. |
| **Race condition on expiry**: two simultaneous requests hit expired cache | `race_condition_ttl` serves stale entry to one request while the other recomputes. No thundering herd. |
| **Development mode**: memory store, process restart | Cache is cold after restart. First request misses and recomputes. |
| **Frontend**: `crates` prop is populated from cache | `crates` and `storefront_sections` are both populated from cache. Frontend uses `crates` directly (primary branch of `useMemo`). No change in behavior. |
| **MarketingPreviewPresenter**: homepage demo store | Uses cached curation. Same behavior as store page. |
| **Multiple stores**: store A and store B both visited | Separate cache entries per store. No cross-store interference. |

## Risk and Mitigation

| Risk | Mitigation |
|------|------------|
| solid_cache eviction under memory pressure could force cold recompute | 256 MB cache pool; curation snapshots are kilobytes each. Eviction is unlikely but acceptable — recompute cost matches today's baseline. |
| Cache key doesn't account for curation algorithm changes deployed mid-day | Add `v1` to the key; bump on algorithm changes. When bumping, the cache is cold for next request — acceptable as a deploy-time cost. |
| frontend fallback from empty `crates` to `storefront_sections` has edge cases | The existing `useMemo` handles this; cursor-based browsing (history.state) uses slugs from the sections data, not from the crates array. Verify with page smoke tests. |
| DailyCurationJob might fail, leaving no warm cache | 36h TTL means the cache from the previous day's job still serves. Only after 36h without a job run would a cold miss occur (same as today's behavior). |

## Files Changed

| File | Change | Status |
|------|--------|--------|
| `app/services/storefront_curation.rb` | Add `cached_curation` and `write_curation_cache` class methods | New |
| `app/controllers/stores_controller.rb` | Use `cached_curation`, extract `store_props` inline | Modified |
| `app/presenters/marketing_preview_presenter.rb` | Use `cached_curation` instead of `StorefrontCuration.new` | Modified |
| `app/services/daily_curation_service.rb` | Build serialized payload and call `write_curation_cache` | Modified |
| `spec/services/storefront_curation_spec.rb` | Add caching tests | Modified |
| `spec/requests/stores_spec.rb` | Add cache-hit response test | Modified |
| `spec/services/daily_curation_service_spec.rb` | Add cache-warming test | Modified |

## Dependencies

- solid_cache is configured and running in production (already true)
- `Rails.cache.fetch` with `race_condition_ttl` is available in all environments (already true; used by ActiveSupport::Cache)
- `Date.current` is timezone-aware (already true — Rails standard)
