# Milkcrate

Milkcrate is a Rails app for browsing a Discogs seller's vinyl inventory as a set of curated crates. It syncs listings from Discogs, enriches releases with community and metadata signals, scores every record through a shared scoring engine, and presents the catalog through an Inertia React interface.

The public-facing app has:

- a marketing homepage at `/`
- a store application / waitlist form at `/apply`
- store crate pages at `/:slug` (a Discogs-style username), for example `/philadelphiamusic`
- a Discogs OAuth claim flow at `/:slug/authorize` — store owners can claim their store and unlock full-inventory sync
- a store owner dashboard at `/dashboard` — sync status, listing count, re-sync
- a development-only jobs dashboard at `/jobs`

## Current Shape

Milkcrate has a two-tier model for storefronts: a **free demo** using the public Discogs API and a **full OAuth storefront** for partnered stores.

**Free demo:** Any Discogs seller with a username gets an instant demo storefront at `/:slug`. The public API cap is 10,000 listings (100 pages × 100 records) — for small stores this is their full catalog; for large stores our scoring engine surfaces the most interesting records from whatever the API returns.

**OAuth storefront:** A store owner claims their store via `/:slug/authorize` and authorizes via Discogs OAuth 1.0a. This unlocks the Inventory Export API (full CSV, no 10k ceiling) and near-real-time sold-item detection via order polling. Stores must have 500+ vinyl listings to qualify.

The catalog flow:

1. Create a `Store` (via admin onboarding or OAuth claim).
2. Sync the store's Discogs inventory — paginated API for free-demo stores, CSV export for OAuth stores.
3. Import vinyl listings and mark missing listings as unavailable through `last_seen_at`.
4. Enrich releases with Discogs release metadata — genres, styles, images, tracklists, want counts, and have counts.
5. Run curation to build crates and stamp surfacing fields.
6. Render the storefront in the React frontend.

The domain models are `Store`, `Listing`, `Release`, `CuratedCrate`, `RecordScorer`, `StorefrontTheme` (per-store visual theming), `DiscogsShopper` (Discogs-authenticated shoppers), `StoreOwner` (store admins with OAuth sessions), and `Waitlist` (store applications).

The storefront shows a layered browsing experience:

- **Milkcrate Picks** — 12 genre-diverse, top-scored records across the full inventory, displayed as a wall of cover art.
- **Featured crates** — New Arrivals (most-recent window, scored) and a Daily Rotation (random style or genre theme, scored). Displayed 3-wide on desktop.
- **Genre crates** — one crate per primary genre, shown in a 4-wide grid. Each holds up to 50 records.
- **Crate view** — clicking any crate opens a card-stack browser with up/down navigation. Featured crates appear in the crate view tab bar alongside picks and genres.
- **Pile** — a client-side shopping list stored in `localStorage`.

All crates (picks, featured, and genre) are selected by a shared `RecordScorer` engine and wrapped in `CuratedCrate` containers with a uniform `CRATE_SIZE` cap and a `viable?` minimum threshold. Duplicate records are excluded top-down: picks exclude from featured, featured exclude from genre.

## Architecture

The curation layer is organized around a strategy pattern in `CrateStrategies`:

| Strategy                       | What it does                                                           |
| ------------------------------ | ---------------------------------------------------------------------- |
| `CrateStrategies::Picks`       | Scores the full inventory, applies genre-diversity caps, returns top N |
| `CrateStrategies::NewArrivals` | Finds the best recency window, scores matching records                 |
| `CrateStrategies::Thematic`    | Picks a random style or genre theme, filters to matches, scores        |
| `CrateStrategies::Genre`       | Builds one crate per primary genre, capped by genre                    |
| `CrateStrategies::HiddenGems`  | Surfaces high-score records from underrepresented genres               |

Each strategy includes `CrateStrategies::SelectionPipeline` (shared score-sort-take logic with ID exclusion and domain filtering) and implements `select(pool, excluded_ids:) -> [Listing]`. Results are scored via `RecordScorer`, sorted best-first, and uncapped — the caller applies `CuratedCrate::CRATE_SIZE`.

