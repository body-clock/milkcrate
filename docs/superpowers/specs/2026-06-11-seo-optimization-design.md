# SEO Optimization — Design Spec

**Date:** 2026-06-11
**Status:** Approved
**Approach:** Rails-native SEO (single source of truth in controllers via `SeoHelper` + `content_for`)

## Problem

Milkcrate has zero SEO optimization. The site doesn't appear in search results for any relevant query. No sitemap, effectively empty robots.txt, SSR disabled (crawlers get empty HTML), minimal structured data, no conversion tracking.

## Goal

Make Milkcrate discoverable via organic search for target keywords. Enable AI agent scraping via LLMs.txt. Track conversions from organic visits to Discogs clicks.

## Architecture

```
                    ┌─────────────────────────────┐
                    │        Google / Bing / DDG   │
                    │   ChatGPT / Perplexity bots  │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │     robots.txt (allow all,   │
                    │     point to sitemap.xml)    │
                    └─────────────┬───────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
    ┌───────▼───────┐   ┌────────▼────────┐   ┌────────▼────────┐
    │  sitemap.xml  │   │   Inertia SSR   │   │   llms.txt      │
    │  (dynamic,    │   │   (Node.js      │   │   (markdown for │
    │   per-store   │   │    renders full  │   │    AI crawlers) │
    │   URLs)       │   │    HTML for bots)│   │                 │
    └───────────────┘   └────────┬────────┘   └─────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Rails controllers     │
                    │   (single source of     │
                    │    SEO truth via        │
                    │    SeoHelper + content_for)│
                    └────────────┬────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                    │
    ┌───────▼───────┐   ┌───────▼───────┐   ┌────────▼────────┐
    │  Structured   │   │   UTM + click │   │  Genre diversity │
    │  Data (JSON-LD│   │   tracking    │   │  + location-aware│
    │  per page)    │   │   middleware  │   │  meta            │
    └───────────────┘   └───────────────┘   └─────────────────┘
```

**Single source of truth:** Every Rails controller action sets all SEO metadata before rendering. No React-side head management.

**SSR scope:** All public pages (home, explore, store show, apply). Admin, dashboard, dev, auth routes excluded.

## Page-by-Page SEO Specification

### Homepage (`/`)

The homepage is a marketing page, not Philly-specific. Global value prop: browsing curated Discogs collections.

| Element | Value |
|---|---|
| **Title** | `Milkcrate — Browse Vinyl Records Like a Record Store` |
| **Meta description** | `Discover vinyl records from independent record stores. Browse curated crates, genre bins, and walls from Discogs sellers around the world.` |
| **H1** | `Browse Vinyl Records Like a Record Store` |
| **JSON-LD** | `Organization` + `WebSite` (site name, URL, search action) |
| **OG/Twitter** | Same as title + description, `summary_large_image` card |
| **Canonical** | `https://milkcrate.com/` |

### Explore (`/explore`)

Global store directory. Not Philly-specific — sellers are worldwide.

| Element | Value |
|---|---|
| **Title** | `Record Stores on Milkcrate — Browse Vinyl Shops` |
| **Meta description** | `Browse independent record stores on Milkcrate. Find vinyl records from Discogs sellers around the world — techno, electronic, rock, jazz, and more.` |
| **H1** | `Record Stores` |
| **JSON-LD** | `ItemList` of stores (name, URL, listing count) |
| **OG/Twitter** | Title + description |
| **Canonical** | `https://milkcrate.com/explore` |

### Store page (`/:slug`)

Genre-aware SEO based on store diversity detection (see below).

**Narrow stores** (80%+ of listings in one genre, e.g., Super Micah → techno):

| Element | Value |
|---|---|
| **Title** | `{Store Name} — {Dominant Genre} Vinyl Records on Milkcrate` |
| **Meta description** | `Browse {Store Name}'s {dominant genre} vinyl collection on Milkcrate — {N} records. A {dominant genre}-focused Discogs store.` |

**Broad stores** (distributed across genres):

| Element | Value |
|---|---|
| **Title** | `{Store Name} Vinyl Records — Browse on Milkcrate` |
| **Meta description** | `Browse {Store Name}'s curated vinyl collection on Milkcrate — {N} records across {top 3 genres}. Discover records from this Discogs seller.` |

**All stores get:**

| Element | Value |
|---|---|
| **H1** | Store name (already rendered) |
| **JSON-LD** | `LocalBusiness`, `ItemList` for crates, `BreadcrumbList` |
| **OG image** | Store-specific image if available, fallback to default |
| **Canonical** | `https://milkcrate.com/{slug}` |
| **Location-aware meta** | If location = Philadelphia (from Discogs profile): inject "Philadelphia-based record store" into meta. If no location or not Philly: skip geo. |

### Apply page (`/apply`)

Kept as-is for now. Separate issue will redesign for OAuth-first flow.

| Element | Value |
|---|---|
| **Title** | `Claim Your Record Store — Milkcrate` |
| **Meta description** | `Turn your Discogs inventory into a browsable storefront. Join record stores on Milkcrate.` |
| **JSON-LD** | `WebPage` only |
| **Noindex** | `true` — form page, not content |

## Keyword Targeting

### Primary: Genre + Store
"Narrow" stores (high genre concentration) get genre-specific titles and meta. Super Micah ranks for "techno record stores", "techno vinyl shop". Other narrow stores rank for their dominant genre. This is the most defensible SEO angle — it's accurate by construction because we know the genre distribution.

