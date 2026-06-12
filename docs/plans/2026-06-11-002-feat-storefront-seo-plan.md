---
title: "feat: Comprehensive SEO optimization for storefront and public pages"
type: feat
status: active
date: 2026-06-11
origin: docs/superpowers/specs/2026-06-11-seo-optimization-design.md
---

# feat: Comprehensive SEO optimization for storefront and public pages

## Summary

Enable organic search discovery of all milkcrate public pages by enabling Inertia SSR, adding sitemaps and robots.txt, expanding structured data with genre-aware and location-aware metadata, adding canonical URLs, scraping Discogs seller locations, implementing genre diversity detection for keyword-optimized store pages, tracking outbound Discogs clicks with UTM parameters, and writing LLMs.txt for AI crawlers. All SEO metadata flows through Rails controllers as the single source of truth via `SeoHelper` + `content_for :head`.

---

## Problem Frame

Milkcrate has zero SEO optimization. The site does not appear in search results for any relevant query ("Philadelphia record stores", "techno vinyl records", "vinyl record discovery"). Crawlers receive empty HTML because Inertia SSR is disabled; there is no sitemap; robots.txt is an empty comment; structured data exists in an unused partial; and no conversion tracking measures organic-to-Discogs traffic. The layout has `yield :head` and `content_for(:title)` wired but no controller populates them.

See origin doc for full product framing, keyword targeting strategy, and page-level SEO specifications.

---

## Requirements

- **R1.** Every public page outputs a unique `<title>`, `<meta name="description">`, Open Graph tags, Twitter card, and `<link rel="canonical">`
- **R2.** Store pages (`/:slug`) output genre-aware titles and descriptions: narrow stores (80%+ one genre) use genre-specific SEO, broad stores use multi-genre SEO
- **R3.** Store pages with verified Philadelphia location from Discogs get location-aware meta descriptions
- **R4.** All public pages output page-appropriate JSON-LD structured data: `Organization` + `WebSite` on home, `ItemList` on explore, `LocalBusiness` + `ItemList` + `BreadcrumbList` on store pages
- **R5.** Inertia SSR is enabled so crawlers and non-JS clients receive fully-rendered HTML
- **R6.** A dynamic `sitemap.xml` lists all public routes and is regenerated on deploy and daily
- **R7.** `robots.txt` allows all crawlers on public routes, disallows admin/auth/dashboard/jobs, and references the sitemap
- **R8.** Outbound Discogs links include UTM parameters and click events are logged server-side
- **R9.** `/llms.txt` and `/llms-full.txt` serve AI crawler context per the llmstxt.org standard
- **R10.** Discogs seller location is scraped during onboarding/sync and stored for geo-targeted SEO

**Origin actors:** A1. Record buyer searching for vinyl, A2. AI crawler/chatbot, A3. Search engine crawler

---

## Scope Boundaries

- SEO metadata lives in Rails controllers only — no React-side head management
- SSR must not break existing client-side functionality
- `/apply` page kept as-is with `noindex` — separate issue for OAuth-first redesign
- No custom JSON API for agents — LLMs.txt + SSR + JSON-LD sufficient
- No content changes to React components beyond SSR compatibility guards
- Location data is best-effort — many Discogs sellers do not set it

### Deferred to Follow-Up Work

- Remove or redesign `/apply` page for OAuth-first flow: separate issue
- Genre directory pages at `/genres/{genre}`: separate SEO iteration after indexed pages prove the loop

---

## Context & Research

### Relevant Code and Patterns

- `app/helpers/seo_helper.rb` — existing SEO helper with `seo_title`, `seo_description`, `seo_store_json_ld`, `default_og_image`; needs expansion for genre-aware, location-aware, and page-type variants
- `app/views/shared/_store_seo.html.erb` — existing but unused SEO partial with OG tags, Twitter card, JSON-LD; ready to wire via `content_for :head`
- `app/views/layouts/inertia_application.html.erb` — layout has `yield :head` (line 11) and `content_for(:title)` (line 5) wired; no controller populates them
- `app/controllers/stores_controller.rb:54-62` — `render_store` method; injection point for `content_for :title` and `content_for :head`
- `app/controllers/pages_controller.rb` — home and apply actions; injection points for page-level SEO
- `app/controllers/explore_controller.rb` — explore index action; injection point for directory SEO
- `config/initializers/inertia.rb` — SSR disabled (commented out on line 15); uncomment and configure
- `app/frontend/contexts/viewport_context.tsx:29-31` — existing SSR guard pattern (`typeof window === "undefined"`) to replicate
- `app/services/storefront_curation.rb` — already computes `genre_counts` and `deep_genre_count`; genre diversity detection can reuse this infrastructure
- `app/services/discogs/public_client.rb` — `seller_profile(username)` fetches Discogs user profile including `location`; extend to persist location
- `app/services/discogs/` — rate-limit middleware (`DiscogsRateLimitMiddleware`) handles pacing/retry; location scraping goes through `DiscogsClient` to inherit this
- `app/models/store.rb` — no `location` column yet; `listings` association has `genres` text[] column with GIN index
- `app/models/listing.rb` — `genres` text[] column, `styles` text[] column; source data for genre diversity detection

