---
date: 2026-05-13
topic: layered-architecture-fixes
---

# Layered Architecture Fixes

## Summary

Resolve all findings from the layered-architecture audit of the Milkcrate codebase — consolidate enrichment jobs into a single job + service, extract remaining job logic into thin-wrapped services, remove layer violations and dead code, relocating misplaced abstractions. All changes are internal refactors with no user-facing behavior changes.

---

## Problem Frame

The Milkcrate codebase was audited against layered-architecture principles (presentation → application → domain → infrastructure, unidirectional dependencies) and several violations were found. Jobs contain domain and infrastructure logic inline, a domain model calls an application-layer service, presentation formatting lives in a domain model, a policy object sits in the wrong directory, a service checks `Rails.env` directly, and duplicate state-management code exists across model and service layers. While none of these cause runtime bugs today, they increase carrying cost for future changes, make testing harder, and violate abstraction boundaries that will compound as the codebase grows. This work addresses every finding from the audit in a single pass.

---

## Requirements

**[Enrichment consolidation]**
- R1. Create a single `EnrichmentService` at `app/services/enrichment_service.rb` with two public methods: `#enrich_releases(store, listing_ids:)` and `#enrich_music_brainz_images(store)`, consolidating the logic from the two existing jobs.
- R2. Create a single `EnrichmentJob` at `app/jobs/enrichment_job.rb` as a thin wrapper that calls `EnrichmentService`. Remove `EnrichReleasesJob` and `EnrichMusicBrainzImagesJob`.
- R3. Update `FullStoreSyncJob` to enqueue the single `EnrichmentJob` instead of `EnrichReleasesJob`.
- R4. Preserve the existing chain: after release enrichment completes, `EnrichmentService#enrich_releases` still triggers `#enrich_music_brainz_images` (either by calling it directly or by enqueuing). The `EnrichmentJob` should not need to know about this internal sequencing.

**[Daily curation extraction]**
- R5. Extract domain logic from `DailyCurationJob` into a `DailyCurationService` (or equivalent service object). The job becomes a thin wrapper that calls the service.
- R6. The service must handle computing surfaced listings, updating `last_surfaced_at` and `surface_count`, and logging. The job retains scheduling/enqueue-only responsibility.

**[StateManager consolidation]**
- R7. Remove `StoreSync::StateManager`. Route all callers (`StoreSyncService`, `FullStoreSyncJob`) to use `Store#mark_sync_succeeded!` and `Store#mark_sync_failed!` directly.

**[Dead code removal: DailySelection]**
- R8. Remove `DailySelection.fetch_or_generate` class method and its spec. `DailySelectionService` handles generation already; no production code calls the model method.

**[Abstraction relocation: PickPolicy]**
- R9. Move `app/models/pick_policy.rb` to `app/services/pick_policy.rb`. Update all references.

**[Presentation leak: Listing model]**
- R10. Move `display_price` and `discogs_url` methods from `Listing` model to `CratePresenter`. Update `CratePresenter#listing_props` to include these as serialized attributes instead of the view layer calling them on the model.
- R11. Remove `display_price` and `discogs_url` from the `Listing` model.

**[Infrastructure concern: StorefrontCuration]**
- R12. Replace `Rails.env.development?` check in `StorefrontCuration#eligible_listings` with an injected `filter_available:` parameter. Update the caller in `StoresController` to pass the value.

**[Dead code removal: StorefrontTheme]**
- R13. Remove the unused `StorefrontTheme#crate_for` method.

**[Unused table cleanup]**
- R14. Create a migration to drop the `dig_sessions` and `dig_session_items` tables.

---

## Acceptance Examples

- AE1. **Covers R1–R4.** Given a store with listings needing enrichment, when `EnrichmentJob` runs, `Release` records are created/updated with Discogs data, `Listing` records are updated with genres/styles/want/have counts, and cover images are fetched from MusicBrainz — identical outcome to the previous two-job pipeline.
- AE2. **Covers R5, R6.** Given a store with active listings, when `DailyCurationJob` runs, `last_surfaced_at` and `surface_count` are updated on the correct listings, and the job logs the same output as before.
- AE3. **Covers R10–R11.** Given a `Listing` instance, calling `listing.display_price` or `listing.discogs_url` raises `NoMethodError`. The same values are available via `CratePresenter#listing_props`.
- AE4. **Covers R12.** Given `StorefrontCuration.new(store, filter_available: false)`, all listings are eligible regardless of environment — the `Rails.env` branch is eliminated.
- AE5. **Covers R7.** Given a store sync that fails, `Store#mark_sync_failed!` is called and the store's `sync_status` is set to `"failed"` with the error recorded — identical behavior to the removed `StateManager.fail!`.

---

## Success Criteria

- All existing specs pass with no behavioral changes
- No `EnrichReleasesJob`, `EnrichMusicBrainzImagesJob`, or `StoreSync::StateManager` references remain in the codebase
- `DailySelection.fetch_or_generate` is removed with no production callers broken
- `PickPolicy` loads from `app/services/` without autoloading errors
- Migration drops `dig_sessions` and `dig_session_items` tables cleanly
- A downstream implementer (ce-plan or human) can pick this doc up and know exactly what to change without inventing scope

---

## Scope Boundaries

- No new features or user-facing behavior changes
- No frontend / Inertia.js changes
- No addition of architecture enforcement tools (packwerk, rubocop-rspec, etc.)
- No extraction of `DailySelectionService` scoring domain logic to share with `RecordScorer` — the constant references are correctly directed (application → domain)
- No changes to `DiscogsClient` or `MusicBrainzClient` API client layer
- No performance optimization beyond what refactoring naturally brings

---

## Key Decisions

- **Single enrichment job + service**: Combining `EnrichReleasesJob` and `EnrichMusicBrainzImagesJob` into one job with a two-method service reflects that they're already chained and share rate-limiting concerns. A single job entry point is simpler than two thin-wrapped jobs calling the same service.
- **Remove StateManager, keep model methods**: `Store#mark_sync_succeeded!` and `Store#mark_sync_failed!` already exist with nearly identical logic. Removing the service-side duplication keeps the state-transition concern on the model, which is the simpler surface area.
- **All changes land together**: A single branch/PR for all findings rather than phased releases, since each change is small and the refactors are independent.
- **`CratePresenter` absorbs display logic**: The presenter already serializes listing properties. Moving `display_price` and `discogs_url` there is the natural home — it's already the presentation-layer abstraction.

---

## Dependencies / Assumptions

- Existing specs provide adequate coverage to validate behavior preservation
- No production code calls `DailySelection.fetch_or_generate` (verified in audit — only specs)
- `StorefrontTheme#crate_for` has no callers (verified in audit — appears unused)
- `dig_sessions` and `dig_session_items` tables are unused by production code (no corresponding models exist)
- `PickPolicy` is only referenced from `CrateStrategies::Picks` via a require, so moving it just needs the path updated

---

## Outstanding Questions

### Deferred to Planning

- [Affects R1–R4][Technical] Does `EnrichmentService#enrich_releases` call `#enrich_music_brainz_images` synchronously or enqueue a follow-up job? (Current behavior: `EnrichReleasesJob` calls `EnrichMusicBrainzImagesJob.perform_later` — the service could do the same, or call inline.)
- [Affects R5][Technical] What should the `DailyCurationService` be named, and which directory? (`app/services/daily_curation_service.rb` is the default.)
