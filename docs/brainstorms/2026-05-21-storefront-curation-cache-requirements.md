---
date: 2026-05-21
topic: storefront-curation-cache
---

# Storefront Curation Cache (Rails.cache Wrapper)

## Summary

Cache the `StorefrontCuration#storefront_groups` output in Rails.cache keyed by store + date, so store page loads serve precomputed curation instead of recomputing every time. Falls back to on-demand computation + cache write on miss. DailyCurationJob pre-warms the cache.

---

## Problem Frame

Every visit to a store's show page triggers `StorefrontCuration.new(store)` which loads all eligible listings, runs 7 scoring strategies across 4 selection strategies, deduplicates, and serializes through CratePresenter — all synchronously inside the HTTP request. No part of the result is cached between requests. For a store with thousands of listings, this adds seconds of page-load latency for no benefit: the curation output is identical until inventory changes or the day rolls over.

The `DailyCurationJob` already runs the same computation daily to stamp surface counts, but throws away the crate assignments. The output it computed — which listings are in which crate — is never persisted, so subsequent page loads recompute from scratch.

---

## Requirements

- **R-1: Cache the storefront_groups hash.** The cache stores the structured hash produced by `CratePresenter#build_storefront_sections` (the `storefront_sections` Inertia prop). This is what the store page renders. The `crates` array (used by the crate view tab bar) is not cached — it falls back to extracting from `storefront_sections` as the frontend already does.
- **R-2: Cache key includes store and date.** Format: `storefront/curation/v1/{store_id}/{Date.current.iso8601}`. The daily key ensures freshness rotation without explicit invalidation logic.
- **R-3: Cache TTL of 36 hours.** Covers the day boundary so requests at 11:59 PM and 12:01 AM can both hit cache. Cache naturally expires if the daily job misses a run.
- **R-4: Rails.cache.fetch (standard compute-on-miss).** On cache hit, return cached value immediately. On cache miss, run `StorefrontCuration.new(store).storefront_groups` → present → cache.write → return. Use `race_condition_ttl` to prevent thundering herd on cache expiry.
- **R-5: DailyCurationJob pre-warms the cache.** After running the curation to stamp surface counts, also write the `storefront_groups` hash to cache with the same key + TTL. This ensures the midnight boundary is covered: the job runs, warms the new day's cache, and the first visitor of the day hits cache.
- **R-6: Controller reads from cache.** `StoresController#render_store` fetches cached `storefront_sections` and passes them as Inertia props. Only falls back to full recomputation on cache miss (which is also the path for non-production environments during development).

---

## Acceptance Examples

| When | Then |
|------|------|
| First request of the day (cache cold) | Cache miss → compute curation → write to cache → return. Page loads normally. |
| Second request of the day (cache warm) | Cache hit → return cached `storefront_sections`. No curation computation runs. |
| DailyCurationJob runs at midnight | Computes curation, stamps surface counts, writes cache with new day's key. |
| Request at 11:59 PM and 12:01 AM | Both hit cache (different daily keys, but first warms new day). No recompute for the 12:01 AM visitor if the job ran. |
| Deploy restarts processes (solid_cache is persistent) | Cache persists (solid_cache is disk-backed). No cold-start penalty. |
| Development environment (memory_store) | Cache is per-process. First request after server restart misses and recomputes. |

---

## Scope Boundaries

- **In scope:** Wrapping `storefront_groups` in Rails.cache, updating the controller, pre-warming from DailyCurationJob.
- **Not in scope:** Changing CrateStrategies, RecordScorer, or the curation algorithm itself.
- **Not in scope:** Adding a `sync_generation` column or explicit cache invalidation on sync. The daily key + TTL provides adequate staleness bounds. (If explicit invalidation is needed later, the key format supports adding a version component.)
- **Not in scope:** Caching the `crates` method output separately — the frontend already falls back to extracting from `storefront_sections`.

---

## Key Decisions

| Decision | Choice |
|----------|--------|
| What to cache | `storefront_groups` hash (the structured sections for the storefront page) |
| Cache backend | solid_cache (production) / memory_store (development) — existing infrastructure |
| Cache key | `storefront/curation/v1/{store_id}/{Date.current.iso8601}` |
| Cache TTL | 36 hours |
| Read pattern | Rails.cache.fetch with race_condition_ttl (compute on miss) |
| Cache warming | DailyCurationJob writes cache after curation |
| Controller fallback | Compute inline on cache miss (same as current behavior) |

---

## Dependencies / Assumptions

- solid_cache is configured and running in production (already true).
- The `storefront_groups` hash (from `CratePresenter#build_storefront_sections`) is JSON-serializable via solid_cache (ActiveSupport::Cache handles native Ruby hashes — should serialize without issue).
- The curation computation is idempotent for a given (store, date) — calling it twice produces the same crate assignments. (Already true — it's deterministic per Date.today.)
- DailyCurationJob runs at least once per day for each store. (Already true — it processes all stores.)