### Institutional Learnings

- **Organic acquisition from Discogs sellers** (`docs/solutions/growth-strategy/organic-acquisition-discogs-sellers-and-consumers-2026-06-08.md`): Three-move SEO framework: (1) SEO `/:slug` pages for self-discovery, (2) genre directory at `/genres/{genre}`, (3) OG images of cover art walls. Warns against cold outreach and content marketing before organic loop is proven. Explicitly asks whether Inertia SSR is feasible — this plan answers that question.
- **Discogs rate-limit middleware** (`docs/solutions/integration-issues/discogs-rate-limit-middleware-2026-05-19.md`): All Discogs API calls go through `DiscogsClient` → `DiscogsRateLimitMiddleware`. Location scraping must connect through this pipeline to inherit pacing, retry, and concurrency control. `SyncAllStoresJob` fan-out pattern with `STAGGER_INTERVAL = 5.minutes` is the pattern to follow for multi-store scraping.
- **Unified store browsing** (`docs/solutions/architecture-patterns/unified-store-browsing-browseshell-2026-06-02.md`): `BrowseShell` is the single component tree for store browsing; depends on `useViewport()`, `useBrowseRouting`, `useCrateRouting`, and Framer Motion. SSR must handle these browser-dependent hooks.
- **ViewportContext responsive architecture** (`docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`): `ViewportProvider` registers `matchMedia` listeners at app root. SSR must default to a single tier (comfy) and let the provider override on hydration.

### External References

- **Inertia.js SSR with Rails** (inertia_rails 3.21.1): SSR architecture uses Puma plugin to spawn Node.js SSR server in the same container. `@inertiajs/vite` plugin handles SSR bundle build with `ssr.entry` option. `hydrateRoot` replaces `createRoot`. Dev mode auto-detects Vite dev server — no separate SSR process needed.
- **sitemap_generator gem**: Standard Rails gem for sitemap XML. Uses `find_each` for database-backed sitemaps. Rails URL helpers auto-available. Supports changefreq, priority, lastmod per entry.
- **LLMs.txt standard** (llmstxt.org, Sept 2024): Markdown file at `/llms.txt` with H1 title, blockquote summary, and link lists with descriptions. AI crawlers (ChatGPT, Perplexity, Google AI) consume this as site context. No custom API needed.

---

## Key Technical Decisions

- **SSR via Puma plugin, not separate container:** The `plugin :inertia_ssr` approach runs Node.js in the same Kamal container as Puma. This avoids multi-container complexity and Kamal deploy changes. Node.js 22 must be installed in the final Docker image.
- **Controller-side SEO only — no React head management:** Every page gets its SEO metadata from the Rails controller via `content_for`. This is the existing architectural pattern (layout already has `yield :head`) and avoids split-brain between Rails and React.
- **Genre diversity from existing Listing.genres array:** Reuse the GIN-indexed `genres` text[] column rather than computing a separate denormalized column. The `StorefrontCuration` service already tallies genres — a lightweight `GenreDiversityAnalyzer` service wraps this for SEO use.
- **Location scraping gated through DiscogsClient:** Any new Discogs API consumer must use the existing `DiscogsClient` pipeline to inherit rate limiting, pacing, and retry. No direct HTTP calls to Discogs.
- **sitemap_generator gem over hand-rolled XML:** Standard gem handles Sitemap 0.9 protocol compliance, gzip compression, sitemap index splitting, and search engine pinging. Lower maintenance than maintaining XML templates.
- **LLMs.txt as static file served from public/:** Generated once on deploy. Simple, no runtime dependency. Stores listed explicitly rather than dynamically — acceptable for current store count.

---

## Implementation Units

### U1. Enable Inertia SSR

