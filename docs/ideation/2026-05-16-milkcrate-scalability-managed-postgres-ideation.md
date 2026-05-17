---
date: 2026-05-16
topic: milkcrate-scalability-managed-postgres
focus: performant, reliable, and affordable Kamal/Hetzner scaling with robust Postgres backup
mode: repo-grounded
---

# Ideation: Milkcrate Scalability and Managed Postgres

## Grounding Context

Milkcrate is a Rails 8.1, Inertia React, PostgreSQL application deployed with Kamal to a single Hetzner server. The current deployment keeps the Rails app and the Postgres accessory on the same host (`config/deploy.yml`), with `SOLID_QUEUE_IN_PUMA=true` and Solid Cache/Solid Cable backed by Postgres databases (`config/database.yml`, `config/cache.yml`, `config/queue.yml`, `config/cable.yml`).

The product strategy is moving from one configured Discogs seller toward store onboarding and a freemium model. That means the scalability problem is not just raw traffic; it is per-vendor isolation, predictable page speed, sync/enrichment workload control, and database durability as more stores trust the system.

The hot read path is currently dynamic. `StoresController#render_store` builds `StorefrontCuration`, computes crates, and serializes records through `CratePresenter` for each storefront request. `StorefrontCuration#eligible_listings` loads a store's available LP listings into memory, then scoring and crate selection run in Ruby. This is fine for a small catalog and low traffic, but it makes each vendor storefront request depend on database reads, Ruby scoring, and payload serialization.

The write/job path is IO-heavy. `FullStoreSyncJob` crawls Discogs inventory, `EnrichmentJob` makes rate-limited Discogs/MusicBrainz calls with sleeps, and `DailyCurationJob` touches surfaced listings. These jobs currently share the same small server and Postgres instance as public traffic.

External research as of 2026-05-16:

- Hetzner's April 1, 2026 cloud price adjustment still leaves small servers cheap, but prices increased across server, object storage, volume, and snapshot products. Official docs list Germany/Finland CX and CPX instances from roughly €3.99-€50.49/month after the adjustment, with snapshots at €0.0143/GB/month and object storage base price at €6.49/month. Source: <https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/>
- Hetzner server backups are disk-level backups with up to seven backup slots. They are useful for whole-server recovery, but they are not the same thing as Postgres point-in-time recovery. Source: <https://docs.hetzner.com/cloud/servers/backups-snapshots/overview/>
- Supabase Pro is currently advertised at $25/month, includes daily backups with 7-day retention, and offers PITR as an add-on for Pro/Team/Enterprise projects. Source: <https://supabase.com/pricing> and <https://supabase.com/docs/guides/platform/backups>
- Neon emphasizes autoscaling, storage that grows automatically, branches, and restore windows/instant restore. Source: <https://neon.com/pricing>
- Crunchy Bridge includes physical backups with WAL streaming and 10 days of retained backups that can restore a fork to a minute in history; production Standard plans start materially higher than hobby plans. Source: <https://docs.crunchybridge.com/concepts/backups> and <https://docs.crunchybridge.com/concepts/plans-pricing>

## What "Managed Postgres" Means

Managed Postgres means Postgres is still Postgres, but another provider operates the database infrastructure: provisioning, storage, backups, monitoring, maintenance windows, upgrades, and often point-in-time recovery, connection pooling, replication, and failover options.

It does not automatically mean "zero risk" or "always cheap." You still choose recovery objectives, pay for retention/compute/storage, test restores, and design the app's connection behavior. The practical question is: which risks are worth paying someone else to own now?

For Milkcrate, the most important managed-database value is not scale first. It is recovery and operator time. A store's catalog, sync state, waitlist/applications, curation state, and future paid tier data should not live only on the same VM that serves web traffic.

## Topic Axes

- Database durability and recovery
- Vendor storefront read performance
- Background job isolation and rate limits
- Cost tiers and scaling path
- Operational observability and drills

## Ranked Ideas

