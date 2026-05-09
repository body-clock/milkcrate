# Milkcrate

Milkcrate is a Rails app for browsing a Discogs seller's vinyl inventory as a set of curated crates. It syncs listings from Discogs, enriches releases with community and metadata signals, scores every record through a shared scoring engine, and presents the catalog through an Inertia React interface.

The public-facing app has:

- a marketing homepage at `/`
- a store application / waitlist form at `/apply`
- store crate pages at `/:discogs_username`, for example `/philadelphiamusic`
- a development-only jobs dashboard at `/jobs`

## Current Shape

Milkcrate is centered on one configured Discogs seller. The default seller is configured in `config/settings.yml` and can be overridden per environment.

The catalog flow:

1. Create a `Store`.
2. Sync that store's Discogs seller inventory.
3. Import vinyl listings and mark missing listings as unavailable through `last_seen_at`.
4. Enrich releases with Discogs release metadata — genres, styles, images, tracklists, want counts, and have counts.
5. Run curation to build crates and stamp surfacing fields.
6. Render the storefront in the React frontend.

The storefront shows a layered browsing experience:

- **Milkcrate Picks** — 12 genre-diverse, top-scored records across the full inventory, displayed as a wall of cover art.
- **Featured crates** — New Arrivals (most-recent window, scored) and a Daily Rotation (random style or genre theme, scored). Displayed 2-wide on desktop.
- **Genre crates** — one crate per primary genre, shown in a 4-wide grid. Each holds up to 50 records.
- **Crate view** — clicking any crate opens a card-stack browser with up/down navigation. Featured crates appear in the crate view tab bar alongside picks and genres.
- **Pile** — a client-side shopping list stored in `localStorage`.

All crates (picks, featured, and genre) are selected by a shared `RecordScorer` engine and wrapped in `CuratedCrate` containers with a uniform `CRATE_SIZE` cap and a `viable?` minimum threshold. Duplicate records are excluded top-down: picks exclude from featured, featured exclude from genre.

## Architecture

The curation layer is organized around a strategy pattern in `CrateStrategies`:

| Strategy | What it does |
|----------|-------------|
| `CrateStrategies::Picks` | Scores the full inventory, applies genre-diversity caps, returns top N |
| `CrateStrategies::NewArrivals` | Finds the best recency window, scores matching records |
| `CrateStrategies::Thematic` | Picks a random style or genre theme, filters to matches, scores |

Each strategy implements `select(pool, excluded_ids:) -> [Listing]`. Results are scored via `RecordScorer`, sorted best-first, and uncapped — the caller applies `CuratedCrate::CRATE_SIZE`.

`RecordScorer` scores every listing on seven dimensions:

- vintage year bonus
- condition bonus (mint / NM / VG+)
- small-genre section boost
- Discogs want / have desirability signals
- sparse metadata penalty
- freshness and recently-surfaced penalties
- cover quality (deranks listings where `cover_image_url == thumbnail_url`)
- deterministic daily noise

`StorefrontCuration` orchestrates the strategies, builds `CuratedCrate` containers, and handles top-down deduplication. `CratePresenter` serializes crates into the frontend props.

For documented solutions and patterns, see `docs/solutions/`.

## Stack

- Ruby `3.4.8`
- Rails `~> 8.1`
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

| Route | Description |
|-------|-------------|
| `/` | Marketing homepage |
| `/apply` | Store application / waitlist form |
| `/philadelphiamusic` | Default demo store, once that store exists locally |
| `/jobs` | Mission Control jobs dashboard (development only) |

## Store Data

The default store is configured in `config/settings.yml`:

```yml
store_name: Philadelphia Music
discogs_username: philadelphiamusic
store_description:
```

Most operational rake tasks use `Settings.discogs_username` to find the store. `db/seeds.rb` is currently empty — create the local store from the Rails console if it does not exist:

```ruby
Store.find_or_create_by!(discogs_username: "philadelphiamusic") do |store|
  store.name = "Philadelphia Music"
  store.description = "Independent record store in South Philly."
end
```

## Sync And Curation

The main jobs:

- **`FullStoreSyncJob`** — imports a seller's Discogs inventory, then queues enrichment and curation.
- **`EnrichReleasesJob`** — fetches Discogs release data and updates matching listings.
- **`DailyCurationJob`** — builds picks, featured crates, and genre crates, then stamps surfacing fields.

Useful rake tasks:

```bash
bin/rails milkcrate:sync        # Full inventory sync, queue enrichment and curation
bin/rails milkcrate:sync:quick  # Sync first Discogs page, enrich synchronously, curate
bin/rails milkcrate:setup       # Bootstrap: full sync + synchronous enrichment + curation
bin/rails milkcrate:curate      # Run curation for the configured store
bin/rails milkcrate:stats       # Print inventory, LP, surfacing, and genre counts
bin/rails milkcrate:score[ID]   # Print a score breakdown for one listing
```

Production recurring jobs are configured in `config/recurring.yml`.

## Frontend

The frontend lives in `app/frontend` as an Inertia React app with TypeScript.

Key pages:

- `app/frontend/pages/home.tsx` — marketing homepage
- `app/frontend/pages/apply.tsx` — waitlist form
- `app/frontend/pages/stores/featured.tsx` — store page, switches between `StoreFloor` (home) and `CrateView` (crate browser)

Key components:

| Component | Role |
|-----------|------|
| `StoreFloor` | Renders picks wall, featured crates row, and genre grid |
| `FeaturedCratesRow` | 2-wide featured crate cards (New Arrivals, Daily Rotation) |
| `GenreGrid` | 4-wide grid of genre crate cards |
| `CrateCard` | Preview card — shows 4 cover images, crate name, and record count |
| `CrateView` | Full crate browser — card stack with up/down navigation, desktop details panel |
| `CrateTabs` | Tab bar for switching between crates |
| `RecordCard` | Single record display with cover art and flip-to-details on mobile |
| `PileSheet` | Client-side pile drawer, stored in `localStorage` under `mc-pile` |

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
bundle exec rubocop         # Ruby style checks
bundle exec brakeman --no-pager  # Security analysis
bundle exec bundler-audit   # Dependency vulnerability scan
bin/ci                      # Project CI script (setup, RuboCop, bundler-audit, Brakeman)
```

## Corpus Tools

Corpus import/export tasks and specs for repeatable local curation experiments against a stored Discogs inventory snapshot:

- `lib/tasks/corpus.rake`
- `app/services/corpus/*`
- `db/corpus/discogs_store_snapshot.json`
- `spec/fixtures/files/discogs_store_snapshot.json`