**Goal:** Crawlers and non-JS clients receive fully-rendered HTML for all public pages. SSR falls back gracefully to client-side rendering on failure.

**Requirements:** R5

**Dependencies:** None

**Files:**
- Create: `config/initializers/inertia_rails.rb`
- Create: `app/frontend/ssr/ssr.tsx`
- Modify: `config/initializers/inertia.rb`
- Modify: `vite.config.ts`
- Modify: `app/frontend/entrypoints/application.tsx`
- Modify: `config/puma.rb`
- Modify: `Dockerfile`
- Modify: `config/vite.json`
- Modify: `package.json`
- Modify: `app/frontend/contexts/viewport_context.tsx`
- Modify: `app/frontend/hooks/use_theme.ts`
- Modify: `app/frontend/hooks/use_pile.ts`
- Modify: `app/frontend/contexts/shopper_context.tsx`
- Modify: `app/frontend/hooks/use_crate_navigation.ts`
- Modify: `app/frontend/components/crate_view/inspection_hint.tsx`
- Test: `spec/requests/ssr_spec.rb`

**Approach:**
- Uncomment `config.ssr_enabled` in `config/initializers/inertia.rb`, conditional on `ViteRuby.config.ssr_build_enabled`
- Create `config/initializers/inertia_rails.rb` with SSR config: `ssr_enabled`, `ssr_cache` (1 hour TTL), `on_ssr_error` callback for Honeybadger
- Create SSR entry point `app/frontend/ssr/ssr.tsx` using `createServer` + `createInertiaApp` + `ReactDOMServer.renderToString` with `import.meta.glob` for page resolution
- Configure `@inertiajs/vite` plugin with `ssr: { entry: "ssr/ssr.tsx" }` in `vite.config.ts`
- Switch `createRoot` to `hydrateRoot` in `app/frontend/entrypoints/application.tsx`
- Add `plugin :inertia_ssr` to `config/puma.rb` (before `plugin :tmp_restart`)
- Install Node.js 22 in Dockerfile final stage; add `vite build --ssr` to build
- Set `ssrBuildEnabled: true` in `config/vite.json` production block
- Guard all browser-only APIs (`window`, `document`, `localStorage`, `matchMedia`) with `typeof window !== "undefined"` in components and hooks. Follow existing pattern at `viewport_context.tsx:29-31`
- SSR errors log to Rails logger and fall back to client-side rendering — no user-facing failures

**Patterns to follow:**
- `viewport_context.tsx:29-31` — existing `typeof window === "undefined"` guard
- `inertia_rails` Puma plugin lifecycle (auto-health-check, auto-restart, dev-mode detection)

**Test scenarios:**
- Happy path: GET any public page with SSR enabled → response body contains rendered HTML content (not empty `<div id="app">`), JSON-LD `<script>`, `<title>`, meta tags
- Happy path: GET dynamic store page → response body contains store name, description, JSON-LD
- Edge case: SSR Node process crashes → request succeeds via client-side fallback, error logged
- Edge case: Browser-only API call during SSR → component renders without throwing, missing browser features omitted in SSR HTML
- Edge case: Vite dev server running → SSR routes through Vite dev server, no separate Node process
- Error path: SSR bundle missing → SSR skipped, page renders client-side, warning logged

**Verification:**
- `curl -s https://milkcrate.fm/philadelphiamusic | grep -c "Philadelphia Music"` returns > 0
- Google Rich Results Test validates JSON-LD on rendered page
- `RAILS_ENV=test bundle exec rspec spec/requests/ssr_spec.rb` passes

---

### U2. Add canonical URLs and wire basic SEO metadata to layout

**Goal:** Every public page gets a `<link rel="canonical">` pointing to its canonical URL. Every public controller action sets `content_for :title` and `content_for :head` with page-appropriate metadata.

**Requirements:** R1, R4 (partial — home/explore titles and descriptions)

**Dependencies:** None (can run in parallel with U1)

**Files:**
- Modify: `app/views/layouts/inertia_application.html.erb`
- Modify: `app/controllers/pages_controller.rb`
- Modify: `app/controllers/explore_controller.rb`
- Modify: `app/controllers/stores_controller.rb`
- Modify: `app/helpers/application_helper.rb`
- Test: `spec/requests/pages_spec.rb`
- Test: `spec/requests/explore_spec.rb`
- Test: `spec/requests/stores_spec.rb`