### 1. Hybrid Hosting: Keep Kamal/Hetzner, Move Primary Postgres to Managed Postgres

**Description:** Keep the Rails app on Kamal because it is cheap, understandable, and already working. Move only the primary Postgres workload to a managed provider, then point Rails at `DATABASE_URL` or equivalent production credentials. Keep the rest of the deployment simple until traffic proves otherwise.

**Axis:** Database durability and recovery

**Basis:** direct: `config/deploy.yml` currently runs Postgres as a Kamal accessory on the same Hetzner host as web; external: Supabase/Neon/Crunchy Bridge all offer managed Postgres paths with backup/restore features.

**Rationale:** This removes the worst single-box failure mode without forcing a full platform migration. It also lets you keep Hetzner's low compute cost while paying only for the part where operational mistakes are expensive.

**Downsides:** Monthly cost rises from "one cheap VPS" to "VPS plus database." Latency depends on provider region. Rails' separate `primary`, `cache`, `queue`, and `cable` databases need a clear migration choice: all on managed Postgres, or primary managed while cache/queue/cable remain local/replaceable.

**Confidence:** 88%

**Complexity:** Medium

**Status:** Unexplored

### 2. Treat Backups as a Two-Layer System: Provider PITR Plus Independent Offsite Dumps

**Description:** Use managed Postgres PITR or daily backups as the first recovery layer, then add independent scheduled logical backups (`pg_dump`) to object storage as the second layer. Add a small restore drill checklist and run it quarterly or before each launch push.

**Axis:** Database durability and recovery

**Basis:** external: Hetzner server backups are disk snapshots with seven slots, while Supabase and Crunchy Bridge docs distinguish daily backups/PITR-style recovery. reasoned: a provider backup protects against disk/server failure and most operator mistakes, but an independent dump protects against provider account mistakes, retention surprises, and "we thought backups worked" failures.

**Rationale:** This gives robust backup posture without immediately paying for high availability. For Milkcrate's stage, tested restore ability is more valuable than theoretical failover.

**Downsides:** Logical backups can be slower as the database grows and may not restore roles/extensions exactly. Someone has to own monitoring backup freshness and occasionally proving restores work.

**Confidence:** 92%

**Complexity:** Low

**Status:** Unexplored

### 3. Materialize Per-Store Storefront Snapshots After Curation

**Description:** Generate a durable storefront payload per store after sync/enrichment/curation, then serve public storefront pages mostly from that snapshot instead of recomputing crates on every request. The snapshot can live in Postgres first; later it can be mirrored to object storage or cached at the edge.

**Axis:** Vendor storefront read performance

**Basis:** direct: `StoresController#render_store` currently calls `StorefrontCuration.new(...).crates` and serializes all records per request; `StorefrontCuration` loads eligible listings and scores in Ruby.

**Rationale:** Milkcrate's storefronts are naturally cacheable. A store catalog changes on sync cadence, not every page view. Precomputing turns the public path from "query/score/serialize" into "read latest snapshot," which is cheaper per vendor and easier to cache/CDN.

**Downsides:** Requires invalidation semantics and a fallback when a store has no fresh snapshot. Snapshot schema can drift with frontend props if not tested.

**Confidence:** 90%

**Complexity:** Medium

**Status:** Unexplored

### 4. Split Background Work Into a Kamal Worker Role With Vendor-Aware Budgets

**Description:** Stop running queue work inside Puma for production. Add a separate Kamal worker role for Solid Queue, then enforce per-store sync/enrichment concurrency and schedule budgets so one vendor's inventory or API delay cannot degrade every storefront.

**Axis:** Background job isolation and rate limits

**Basis:** direct: `config/deploy.yml` sets `SOLID_QUEUE_IN_PUMA=true`; `EnrichmentService` sleeps for Discogs/MusicBrainz rate limits; `DailyCurationJob` currently iterates all stores when no store ID is passed.