`RecordScorer` delegates to eight scoring strategies as service objects, each in `app/services/score_strategies/`:

| Strategy               | What it does                                                 |
| ---------------------- | ------------------------------------------------------------ |
| `VintageStrategy`      | Year-based bonus (older records score higher)                |
| `ConditionStrategy`    | Bonus for mint / NM / VG+ condition                          |
| `DesirabilityStrategy` | Discogs want/have ratio and total signal                     |
| `CoverQualityStrategy` | Deranks listings where `cover_image_url == thumbnail_url`    |
| `MetadataStrategy`     | Penalizes sparse tracklist or missing metadata               |
| `FreshnessStrategy`    | Penalizes recently-surfaced records, boosts new inventory    |
| `NoiseStrategy`        | Deterministic daily noise for rotation variety               |
| `PriceStrategy`        | Small boost for records priced $5+ (commercial value signal) |

`StorefrontCuration` orchestrates the strategies, builds `CuratedCrate` containers, and handles top-down deduplication. `CratePresenter` serializes crates into the frontend props.

For documented solutions and patterns, see `docs/solutions/`.

## Stack

- Ruby `3.4.8`
- Rails `~> 8.1`
- Node `23.11.0`
- PostgreSQL
- Inertia Rails + React + TypeScript
- Vite via `vite_rails`
- Tailwind via `tailwindcss-rails`
- Framer Motion for animations
- Solid Queue / Solid Cache / Solid Cable
- Mission Control for job monitoring
- RSpec + FactoryBot + Capybara
- Vitest for frontend component tests
- Brakeman, bundler-audit, RuboCop for security and style

## Prerequisites

- Ruby `3.4.8`
- Bundler
- Node and npm
- Docker with Docker Compose
- a Discogs personal access token

## Environment

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required variables:

- `DISCOGS_TOKEN` — Discogs API token for inventory sync and release enrichment.
- `DB_HOST` — local Postgres host. Use `127.0.0.1` for the compose setup.
- `DB_PORT` — local Postgres port. The compose setup defaults to `5433`.
- `DB_USER` — local Postgres username.
- `DB_PASSWORD` — local Postgres password.
- `MILKCRATE_USER` — production HTTP basic auth username.
- `MILKCRATE_PASSWORD` — production HTTP basic auth password.
- `TURNSTILE_ENABLED` — set to `true` to require Cloudflare Turnstile on waitlist submissions.
- `TURNSTILE_SITE_KEY` — Cloudflare Turnstile public site key.
- `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile secret key.
- `PLAUSIBLE_DOMAIN` — domain for the Plausible analytics script.

Development and test environments do not prompt for HTTP basic auth. Production uses a temporary basic auth gate until real app auth replaces it.

Turnstile is disabled unless `TURNSTILE_ENABLED=true`. When enabled, only `POST /waitlist` is protected; public SEO pages remain crawlable.

## Local Setup

Start Postgres:

```bash
docker compose up -d postgres
```

Install JavaScript dependencies:

```bash
npm install
```

Install Ruby dependencies and prepare the database:

```bash
bin/setup
```

`bin/setup` will install gems, run `bin/rails db:prepare`, clear logs and temp files, and start `bin/dev` unless `--skip-server` is passed.

To set up without starting the dev server:

```bash
bin/setup --skip-server
```

To reset the database during setup:

```bash
bin/setup --reset --skip-server
```

The local databases are `milkcrate_development` and `milkcrate_test`.

Stop Postgres with:

```bash
docker compose down
```

## Running The App

With Postgres running:

```bash
bin/dev
```

`bin/dev` starts Rails, Tailwind watcher, Solid Queue worker, and the Vite dev server.

The app runs at [http://localhost:3000](http://localhost:3000).

Useful local routes:

| Route                                      | Description                                              |
| ------------------------------------------ | -------------------------------------------------------- |
| `/`                                        | Marketing homepage                                       |
| `/apply`                                   | Store application / waitlist form                        |
| `/:slug`                                   | Any store by Discogs username, e.g. `/philadelphiamusic` |
| `/:slug/authorize`                         | Start Discogs OAuth claim flow for a store               |
| `/auth/discogs/callback`                   | Discogs OAuth callback (internal, no direct visit)       |
| `/dashboard`                               | Store owner dashboard (requires OAuth session)           |
| `/dashboard/resync`                        | Trigger store re-sync from dashboard                     |
| `/dashboard/signup`                        | Begin store onboarding from dashboard                    |
| `/api/discogs/lookup/:username`            | API endpoint for Discogs username lookup                 |
| `/auth/discogs/shopper/authorize`          | Shopper Discogs authorization                            |
| `/auth/discogs/shopper/disconnect`         | Disconnect shopper Discogs account                       |
| `/pile/add_to_wantlist`                    | Add pile items to Discogs wantlist                       |
| `/admin`                                   | Admin dashboard — store onboarding, Discogs lookup       |
| `/admin/discogs_lookup`                    | Discogs username lookup for store onboarding             |
| `/admin/onboarding`                        | Direct store onboarding                                  |
| `/admin/waitlists/:waitlist_id/onboarding` | Onboard a waitlisted store                               |
| `/jobs`                                    | Mission Control jobs dashboard (development only)        |
| `/dev/login-as/:id`                        | Dev tool — set store owner session (development only)    |

## Store Data

The demo store used by local previews and demo-oriented maintenance tasks is configured in `config/settings.yml`:

```yml
demo_store:
  name: Philadelphia Music
  discogs_username: philadelphiamusic
  description:
```

Demo-oriented rake tasks use `Settings.demo_store.discogs_username` to find that store. `db/seeds.rb` is currently empty — create the local demo store from the Rails console if it does not exist:

```ruby
Store.find_or_create_by!(discogs_username: "philadelphiamusic") do |store|
  store.name = "Philadelphia Music"
  store.description = "Independent record store in South Philly."
end
```

## Sync And Curation

The main jobs:

- **`SyncAllStoresJob`** — runs a full sync for every store in the database (used by the production recurring schedule). Routes OAuth stores to `CsvExportSyncJob`.
- **`FullStoreSyncJob`** — imports a seller's Discogs inventory via paginated API for free-demo stores, or delegates to `CsvExportSyncJob` for OAuth-authorized stores.
- **`CsvExportSyncJob`** — triggers a Discogs CSV inventory export, polls for completion, downloads and parses the CSV, upserts listings. Only runs for OAuth-authorized stores.
- **`EnrichmentJob`** — fetches Discogs release metadata and MusicBrainz images for imageless releases.
- **`DailyCurationJob`** — builds picks, featured crates, and genre crates, then stamps surfacing fields.

Per-store operations (replaces the deprecated `milkcrate:` namespace):

```bash
bin/rails stores:sync[username]              # Full inventory sync from Discogs
bin/rails stores:enrich[username]            # Enrich releases: Discogs metadata + MusicBrainz images
bin/rails stores:curate[username]            # Run daily curation (stamp last_surfaced_at, compute picks)
bin/rails stores:score[username,listing_id]  # Score breakdown for a listing
bin/rails stores:stats[username]             # Print curation and enrichment stats
bin/rails stores:add[username]               # Onboard a new store (create Store + kick off sync)
bin/rails stores:reset_surfacing[username]   # Reset surfacing data (dev/testing only)
bin/rails stores:discogs_identity[username]  # Refresh a store's stored Discogs profile ID
```

Experiment tools for curation research:

```bash
bin/rails experiment:generate[crate-name]    # Generate a crate of top-scored records for labeling
bin/rails experiment:serve[crate-name]       # Start a local labeling page server
bin/rails experiment:report[crate-name]      # Generate experiment report from labels
bin/rails experiment:analyze                 # Cross-crate pattern analysis
```

Dev environment lifecycle:

```bash
bin/rails tools:start                        # Start Docker, create DB, load sample data
bin/rails tools:stop                         # Stop Docker services (preserves data)
bin/rails tools:clean                        # Stop Docker and remove volumes (destroys data)
bin/rails tools:load                         # Load sample data from db/sample/listings.jsonl
bin/rails tools:capture                      # Capture sample data from a synced store
```

Production recurring jobs are configured in `config/recurring.yml`.

## Frontend

The frontend lives in `app/frontend` as an Inertia React app with TypeScript.

Key pages:

- `app/frontend/pages/home.tsx` — marketing homepage
- `app/frontend/pages/apply.tsx` — waitlist form
- `app/frontend/pages/stores/show.tsx` — store page, switches between `StoreFloor` (home) and `CrateView` (crate browser)
- `app/frontend/pages/stores/invitation.tsx` — store invitation page (shown pre-sync)
- `app/frontend/pages/dashboard/index.tsx` — store owner dashboard (sync status, re-sync, stats)
- `app/frontend/pages/admin/dashboard.tsx` — admin dashboard for store management

Key components:

| Component                     | Role                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `StoreFloor`                  | Renders picks wall, featured crates row, and genre grid                        |
| `FeaturedCratesRow`           | 3-wide featured crate cards (New Arrivals, Daily Rotation)                     |
| `GenreGrid`                   | 4-wide grid of genre crate cards                                               |
| `CrateCard`                   | Preview card — shows 4 cover images, crate name, and record count              |
| `CrateView`                   | Full crate browser — card stack with up/down navigation, desktop details panel |
| `CrateTabs`                   | Tab bar for switching between crates (picks, featured, genres)                 |
| `CrateShelf`                  | Full-width shelf layout for horizontal crate card rows                         |
| `RecordCard`                  | Single record display with cover art and flip-to-details on mobile             |
| `RecordTile`                  | Compact grid tile for records inside a crate                                   |
| `RecordDetails`               | Mobile details panel with tracklist and metadata                               |
| `PileSheet`                   | Client-side pile drawer, stored in `localStorage` under `mc-pile`              |
| `BrandMark`                   | Milkcrate logo component                                                       |
| `GhostFingerCue`              | Animated tutorial cue for first-time visitors                                  |
| `StorefrontMotionConfig`      | Shared Framer Motion configuration for store animations                        |
| `ui/Action`                   | Action trigger with loading state                                              |
| `ui/Badge`                    | Reusable badge component                                                       |
| `ui/Button`                   | Reusable button component                                                      |
| `ui/Card`                     | Reusable card component                                                        |
| `ui/EmptyState`               | Empty state placeholder with icon and message                                  |
| `ui/FeedbackMessage`          | Success/error/info feedback message                                            |
| `ui/Field`                    | Form field wrapper with label and errors                                       |
| `ui/JobProgressBar`           | Job progress indicator                                                         |
| `ui/Metric`                   | Metric display with label and value                                            |
| `ui/SectionHeader`            | Section header with optional description                                       |
| `ui/StatusDot`                | Status indicator dot                                                           |
| `discogs_connection_controls` | Discogs OAuth connection UI for store dashboard                                |
| `discogs_seller_lookup_input` | Discogs username lookup for store onboarding                                   |
| `score_breakdown`             | Detailed score breakdown display                                               |

Run frontend tests:

```bash
npm run test:frontend       # Node test runner
npm run test:components     # Vitest + React Testing Library
```

## Tests And Checks

```bash
bundle exec rspec           # Rails test suite (RSpec + FactoryBot + Capybara)
npm run test:frontend       # Frontend Node tests
npm run test:components     # Frontend component tests (Vitest)
npm run typecheck           # TypeScript type checking (tsc --noEmit)
bundle exec rubocop         # Ruby style checks
bundle exec brakeman --no-pager  # Security analysis
bundle exec bundler-audit   # Dependency vulnerability scan
bin/ci                      # Project CI script (setup, RuboCop, bundler-audit, Brakeman)
```

## Experiments & Sample Data

Experiment generator and analysis tools for curation research:

- `lib/tasks/experiment.rake` — `experiment:generate`, `experiment:serve`, `experiment:report`, `experiment:analyze`
- `app/services/experiments/seed_generator.rb` — generates scored record sets for labeling
- `db/sample/listings.jsonl` — sample data captured from a synced store (1000 listings)
- `lib/tasks/tools.rake` — dev lifecycle: `tools:start`, `tools:stop`, `tools:load`, `tools:capture`