**Approach:**
- Add `content_for :canonical_url` to layout with fallback to `request.original_url` (strip query params)
- Set `content_for :title` and `content_for :head` in `PagesController#home` with homepage SEO values from spec
- Set `content_for :title` and `content_for :head` in `ExploreController#index` with explore SEO values from spec
- Set `noindex` on `PagesController#apply` via `<meta name="robots" content="noindex">`
- Wire `render_store` in `StoresController` to render `shared/store_seo` partial via `content_for :head` (the partial already exists and is unused)
- Add `default_url_options` for host in test environment so `*_url` helpers resolve
- Apply page exits with `noindex` and basic title/description

**Patterns to follow:**
- Existing `content_for :title` / `content_for :head` pattern in layout (already wired, just needs population)
- Existing `_store_seo.html.erb` partial (already written, needs wiring)

**Test scenarios:**
- Happy path: GET / → response includes `<title>Milkcrate — Browse Vinyl Records Like a Record Store</title>`, meta description, `<link rel="canonical" href="https://milkcrate.fm/">`
- Happy path: GET /explore → response includes `<title>Record Stores on Milkcrate — Browse Vinyl Shops</title>`, meta description, canonical
- Happy path: GET /teststore → response includes SEO title, meta description, OG tags, Twitter card, JSON-LD, canonical
- Edge case: GET /apply → response includes `<meta name="robots" content="noindex">`
- Edge case: GET with query params → canonical URL omits query params

**Verification:**
- View source on each public page shows correct title, meta description, canonical
- `bundle exec rspec spec/requests/pages_spec.rb spec/requests/explore_spec.rb spec/requests/stores_spec.rb` passes with SEO assertions

---

### U3. Add sitemap.xml with sitemap_generator gem

**Goal:** Search engines discover and index all public pages via a protocol-compliant sitemap.

**Requirements:** R6

**Dependencies:** None (can run in parallel with U1-U2)

**Files:**
- Modify: `Gemfile`
- Create: `config/sitemap.rb`
- Create: `lib/tasks/sitemap.rake`
- Modify: `config/recurring.yml` (or equivalent SolidQueue schedule)
- Test: `spec/lib/tasks/sitemap_spec.rb`

**Approach:**
- Add `sitemap_generator` gem to Gemfile
- Configure `config/sitemap.rb`: default_host `https://milkcrate.fm`, sitemaps_path `sitemaps/`
- Sitemap entries: `/` (daily, 1.0), `/explore` (daily, 0.9), `/:slug` for every active store via `Store.find_each` (daily, 0.8, lastmod from `updated_at`)
- Excluded: `/apply`, `/admin/*`, `/dashboard`, `/auth/*`, `/dev/*`
- Rake task `sitemap:refresh` for manual generation
- Hook into SolidQueue recurring schedule for daily regeneration
- Sitemap index auto-created when store count exceeds threshold

**Patterns to follow:**
- `Store.find_each` for batched iteration (standard pattern in sitemap_generator)
- SolidQueue recurring schedule in `config/recurring.yml`

**Test scenarios:**
- Happy path: Generate sitemap with 3 stores → XML output includes `/`, `/explore`, and all 3 store URLs with correct changefreq/priority
- Edge case: Generate sitemap with zero stores → XML output includes only static routes, no store entries
- Edge case: Run sitemap rake task → file written to `public/sitemaps/`
- Validation: Generated XML validates against Sitemap 0.9 schema

**Verification:**
- `curl -s https://milkcrate.fm/sitemap.xml.gz | gunzip | grep -c "<loc>"` returns expected count
- Google Search Console accepts sitemap submission without errors

---

### U4. Configure robots.txt

**Goal:** Crawlers are directed to index public pages, avoid admin/auth routes, and discover the sitemap.

**Requirements:** R7

**Dependencies:** U3 (needs sitemap URL to reference)

**Files:**
- Modify: `public/robots.txt`
- Test: `spec/requests/robots_spec.rb`

**Approach:**
- Replace empty robots.txt with proper directives
- Allow all crawlers on public routes
- Disallow `/admin/`, `/dashboard/`, `/auth/`, `/dev/`, `/jobs/`
- Reference sitemap at `https://milkcrate.fm/sitemap.xml.gz`

**Patterns to follow:**
- Standard robots.txt format with `User-agent: *`

**Test scenarios:**
- Happy path: GET /robots.txt → returns text/plain, body includes `Allow: /`, `Disallow: /admin/`, `Sitemap:` directive
- Edge case: Crawler hits /admin → robots.txt disallows, but auth gate also protects