### Secondary: Vinyl Discovery
"browse vinyl records", "vinyl record discovery", "Discogs browser" → home page. Generic discovery terms.

### Tertiary: Store by Name
"Philadelphia Music vinyl", "Super Micah records" → per-store pages (name in title).

### Conditional: Geo + Category
Only for stores with verified Philadelphia location (scraped from Discogs profile). "Philadelphia record stores" → stores with location=Philadelphia. Not applied speculatively — only when data supports it.

## Technical Components

### 1. SSR Enablement

Enable `config.ssr_enabled` in `config/initializers/inertia.rb`. Requires Node.js SSR server. Audit React components for browser-only API usage (`window`, `localStorage`, `document`) and guard with `typeof window !== 'undefined'` checks.

### 2. Sitemap

Add `sitemap_generator` gem. Sitemap entries:
- `/` — changefreq: weekly, priority: 1.0
- `/explore` — changefreq: daily, priority: 0.9
- `/:slug` for every active store — changefreq: daily, priority: 0.8
- Excludes: `/apply`, `/admin/*`, `/dashboard`, `/auth/*`, `/dev/*`

Regenerated on deploy, optionally on daily cron.

### 3. robots.txt

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /dashboard/
Disallow: /auth/
Disallow: /dev/
Disallow: /jobs/

Sitemap: https://milkcrate.com/sitemap.xml.gz
```

### 4. Canonical URLs

`<link rel="canonical" href="...">` on every public page. Added to `inertia_application.html.erb` layout via `content_for :head`.

### 5. Structured Data Expansion

- **`SeoHelper#seo_store_json_ld`** — add `ItemList` of crates, `BreadcrumbList`, `keywords` (top genres)
- **`SeoHelper#seo_home_json_ld`** — `Organization` + `WebSite` with `SearchAction`
- **`SeoHelper#seo_explore_json_ld`** — `ItemList` of stores with position/name/URL

### 6. Genre Diversity Detection

New method on `Store` or a service object: analyzes listing genres and determines if the store is "narrow" (80%+ in one genre) or "broad" (distributed). Returns `{ narrow: true/false, dominant_genre: "Techno"|nil, top_genres: ["Techno", "House", ...] }`.

Used by `SeoHelper` to generate genre-aware titles and descriptions per store page.

### 7. Discogs Location Scraping

During store sync or onboarding, pull the seller's location field from the Discogs seller profile. Store on `Store` model (new `location` column). Used by `SeoHelper` to conditionally inject geo keywords for Philly-based stores.

### 8. UTM + Click Event Tracking

Outbound Discogs links tagged: `?utm_source=milkcrate&utm_medium=referral&utm_campaign=store_browse&utm_content={store_slug}`

Click events logged server-side via `after_action` filter or Rack middleware. Model: `ClickEvent(store_id:, listing_id:, referrer:, user_agent:, created_at:)`. Admin dashboard displays click data.

### 9. LLMs.txt

`/llms.txt` — markdown summary for AI crawlers (llmstxt.org standard, consumed by ChatGPT, Perplexity, Google AI):
```markdown
# Milkcrate
> Browse vinyl records like a record store. Curated Discogs storefronts for independent record shops.

## Stores
- [Philadelphia Music](/philadelphiamusic): 90,000+ vinyl records across Electronic, Rock, Jazz
- [Super Micah](/supermicah): Techno and electronic vinyl specialist
- [Browse all stores](/explore)

## API
- Store pages are SSR-rendered with JSON-LD structured data for machine consumption.
```

`/llms-full.txt` with full store listing if store count is manageable (<200).

## Implementation Plan

### Phase 1: Foundation
1. Enable Inertia SSR + audit React components for SSR compatibility
2. Add canonical URL support to layout + all controllers

### Phase 2: Indexing Infrastructure
3. Build `sitemap.xml` generator (gem + rake task + cron)
4. Write proper `robots.txt`
5. Add Discogs location scraping to store sync/onboarding

### Phase 3: Content & Structured Data
6. Implement genre diversity detection on Store model
7. Expand `SeoHelper` — genre-aware titles/descriptions, per-page JSON-LD, location-aware meta, BreadcrumbList
8. Update all controller actions with revised keyword-optimized titles/descriptions

### Phase 4: Agents & Conversion
9. Write `llms.txt` and `llms-full.txt`
10. UTM tagging on outbound Discogs links + click event tracking + admin dashboard

Each phase is deployable independently.

## Testing Strategy

- **SSR:** Request specs asserting rendered HTML content, `<title>`, `<meta>`, `<link rel="canonical">`, JSON-LD `<script>` tags present
- **Sitemap:** Assert XML includes all active stores, excludes non-public routes, validates against sitemap schema
- **Structured data:** Validate JSON-LD against schema.org types
- **Genre diversity:** Unit tests for narrow vs broad detection across sample genre distributions
- **UTM/click tracking:** Assert UTM params on outbound links, click event creation
- **robots.txt:** Assert content type and disallow rules

## Out of Scope

- Removing or redesigning `/apply` page (separate issue)
- Custom JSON API for agents (not a known consumption pattern; LLMs.txt + SSR + JSON-LD sufficient)
- Content changes to React components beyond SSR compatibility guards

## Constraints

- SEO metadata lives in Rails controllers only. No React-side head management.
- SSR must not break existing client-side functionality.
- Sitemap must stay under 50,000 URLs.
- Location data is best-effort — many Discogs sellers don't set it.
- Genre diversity detection uses existing listing genre data. Accuracy depends on sync quality.
