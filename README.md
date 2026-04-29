# Milkcrate

Milkcrate is a Rails app for digging through Discogs seller inventory locally. Each day the app features one store from a configured rotation, syncs that store's inventory from Discogs, builds a daily selection, surfaces a smaller set of "Milkcrate Picks", and lets you save records into dig sessions.

This README is only for local development.

## What The App Does

- Features one store per day from `config/stores.yml`
- Imports seller inventory from the Discogs API
- Filters inventory down to vinyl listings
- Generates a daily rotating selection for the featured store
- Scores a smaller "Milkcrate Picks" set for quick browsing
- Lets you save records into a dig session and review past sessions

## Algorithm Status

Current curation behavior is intentionally simple and still in active refinement.

`DailySelectionService` currently mixes:

- recent arrivals
- good-condition records
- discovery styles
- unseen inventory from the last week

`PicksSelector` currently boosts:

- discovery styles
- multi-genre crossover
- vintage records
- good-condition copies
- records from tiny sections
- discovery records buried inside crowded sections

Working notes for the picks algorithm live in [docs/milkcrate-picks-algorithm-research.md](docs/milkcrate-picks-algorithm-research.md).

Current gaps:

- condition text is not yet normalized beyond a small allowlist
- picks can still over-reward obvious catalog anchors
- low-information listings do not yet receive a penalty

## Stack

- Ruby `3.4.8`
- Rails `8.1`
- PostgreSQL
- Hotwire (`turbo-rails`, `stimulus-rails`)
- Tailwind via `tailwindcss-rails`
- Solid Queue / Solid Cache / Solid Cable
- RSpec + FactoryBot + Capybara

## Prerequisites

Install these before setup:

- Ruby `3.4.8`
- Bundler
- Docker with Docker Compose support

You will also need a Discogs personal access token.

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required variables:

- `DISCOGS_TOKEN`
  Used for inventory sync and release enrichment.
- `DB_HOST`
  Local Postgres host. Use `127.0.0.1` for the compose setup.
- `DB_PORT`
  Local Postgres port. The example setup uses `5433` to avoid colliding with another local Postgres instance.
- `DB_USER`
  Local Postgres username.
- `DB_PASSWORD`
  Local Postgres password.
- `MILKCRATE_USER`
  Production HTTP basic auth username for the app.
- `MILKCRATE_PASSWORD`
  Production HTTP basic auth password for the app.

Development and test do not challenge with HTTP basic auth. Production keeps the temporary basic auth gate until app auth is replaced.

## Local Setup

Start Postgres first:

```bash
docker compose up -d postgres
```

The compose file binds the container's Postgres port to `${DB_PORT}` on the host and defaults to `5433`.

Then install dependencies and prepare the database:

```bash
bin/setup
```

`bin/setup` will:

- install gems
- run `bin/rails db:prepare`
- clear old logs and temp files
- start the dev processes unless you pass `--skip-server`

If you only want setup without starting the app:

```bash
bin/setup --skip-server
```

The local databases are:

- `milkcrate_development`
- `milkcrate_test`

To stop the database later:

```bash
docker compose down
```

## Running The App

With the Postgres container running, start the full local development stack with:

```bash
bin/dev
```

That starts:

- Rails server
- Tailwind watcher
- local job worker via `bin/jobs`

By default the app runs on [http://localhost:3000](http://localhost:3000).

When you open it, the app will prompt for HTTP basic auth using the credentials from `.env`.

## Local Workflow

### 1. Add a Store

Open the app, add a store, and enter:

- store name
- Discogs seller username

Creating a store enqueues `FullStoreSyncJob`, which imports inventory in the background.

### 2. Put The Store In Rotation

The homepage only shows stores listed in `config/stores.yml`.

Add an entry like this:

```yml
- username: philadelphiamusic
  name: Philadelphia Music
  description: Independent record store in South Philly. Deep soul, jazz, and funk sections built over decades of digging.
```

The `username` must match an existing `Store#discogs_username`.

### 3. Browse The Featured Store

The root page shows the featured store for the current day and builds sections from the synced catalog:

- `Milkcrate Picks`
- `New Arrivals`
- genre sections from the daily selection

If the store is still syncing, the featured page will show a waiting state.

### 4. Use Dig Sessions

Dig sessions let you collect records while browsing, then revisit or close the session later.

Relevant pages:

- `/` for the featured store
- `/dig_sessions` for saved sessions
- `/jobs` in development for job visibility
- `/lookbook` in development for component previews

## Background Jobs

The app depends on background jobs during local development.

Main jobs:

- `FullStoreSyncJob`
  Imports a seller's inventory from Discogs and triggers daily selection generation.
- `GenerateDailySelectionsJob`
  Builds the current day's selection for the featured store.
- `EnrichListingsJob`
  Fetches release metadata such as genres, styles, images, and tracklists.
- `PrepNextFeaturedStoreJob`
  Preps tomorrow's featured store when scheduled.

`bin/dev` starts the local job worker, so you usually do not need a separate command.

## Tests

Run the test suite with:

```bash
bundle exec rspec
```

## Local Corpus Workflow

To avoid repeated high-volume Discogs API calls during local resets, Milkcrate supports a committed JSON corpus snapshot.

- Seed from committed snapshot:

  ```bash
  bin/rails corpus:seed
  ```

- Refresh snapshot manually from Discogs:

  ```bash
  bin/rails "corpus:refresh[philadelphiamusic,20]"
  ```

- Inspect snapshot composition:

  ```bash
  bin/rails corpus:stats
  ```

The snapshot lives at `db/corpus/discogs_store_snapshot.json` and should remain metadata-only (no binary assets).

There is also a CI helper:

```bash
bin/ci
```

## Notes For Developers

- Local development uses `docker-compose.yml` only for Postgres. The Rails server, Tailwind watcher, and job worker still run on the host via `bin/dev`.
- This repo also includes a production `Dockerfile` and Kamal config, which are separate from the local development flow.
- `config/recurring.yml` defines recurring jobs for production; local development usually relies on manual actions and the running job worker.
- Store rotation is file-driven. If a store exists in the database but not in `config/stores.yml`, it will not appear on the homepage.
- Inventory import is Discogs-rate-limited by design, so large syncs and enrichment runs can take a while.