**Verification:**
- `curl -s https://milkcrate.fm/robots.txt` shows correct content
- Google Search Console robots.txt tester accepts the file

---

### U5. Scrape Discogs seller location and store on Store model

**Goal:** Store pages for Philadelphia-based sellers get geo-targeted SEO metadata. Location data is persisted on the Store model for reuse.

**Requirements:** R3, R10

**Dependencies:** None

**Files:**
- Modify: `db/migrate/*_add_location_to_stores.rb` (new migration)
- Modify: `app/models/store.rb`
- Modify: `app/services/discogs_seller_lookup.rb`
- Create: `app/jobs/scrape_store_location_job.rb`
- Test: `spec/models/store_spec.rb`
- Test: `spec/jobs/scrape_store_location_job_spec.rb`

**Approach:**
- Add `location` column (string) to `stores` table via migration
- Extend `DiscogsSellerLookup` (or `Discogs::PublicClient#seller_profile`) to extract `location` from the Discogs user profile response
- Create `ScrapeStoreLocationJob`: fetches seller profile via `DiscogsClient`, extracts location, updates `store.update(location:)`. Uses `limits_concurrency to: 1, key: -> { "discogs_api" }` to serialize with sync/enrichment
- Trigger location scraping during store onboarding (after store creation) and optionally as a recurring backfill for stores without location
- Location is best-effort — many Discogs profiles have empty or non-standard location fields. Handle nil/empty gracefully

**Patterns to follow:**
- `DiscogsClient` middleware pipeline (rate limiting, retry) — no direct HTTP
- `limits_concurrency to: 1` shared across all Discogs API jobs
- Fan-out + stagger pattern from `SyncAllStoresJob`

**Test scenarios:**
- Happy path: Scrape seller with location "Philadelphia, PA" → `store.location` updated to "Philadelphia, PA"
- Edge case: Scrape seller with empty location → `store.location` remains nil, no error
- Edge case: Discogs API returns 429 → rate-limit middleware handles retry, job retries
- Error path: Discogs API timeout → job fails gracefully, logs error, store unchanged

**Verification:**
- After onboarding a store with known Discogs location, `store.reload.location` is populated
- `bundle exec rspec spec/jobs/scrape_store_location_job_spec.rb` passes

---

### U6. Implement genre diversity detection

**Goal:** Store pages get keyword-optimized titles and descriptions based on whether the store is narrow (genre-specialized) or broad (multi-genre). Narrow stores like Super Micah (techno-only) get genre-specific SEO.

**Requirements:** R2

**Dependencies:** None (reads existing Listing data)

**Files:**
- Create: `app/services/genre_diversity_analyzer.rb`
- Test: `spec/services/genre_diversity_analyzer_spec.rb`

**Approach:**
- Create `GenreDiversityAnalyzer` service with `initialize(store:)` + `call` interface
- Analyze genre distribution from `store.listings` using the GIN-indexed `genres` array column
- If one genre represents 80%+ of listings → `narrow: true`, `dominant_genre: "Techno"`
- If distributed across genres → `narrow: false`, `top_genres: ["Electronic", "Rock", "Jazz"]`
- Can reuse `StorefrontCuration`'s genre tallying if available, or query `Listing.where(store:).group(:genres).count` directly
- Return value hash: `{ narrow: Boolean, dominant_genre: String|nil, top_genres: [String] }`
- Used by `SeoHelper` in U7

**Patterns to follow:**
- Service object pattern: PORO with `initialize` + `call`, in `app/services/`
- `Listing.genres` array column with GIN index for efficient queries

**Test scenarios:**
- Happy path: Store with 100 techno listings out of 110 total → narrow: true, dominant_genre: "Techno"
- Happy path: Store with genres distributed 30% Electronic, 25% Rock, 20% Jazz → narrow: false, top_genres contains those three
- Edge case: Store with zero listings → narrow: false, top_genres: [], dominant_genre: nil
- Edge case: Store with exactly 80% threshold → narrow: true, dominant_genre set
- Edge case: Store with null genres in some listings → nulls excluded from tally

**Verification:**
- `bundle exec rspec spec/services/genre_diversity_analyzer_spec.rb` passes
- Manual: `GenreDiversityAnalyzer.new(store: Store.find_by(discogs_username: "supermicah")).call` returns narrow: true for a techno-only store

---

### U7. Expand SeoHelper for genre-aware, location-aware, and page-type SEO

