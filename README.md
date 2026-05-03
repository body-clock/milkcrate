# Milkcrate

Milkcrate is a Rails app for browsing a Discogs seller's vinyl inventory as a set of curated crates. It syncs listings from Discogs, enriches releases with community and metadata signals, scores records for a "Milkcrate Picks" crate, and presents the catalog through an Inertia React interface.

The public-facing app currently has:

- a marketing homepage at `/`
- a store application / waitlist form at `/apply`
- store crate pages at `/:discogs_username`, for example `/philadelphiamusic`
- a development-only jobs dashboard at `/jobs`

This README is for local development and basic project operation.

## Current Shape

Milkcrate is centered on one configured Discogs seller for now. The default seller is configured through `config/settings.yml` and can be overridden per environment with Config gem settings or environment-specific settings files.

The catalog flow is:

1. Create a `Store`.
2. Sync that store's Discogs seller inventory.
3. Import vinyl listings and mark missing listings as unavailable through `last_seen_at`.
4. Enrich releases with Discogs release metadata, including genres, styles, images, tracklists, want counts, and have counts.
5. Run curation to stamp surfaced records and support surfacing history.
6. Render store crates in the React frontend.

The main browsing experience is the store page. It shows:

- store name, description, listing count, and sync state
- a "Milkcrate Picks" crate with 12 scored records
- genre crates built from available LP / album listings
- a local browser pile powered by `localStorage`

The older server-backed dig-session UI and rotation-oriented store flow are not part of the active route surface right now, though some legacy models and views still exist in the codebase.

## Stack

- Ruby `3.4.8`
- Rails `8.1`
- PostgreSQL
- Inertia Rails + React
- Vite via `vite_rails`
- Tailwind via `tailwindcss-rails`
- Solid Queue / Solid Cache / Solid Cable
- RSpec + FactoryBot + Capybara
- Vitest / Node test runner for frontend tests
- Brakeman, bundler-audit, and RuboCop for security and style checks

## Prerequisites

Install these before setup:

- Ruby `3.4.8`
- Bundler
- Node and npm
- Docker with Docker Compose support
- a Discogs personal access token

## Environment

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required variables:

- `DISCOGS_TOKEN` - Discogs API token used for inventory sync and release enrichment.
- `DB_HOST` - local Postgres host. Use `127.0.0.1` for the compose setup.
- `DB_PORT` - local Postgres port. The compose setup defaults to `5433`.
- `DB_USER` - local Postgres username.
- `DB_PASSWORD` - local Postgres password.
- `MILKCRATE_USER` - production HTTP basic auth username.
- `MILKCRATE_PASSWORD` - production HTTP basic auth password.
- `TURNSTILE_ENABLED` - set to `true` to require Cloudflare Turnstile on waitlist submissions.
- `TURNSTILE_SITE_KEY` - Cloudflare Turnstile public site key used by the `/apply` page.
- `TURNSTILE_SECRET_KEY` - Cloudflare Turnstile secret key used to verify waitlist submissions.

Development and test do not prompt for HTTP basic auth. Production keeps the temporary basic auth gate until real app auth replaces it.

Turnstile is disabled unless `TURNSTILE_ENABLED=true`. When enabled, only `POST /waitlist` is protected; public SEO pages remain crawlable and should be protected at the Cloudflare edge with bot rules instead of an app-level challenge.

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

`bin/setup` will:

- install gems when needed
- run `bin/rails db:prepare`
- clear logs and temp files
- start `bin/dev` unless `--skip-server` is passed

To set up without starting the dev server:

```bash
bin/setup --skip-server
```

To reset the database during setup:

```bash
bin/setup --reset --skip-server
```

The local databases are:

- `milkcrate_development`
- `milkcrate_test`

Stop Postgres with:

```bash
docker compose down
```

## Running The App

With Postgres running, start the full local development stack:

```bash
bin/dev
```

`bin/dev` starts:

- Rails server
- Tailwind watcher
- Solid Queue worker via `bin/jobs`
- Vite dev server

The app runs at [http://localhost:3000](http://localhost:3000).

Useful local routes:

- `/` - marketing homepage
- `/apply` - store application / waitlist form
- `/philadelphiamusic` - default demo store page, once that store exists locally
- `/jobs` - Mission Control jobs dashboard in development

## Store Data

The default store is configured in `config/settings.yml`:

```yml
store_name: Philadelphia Music
discogs_username: philadelphiamusic
store_description:
```

Most operational rake tasks use `Settings.discogs_username` to find the store. `db/seeds.rb` is currently empty, so create the local store from the Rails console if it does not exist yet:

```bash
bin/rails console
```

```ruby
Store.find_or_create_by!(discogs_username: "philadelphiamusic") do |store|
  store.name = "Philadelphia Music"
  store.description = "Independent record store in South Philly."
end
```

## Sync And Curation

The main jobs are:

- `FullStoreSyncJob` - imports a seller's Discogs inventory, then queues enrichment and curation.
- `EnrichReleasesJob` - fetches Discogs release data and updates matching listings.
- `DailyCurationJob` - selects picks and genre records, then stamps surfacing fields.

Useful rake tasks:

```bash
bin/rails milkcrate:sync
```

Full inventory sync, then queue enrichment and curation.

```bash
bin/rails milkcrate:sync:quick
```

Sync the first Discogs inventory page, enrich those releases synchronously, then curate. This is the fastest path for local development.

```bash
bin/rails milkcrate:setup
```

Bootstrap a fresh install with a full sync, synchronous enrichment, and curation.

```bash
bin/rails milkcrate:curate
```

Run curation for the configured store.

```bash
bin/rails milkcrate:stats
```

Print inventory, LP, surfacing, and genre counts.

```bash
bin/rails milkcrate:score[LISTING_ID]
```

Print a score breakdown for one listing.

Production recurring jobs are configured in `config/recurring.yml`.

## Curation Logic

`PicksSelector` scores available LP / album listings using:

- vintage year bonus
- condition bonus
- small-genre section boost
- Discogs want / have desirability signals
- sparse metadata penalty
- freshness and recently-surfaced penalties
- deterministic daily noise

`CratePresenter` builds the frontend crate payload:

- `Milkcrate Picks` from the top scored records
- one crate per primary genre, excluding records already shown in picks

Available listings are records with `last_seen_at > 3.days.ago`. LP / album listings require an explicit `LP` or `Album` format term and exclude non-vinyl media terms such as CD, cassette, DVD, and VHS.

## Frontend

The frontend lives in `app/frontend`.

Key files:

- `app/frontend/pages/home.tsx`
- `app/frontend/pages/apply.tsx`
- `app/frontend/pages/stores/featured.tsx`
- `app/frontend/components/*`
- `app/frontend/contexts/dig_session_context.tsx`

The current pile/dig-session behavior is client-side and stored in `localStorage` under `mc-dig-session`.

Run frontend tests with:

```bash
npm run test:frontend
npm run test:components
```

## Tests And Checks

Run the Rails test suite:

```bash
bundle exec rspec
```

Run frontend tests:

```bash
npm run test:frontend
npm run test:components
```

Run security and style checks:

```bash
bundle exec brakeman --no-pager
bundle exec rubocop
bundle exec bundler-audit
```

Run the project CI script:

```bash
bin/ci
```

`bin/ci` currently runs setup, RuboCop, bundler-audit, importmap audit, and Brakeman. It does not currently run the RSpec or frontend test suites.

## Corpus Tools

There are corpus import/export tasks and specs under:

- `lib/tasks/corpus.rake`
- `app/services/corpus/*`
- `db/corpus/discogs_store_snapshot.json`
- `spec/fixtures/files/discogs_store_snapshot.json`

These support repeatable local curation experiments against a stored Discogs inventory snapshot.
