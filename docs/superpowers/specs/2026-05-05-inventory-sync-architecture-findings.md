# Inventory Sync Architecture Findings

Date: 2026-05-05

## Scope

This note records the current deepening opportunities surfaced during the `improve-codebase-architecture` review, plus the design decisions already made while grilling candidate `1`.

The domain language below follows `CONTEXT.md`:

- **Inventory Sync**
- **Inventory Snapshot**
- **Rolling Inventory Mirror**
- **Inventory Trust**
- **Enrichment**
- **Listing**
- **Release**

The architecture language below follows the skill glossary:

- **Module**
- **Interface**
- **Implementation**
- **Depth**
- **Seam**
- **Adapter**
- **Leverage**
- **Locality**

## Deepening Opportunities

### 1. Inventory Sync + Rolling Inventory Mirror lifecycle

Files:

- `app/services/store_sync_service.rb`
- `app/services/store_sync/listing_reconciler.rb`
- `app/services/store_sync/coverage_classifier.rb`
- `app/jobs/full_store_sync_job.rb`
- `app/models/store.rb`
- `app/models/listing.rb`

Problem:

Understanding one **Inventory Sync** currently requires bouncing across crawl, reconciliation, coverage classification, sync status, watermarking, and availability semantics. The seam is leaky: lifecycle knowledge is split between the sync module and the job adapter, and tests reach across the seam to verify watermark behavior indirectly.

Solution:

Deepen the **Inventory Sync** module so it owns the **Rolling Inventory Mirror** lifecycle end to end: crawl, coverage classification, reconciliation, and sync outcome assembly. Keep the job as an adapter.

Benefits:

- Better **locality** for sync behavior
- More **leverage** from one sync-oriented test surface
- Easier reasoning about when a **Listing** is in or out of the **Rolling Inventory Mirror**

### 2. Inventory Trust policy

Files:

- `app/models/listing.rb`
- `app/services/picks_selector.rb`
- `app/services/storefront_curation.rb`
- `app/services/storefront_theme_rotation.rb`

Problem:

**Inventory Trust** currently lives mostly inside `Listing.available`, but callers still need to know to chain `.available.lp_only` and to understand `catalog_coverage` and sync watermark semantics. The module hides SQL, not policy.

Solution:

Concentrate **Inventory Trust** into a deeper module used by storefront selection, and separate trust policy from generic `Listing` querying and LP filtering.

Benefits:

- Better **locality** when tuning false-negative behavior
- More **leverage** for storefront callers
- Tests that assert trust outcomes through one seam instead of reconstructing them from timestamps and store state

### 3. Enrichment planning and payload ownership

Files:

- `app/jobs/enrich_releases_job.rb`
- `app/models/release.rb`
- `app/services/store_sync/listing_normalizer.rb`
- `app/services/corpus/discogs_snapshot_importer.rb`

Problem:

The seam between **Inventory Sync** and **Enrichment** is blurry. The job owns staleness, Discogs payload parsing, `Release` upsert rules, and fan-out to `Listing`, while corpus ingestion duplicates listing-shaping knowledge from live **Inventory Snapshot** ingestion.

Solution:

Deepen the **Enrichment** module so **Release** metadata extraction, staleness, and `Listing` fan-out live together, and align live and corpus **Inventory Snapshot** normalization.

Benefits:

- Cleaner seam between **Inventory Sync** and **Enrichment**
- Less drift between Discogs adapters
- Better tests through one **Enrichment** interface

### 4. Storefront curation result

Files:

- `app/services/storefront_curation.rb`
- `app/services/picks_selector.rb`
- `app/services/storefront_theme_rotation.rb`
- `app/models/storefront_theme.rb`
- `app/presenters/crate_presenter.rb`
- `app/controllers/stores_controller.rb`
- `app/frontend/types/inertia.ts`

Problem:

One storefront concept is split across ranking, thematic rotation, section assembly, payload shaping, and controller orchestration. `StorefrontCuration` exposes overlapping surfaces and leaves the presenter/controller co-owning part of the interface.

Solution:

Deepen storefront curation around the shopper-visible curation result, and collapse overlapping surfaces so controller and presenter become thin adapters.

Benefits:

- Higher **leverage** from one storefront seam
- Better **locality** for dedupe, order, and featured-row rules
- Tests that verify the curation result instead of helper scaffolding

### 5. Featured/thematic/genre surfacing rules

Files:

- `app/services/storefront_curation.rb`
- `app/services/storefront_theme_rotation.rb`
- `app/models/storefront_theme.rb`
- `app/services/record_scorer.rb`
- `app/services/picks_selector.rb`

Problem:

`new arrivals`, thematic crates, and genre crates each use different modules and ranking rules. Understanding why a **Listing** surfaced means tracing eligibility, ranking, dedupe, and ordering across several seams.

Solution:

Deepen storefront surfacing so featured, thematic, and genre curation behavior live together behind one module, with internal seams for specialized ranking logic.

Benefits:

- Stronger **locality** for storefront strategy changes
- More **leverage** from a single curation model
- Tests that assert final storefront behavior rather than helper-by-helper mechanics

## Candidate 1 Decisions So Far

We started grilling candidate `1` first.

Settled decisions:

1. The deepened **Inventory Sync** module should return a result and keep `Store` mutation in a separate adapter.
2. The result should expose domain outcomes, not raw crawl facts.

Implications:

- `FullStoreSyncJob` should become an **adapter** over the deepened **Inventory Sync** seam.
- `Store` mutation should happen in a separate adapter that applies the sync result.
- The sync result should be shaped around domain outcomes of the **Rolling Inventory Mirror**, not implementation detail about pagination or fetch mechanics.

## Open Question For Candidate 1

Still unresolved:

- Should the deepened **Inventory Sync** module decide which `Listing` ids need downstream **Enrichment**, or should that stay outside the seam as a separate adapter over the sync result?