**Goal:** SeoHelper provides all metadata generation needed by controllers. Expands existing helper with genre-aware store titles/descriptions, location-aware enhancements, and page-type JSON-LD (home, explore, store).

**Requirements:** R1, R2, R3, R4

**Dependencies:** U6 (GenreDiversityAnalyzer)

**Files:**
- Modify: `app/helpers/seo_helper.rb`
- Modify: `app/views/shared/_store_seo.html.erb`
- Test: `spec/helpers/seo_helper_spec.rb`

**Approach:**
- Add `seo_home_json_ld` → `Organization` + `WebSite` with `SearchAction` (links to `/explore?q={search_term}`)
- Add `seo_explore_json_ld(stores)` → `ItemList` of stores with position, name, URL
- Modify `seo_title(store)` → uses `GenreDiversityAnalyzer`: narrow stores get `"{Name} — {Genre} Vinyl Records on Milkcrate"`, broad stores get `"{Name} Vinyl Records — Browse on Milkcrate"`
- Modify `seo_description(store)` → narrow stores: `"Browse {name}'s {genre} vinyl collection on Milkcrate — {N} records. A {genre}-focused Discogs store."`; broad stores include top 3 genres
- Add location-aware enhancement: if `store.location` matches "Philadelphia" (case-insensitive), append "Philadelphia-based record store." to meta description
- Extend `seo_store_json_ld(store)` → add `ItemList` of crates (name, URL, item count), `BreadcrumbList` (Home > Store Name), `keywords` (top genres)
- Add `seo_canonical_url(path)` helper for controllers
- Update `_store_seo.html.erb` to use new helper methods

**Patterns to follow:**
- Existing `SeoHelper` module pattern — expand in place, don't replace
- `GenreDiversityAnalyzer` as a dependency-injected or lazily-instantiated collaborator

**Test scenarios:**
- Happy path: Narrow store (Super Micah, techno) → `seo_title` returns "Super Micah — Techno Vinyl Records on Milkcrate"
- Happy path: Broad store (Philadelphia Music) → `seo_title` returns "Philadelphia Music Vinyl Records — Browse on Milkcrate"
- Happy path: `seo_description` for narrow store → mentions dominant genre
- Happy path: `seo_description` for broad store → mentions top 3 genres
- Happy path: Store with location "Philadelphia, PA" → description includes "Philadelphia-based"
- Happy path: Store with location "New York, NY" → description does NOT include Philadelphia
- Edge case: Store with no listings → GenreDiversityAnalyzer returns narrow: false, top_genres: [] → description handles gracefully
- Integration: `seo_store_json_ld` includes `ItemList`, `BreadcrumbList`, `keywords`
- Integration: `seo_home_json_ld` includes `Organization` + `WebSite` + `SearchAction`
- Integration: `seo_explore_json_ld` returns valid `ItemList` with store entries

**Verification:**
- `bundle exec rspec spec/helpers/seo_helper_spec.rb` passes
- Manual: validate JSON-LD output with Google Rich Results Test

---

### U8. Wire all controllers with expanded SEO metadata

**Goal:** Every public controller action outputs complete SEO metadata via `content_for`. This connects the expanded SeoHelper, genre diversity detection, and location data to actual page responses.

**Requirements:** R1, R2, R3, R4

**Dependencies:** U2, U7 (SeoHelper expansion), U6 (genre diversity)

**Files:**
- Modify: `app/controllers/pages_controller.rb`
- Modify: `app/controllers/explore_controller.rb`
- Modify: `app/controllers/stores_controller.rb`
- Test: `spec/requests/pages_spec.rb` (update)
- Test: `spec/requests/explore_spec.rb` (update)
- Test: `spec/requests/stores_spec.rb` (update)

**Approach:**
- `PagesController#home`: set title to `"Milkcrate — Browse Vinyl Records Like a Record Store"`, meta description per spec, `seo_home_json_ld` in head, canonical URL
- `ExploreController#index`: set title to `"Record Stores on Milkcrate — Browse Vinyl Shops"`, meta description per spec, `seo_explore_json_ld(stores)` in head, canonical URL. Handle error state — still set base SEO metadata even when stores empty
- `StoresController#show` (`render_store`): set title via expanded `seo_title(store)`, render `shared/store_seo` partial (now using expanded SeoHelper), canonical URL via `seo_canonical_url`. Wire `render_store` with `content_for :head` calling `render partial: "shared/store_seo"`
- `PagesController#apply`: keep noindex, update title/description per spec
- All controllers set `content_for :canonical_url` via helper

