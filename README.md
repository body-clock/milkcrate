# [milkcrate.fm](https://milkcrate.fm/explore)

A Rails app for browsing a Discogs seller's vinyl inventory as curated crates. Syncs listings from Discogs, enriches releases with community and metadata signals, scores every record through a shared scoring engine, and presents the catalog through an Inertia React interface.

## Quick Start

```bash
docker compose up -d postgres
npm install
bin/setup
```

The app runs at [http://localhost:3000](http://localhost:3000).

See [Local Setup](#local-setup) for details.

## Environment

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

Required: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`. Secrets (Discogs API, Turnstile, SMTP) live in `config/credentials.yml.enc` — edit with `bin/rails credentials:edit`.

## Local Setup

Start Postgres, install deps, and boot:

```bash
docker compose up -d postgres
npm install
bin/setup
```

`bin/setup` installs gems, prepares the database, and starts `bin/dev`. Use `bin/setup --skip-server` to skip the server, `bin/setup --reset --skip-server` to reset the database.

`bin/dev` starts Rails, Tailwind watcher, Solid Queue worker, and Vite dev server.

## Tests

```bash
bundle exec rspec              # Rails tests
npm run test:frontend          # Frontend lib tests
npm run test:components        # Vitest component tests
npm run typecheck              # TypeScript type checking
bin/ci                         # Full CI script (RuboCop, bundler-audit, Brakeman)
```

## Rake Tasks

Per-store operations:

```bash
bin/rails stores:sync[username]              # Full inventory sync from Discogs
bin/rails stores:enrich[username]            # Enrich releases with metadata
bin/rails stores:re_enrich[username]         # Force re-enrichment
bin/rails stores:curate[username]            # Run daily curation
bin/rails stores:score[username,listing_id]  # Score breakdown for a listing
bin/rails stores:stats[username]             # Curation and enrichment stats
bin/rails stores:add[username]               # Onboard a new store
```

Dev lifecycle:

```bash
bin/rails tools:start     # Start Docker, create DB, load sample data
bin/rails tools:stop      # Stop Docker (preserves data)
bin/rails tools:clean     # Stop Docker and remove volumes
bin/rails tools:load      # Load sample data from db/sample/listings.jsonl
bin/rails tools:capture   # Capture sample data from a synced store
```

## Architecture

Key directories:

- `app/services/crate_strategies/` — crate selection strategies (Wall, NewArrivals, Thematic, Genre, HiddenGems)
- `app/services/score_strategies/` — scoring strategies (Vintage, Condition, Desirability, CoverQuality, Metadata, Freshness, Noise, Price)
- `app/services/store_sync/` — inventory sync pipeline
- `app/services/store_sales/` — order polling and sold-item detection
- `app/frontend/pages/` — Inertia React pages
- `app/frontend/components/` — React components
- `lib/tasks/` — rake tasks

## Stack

Ruby 3.4.8 · Rails 8.1 · Node 23.11.0 · PostgreSQL · Inertia Rails + React + TypeScript · Vite · Tailwind · Framer Motion · Solid Queue / Solid Cache / Solid Cable · Kamal (deploy to Hetzner)

## Deploy

Pushes to `main` trigger a GitHub Actions workflow that builds a Docker image, pushes to ghcr.io, and deploys via Kamal to the Hetzner server. See `.github/workflows/deploy.yml` and `config/deploy.yml`.