**Rationale:** This preserves affordability because it can still run on the same server at first, then move to a second cheap server only when needed. The architectural boundary is the important part: web latency should not depend on long-running enrichment sleeps.

**Downsides:** Slightly more Kamal configuration and process monitoring. Solid Queue still uses Postgres, so job volume can still pressure the database until queue/cache strategy is revisited.

**Confidence:** 86%

**Complexity:** Medium

**Status:** Unexplored

### 5. Define a Cost Ladder Before Buying Infrastructure

**Description:** Write a simple scale ladder with hard trigger points: current single-box baseline; managed Postgres; cached storefront snapshots; separate worker; larger app server; read replica/CDN; HA database. Tie each step to measurable symptoms like p95 storefront render time, database CPU, backup RPO/RTO, job lag, active vendors, and monthly recurring revenue.

**Axis:** Cost tiers and scaling path

**Basis:** direct: current strategy names a freemium model and vendor onboarding; external: managed database costs range from low monthly plans to much higher production tiers; reasoned: affordability comes from delaying expensive steps until a metric says they are buying down a real bottleneck.

**Rationale:** This prevents both failure modes: staying too cheap until data is at risk, and overbuying HA infrastructure before the product has enough vendors to justify it.

**Downsides:** Requires discipline to maintain the ladder as real traffic arrives. Some thresholds will be guesses until baseline metrics exist.

**Confidence:** 84%

**Complexity:** Low

**Status:** Unexplored

### 6. Add a Tiny Ops Dashboard for Vendor Health and Recovery Readiness

**Description:** Extend the admin dashboard with per-store performance and operations signals: latest sync status, inventory count, enrichment backlog, latest curation timestamp, storefront snapshot age, average render time, database size, slow query count, and latest verified backup timestamp.

**Axis:** Operational observability and drills

**Basis:** direct: `CratePresenter#store_props` already exposes sync and enrichment status; `Store` tracks sync/enrichment state; admin presenters already exist under `app/presenters/admin`.

**Rationale:** Scaling decisions should be visible from the app's operational surface. Before paying for more infrastructure, you need to know which vendor is expensive, whether backups are fresh, and whether public pages are degrading.

**Downsides:** Metrics collection has to stay lightweight. Some values may need external sources from the database provider or backup job logs.

**Confidence:** 80%

**Complexity:** Medium

**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Rely on Hetzner server backups only | Useful for whole-server recovery, but not enough for database-grade PITR or independent recovery. |
| 2 | Add read replicas immediately | Expensive relative to current evidence; snapshot/caching work likely removes read pressure sooner. |
| 3 | Move the whole app to Render/Fly/Railway | Broad migration cost without first isolating the actual bottleneck and durability risk. |
| 4 | Shard every vendor into a separate database | Premature operational complexity for the current app and pricing stage. |
| 5 | Switch to SQLite/Litestream | Interesting for tiny apps, but fights the existing Rails/Postgres/Solid Queue/Solid Cache shape and multi-vendor trajectory. |
| 6 | Serve only static storefront files | Strong as a cache output, but too limiting as the primary architecture while onboarding/admin/sync workflows are still changing. |
| 7 | Buy production HA database immediately | Reliability benefit is real, but cost is likely ahead of current product risk; tested backups should come first. |
| 8 | Move Solid Cache, Queue, and Cable before measuring | May be right later, but the first problem is primary data durability and storefront read cost. |

## Recommended Exploration Order

1. Define backup targets: RPO, RTO, retention, and restore drill cadence.
2. Pick a managed Postgres candidate for a trial migration: likely Supabase/Neon for affordability, Crunchy Bridge if Postgres operational quality matters more than minimum cost.
3. Decide what happens to Rails' `primary`, `cache`, `queue`, and `cable` databases during that trial.
4. Prototype per-store storefront snapshots and measure request time/payload size before and after.
5. Split Solid Queue into a worker role and add per-store job budgets.
6. Add the cost ladder and ops dashboard so future upgrades are metric-driven.