**Patterns to follow:**
- Existing `content_for` pattern in layout (already wired)
- Existing `_store_seo.html.erb` partial rendering pattern

**Test scenarios:**
- Happy path: GET / → response includes expanded home SEO metadata, JSON-LD Organization+WebSite
- Happy path: GET /explore → response includes explore SEO metadata, JSON-LD ItemList with store entries
- Happy path: GET /narrowstore → response includes genre-specific title, description with dominant genre
- Happy path: GET /phillystore → response includes "Philadelphia-based" in description
- Happy path: GET /broadstore → response includes multi-genre description
- Edge case: GET /explore with DB error → response still has SEO metadata (title, description), JSON-LD omitted or minimal
- Edge case: Store with no listings → description handles gracefully, no genre references

**Verification:**
- View source on each page type shows complete, correct metadata
- `bundle exec rspec spec/requests/pages_spec.rb spec/requests/explore_spec.rb spec/requests/stores_spec.rb` passes

---

### U9. Write LLMs.txt for AI crawlers

**Goal:** AI crawlers (ChatGPT, Perplexity, Google AI) can summarize and reference milkcrate content accurately.

**Requirements:** R9

**Dependencies:** None

**Files:**
- Create: `public/llms.txt`
- Create: `public/llms-full.txt`
- Test: `spec/requests/llms_txt_spec.rb`

**Approach:**
- Write `/llms.txt` per llmstxt.org spec: H1 "Milkcrate", blockquote summary, `## Stores` section with `[Name](url): description` links, `## Info` section noting SSR + JSON-LD for machine consumption
- Write `/llms-full.txt` with full store listing if store count < 200. If more, note that full listing is available via `/explore`
- Serve as static files from `public/` — no controller or dynamic rendering needed for current scale
- Both files are plain Markdown served as `text/markdown` (or `text/plain`)

**Patterns to follow:**
- llmstxt.org specification for format and link description conventions

**Test scenarios:**
- Happy path: GET /llms.txt → returns 200, text/markdown, body contains H1, blockquote, store links with descriptions
- Happy path: GET /llms-full.txt → returns 200, includes full store listing
- Edge case: Store count > 200 → llms-full.txt notes the limit and links to /explore

**Verification:**
- `curl -s https://milkcrate.fm/llms.txt` shows valid llms.txt content
- `bundle exec rspec spec/requests/llms_txt_spec.rb` passes

---

### U10. Add UTM parameters to outbound Discogs links and track click events

**Goal:** Organic-to-Discogs conversion is measurable. Each outbound click to Discogs carries UTM parameters for attribution, and click events are logged server-side for the admin dashboard.

**Requirements:** R8

**Dependencies:** None

**Files:**
- Create: `db/migrate/*_create_click_events.rb` (new migration)
- Create: `app/models/click_event.rb`
- Create: `app/controllers/click_events_controller.rb`
- Create: `app/controllers/concerns/click_tracking.rb`
- Modify: `config/routes.rb`
- Create: `app/frontend/lib/build_discogs_url.ts`
- Modify: `app/frontend/components/record_card/` (or wherever Discogs URLs are rendered)
- Test: `spec/models/click_event_spec.rb`
- Test: `spec/requests/click_tracking_spec.rb`

**Approach:**
- Create `ClickEvent` model: `store_id` (references stores), `listing_id` (references listings, nullable), `referrer` (string), `user_agent` (string), `created_at`
- Add `include ClickTracking` to `ApplicationController` — provides `track_click(store:, listing: nil)` method
- UTM parameters on outbound Discogs links: `?utm_source=milkcrate&utm_medium=referral&utm_campaign=store_browse&utm_content={store_slug}`
- Frontend: append UTM params to `discogs_url` in listing/record card components. This is a utility function, not a component change — add to `app/frontend/lib/` as `buildDiscogsUrl(baseUrl: string, storeSlug: string): string`
- New route: `POST /click` → `ClickEventsController#create`. Lightweight endpoint, no auth required, rate-limited to prevent bot abuse
- Frontend calls `POST /click` on outbound Discogs link click before navigation. Controller creates `ClickEvent` record with `store_id`, `listing_id`, `referrer`, `user_agent`
- Click tracking is fire-and-forget from the user's perspective — endpoint failure does not block navigation
- Admin dashboard: surface click events per store (deferred — dashboard wiring in separate follow-up if complex)

**Patterns to follow:**
- Frontend utility functions in `app/frontend/lib/`
- ActiveRecord model with belongs_to associations
- Controller concern for shared behavior

**Test scenarios:**
- Happy path: Record card renders Discogs link with `utm_source=milkcrate&utm_medium=referral&utm_campaign=store_browse&utm_content={slug}`
- Happy path: Click event POST creates ClickEvent record with store_id, listing_id, referrer
- Edge case: Click on link without listing context → listing_id is nil, event still created
- Edge case: Rapid clicks → each creates a separate event (no dedup needed at this scale)
- Error path: Click event save fails → logged, does not break user experience

**Verification:**
- View page source or inspect element on a store page → outbound links include UTM params
- Click a Discogs link → ClickEvent record created in database
- `bundle exec rspec spec/models/click_event_spec.rb spec/requests/click_tracking_spec.rb` passes

---

## System-Wide Impact

- **Interaction graph:** All public controllers touch `SeoHelper` and `content_for`. SSR injects into every page render — failure falls back to client-side, so blast radius is contained. Location scraping adds a new job that serializes with existing sync/enrichment jobs via shared `discogs_api` concurrency key.
- **Error propagation:** SSR failures log and fall back transparently. SeoHelper failures (e.g., genre analysis on a store with corrupted data) must not break page render — rescue and return fallback metadata. Click tracking failures log but never block the response.
- **State lifecycle risks:** Sitemap is regenerated daily — no stale data risk. Location data is scraped once during onboarding but may go stale if sellers move — acceptable for best-effort geo targeting. Canonical URLs must not drift from actual routes.
- **API surface parity:** Home, explore, and store pages all get the same metadata treatment. Admin/dashboard pages are excluded. Apply page gets noindex treatment.
- **Integration coverage:** SSR + JSON-LD integration (crawler receives both rendered content and structured data). Location scraping + SeoHelper integration (scraped location flows into metadata). Genre diversity + SeoHelper integration (narrow/broad detection drives keyword optimization).
- **Unchanged invariants:** All existing routes, controller actions, and React components maintain current behavior. No prop shape changes. No visual changes. SSR is transparent — users see the same UI. Admin auth, session management, OAuth flows untouched.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| SSR Node.js process adds 50-150MB RAM; server may be under-provisioned | Enable SSR, monitor memory, scale Hetzner instance if needed. Puma plugin auto-restarts on crash |
| SSR breaks client-side features (localStorage, matchMedia) | Audit and guard all browser APIs before enabling SSR in production. Test in staging first |
| Inertia SSR bundle build fails or produces incompatible output | `vite build --ssr` runs in CI. SSR errors fall back to client-side rendering via `on_ssr_error` callback |
| Discogs location data is empty for most sellers — geo targeting has low coverage | Location is explicitly best-effort. No SEO claims are made for stores without verified location |
| Genre diversity detection produces wrong narrow/broad classification for edge cases | 80% threshold is tested against known stores. Manual verification before deploy |
| Click tracking endpoint receives high traffic from crawlers/bots | Rate-limit the click endpoint. Filter out known bot user agents server-side |
| sitemap_generator writes files that don't persist across Kamal deploys | Ensure `public/sitemaps/` is in a shared volume or configure S3 adapter |

---

## Documentation / Operational Notes

- After deploy: submit sitemap to Google Search Console and Bing Webmaster Tools
- After deploy: verify SSR rendering with `curl` and Google Rich Results Test
- After deploy: request indexing of key pages in Google Search Console
- Monitor: SSR error rate via Honeybadger (configured in `on_ssr_error` callback)
- Monitor: Click event volume — sanity check that organic traffic generates expected click counts
- Rollback: If SSR causes issues, set `config.ssr_enabled = false` in `config/initializers/inertia_rails.rb` and redeploy — all pages fall back to client-side rendering

---

## Sources & References

- **Origin document:** [docs/superpowers/specs/2026-06-11-seo-optimization-design.md](../superpowers/specs/2026-06-11-seo-optimization-design.md)
- Related code: `app/helpers/seo_helper.rb`, `app/views/shared/_store_seo.html.erb`, `app/views/layouts/inertia_application.html.erb`
- Related learnings: `docs/solutions/growth-strategy/organic-acquisition-discogs-sellers-and-consumers-2026-06-08.md`
- External: Inertia.js SSR docs (inertia-rails.dev), sitemap_generator README, llmstxt.org
