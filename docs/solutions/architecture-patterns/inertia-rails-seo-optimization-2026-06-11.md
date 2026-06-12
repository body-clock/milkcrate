---
title: Inertia Rails SEO optimization — SSR, structured data, and keyword-aware metadata
date: 2026-06-11
category: architecture-patterns
module: seo
problem_type: architecture_pattern
component: rails_controller
severity: medium
applies_when:
  - Setting up SEO from scratch in an Inertia Rails + React application
  - Adding server-side rendering to an Inertia app deployed with Kamal
  - Building genre-aware or keyword-optimized page metadata from database content
  - Choosing between controller-side and frontend-side head management in Inertia
  - Adding AI-crawler visibility (llms.txt) alongside traditional SEO
tags:
  - seo
  - inertia-ssr
  - structured-data
  - genre-diversity
  - canonical-urls
  - llms-txt
  - click-tracking
  - utm-tracking
related_components:
  - service_object
  - database
  - frontend_react
---

# Inertia Rails SEO optimization — SSR, structured data, and keyword-aware metadata

## Context

Milkcrate (Rails 8.1 + Inertia.js + React) had zero SEO infrastructure. Crawlers received empty HTML (SSR disabled), there was no sitemap, robots.txt was a comment, and every page fell back to a generic `<title>Milkcrate</title>`. Searching for the app by name or related keywords returned nothing. An Inertia SPA presents unique SEO challenges: crawlers that don't execute JavaScript see nothing, and metadata is normally managed server-side (Rails) while rendering happens client-side (React).

The app had the building blocks for SEO — a layout with `yield :head` and `content_for(:title)`, and a `SeoHelper` module with basic helpers — but no controller was populating them. The `_store_seo.html.erb` partial existed with OG/Twitter/JSON-LD markup but was never rendered.

## Guidance

### 1. Controller-side SEO is the right pattern for Inertia

In an Inertia app, the controller knows the page data before React renders. SEO metadata should flow through Rails controllers as a single source of truth, not through React-side head management (react-helmet, etc.). This avoids split-brain between Rails and React.

**Pattern:** Use a single `@page_seo` instance variable per controller action, set in a `before_action` or inline, that the layout reads:

```ruby
# Controller
before_action :set_page_seo

def set_page_seo
  @page_seo = page_seo_for(action_name)
end

# Layout (inertia_application.html.erb)
<title><%= @page_seo&.dig(:title) || "Milkcrate" %></title>
<% if @page_seo&.dig(:meta_description).present? %>
<meta name="description" content="<%= @page_seo[:meta_description] %>">
<% end %>
<% if @page_seo&.dig(:head_html).present? %>
<%= raw @page_seo[:head_html] %>
<% end %>
<%= canonical_link %>  <!-- reads @page_seo[:canonical_url] -->
```

This satisfies Sandi Metz Rule 4 (one ivar per action) and keeps controllers clean.

**Important:** `content_for` is a view helper, not available in controllers in Rails 8.1. Using instance variables avoids the issue entirely.

### 2. SEO copy belongs in en.yml

All page titles, meta descriptions, and store SEO templates should live in the locale file with `%{variable}` interpolation for dynamic values:

```yaml
seo:
  home:
    title: "Milkcrate — Browse Vinyl Records Like a Record Store"
    meta_description: "Discover vinyl records from independent record stores..."
  store:
    narrow_title: "%{store_name} — %{genre} Vinyl Records on Milkcrate"
    broad_title: "%{store_name} Vinyl Records — Browse on Milkcrate"
    narrow_description: "Browse %{store_name}'s %{genre} vinyl collection on Milkcrate — %{count} records..."
```

Tests should reference `I18n.t` keys, not hardcoded strings, so copy changes don't break tests.

### 3. SSR via Puma plugin (same container)

Inertia SSR requires a Node.js process to render React to HTML. The `inertia_rails` gem provides a Puma plugin (`plugin :inertia_ssr`) that spawns and manages the Node.js process in the same container as Puma. This avoids multi-container complexity:

```ruby
# config/puma.rb
plugin :inertia_ssr
```

The plugin handles health-checks, auto-restart on crash (exponential backoff to 16s), and graceful shutdown. Dev mode auto-detects the Vite dev server — no separate SSR process needed.

**Docker changes:**
- Install Node.js 22 in the final Docker stage (previously only in build stage for Vite compilation)
- Add `vite build --ssr` to the build pipeline
- No Kamal deploy.yml changes required — the Node.js process runs inside the same container

**SSR entry point** uses `ReactDOMServer.renderToString`:

```tsx
// app/frontend/ssr/ssr.tsx
createServer((page) =>
  createInertiaApp({
    page,
    render: ReactDOMServer.renderToString,
    resolve: (name) => { ... import.meta.glob patterns ... },
    setup: ({ App, props }) => <App {...props} />,
  }),
);
```

**Client-side:** Switch `createRoot` to `hydrateRoot`:
```tsx
// Before
createRoot(el).render(<App {...props} />);
// After (SSR compatible)
hydrateRoot(el, <App {...props} />);
```

### 4. Genre diversity detection for keyword optimization

A `GenreDiversityAnalyzer` classifies stores as "narrow" (80%+ of listings in one genre) or "broad". Narrow stores get genre-specific SEO (e.g., "Super Micah — Techno Vinyl Records on Milkcrate"). Broad stores list their top 3 genres.

```ruby
class GenreDiversityAnalyzer
  NARROW_THRESHOLD = 0.8

  def call
    return fallback if genre_totals.empty?
    total = genre_totals.values.sum
    dominant, dominant_count = genre_totals.max_by { |_, c| c }

    if dominant_count.to_f / total >= NARROW_THRESHOLD
      { narrow: true, dominant_genre: dominant, top_genres: top_genres }
    else
      { narrow: false, dominant_genre: nil, top_genres: top_genres }
    end
  end

  def genre_totals
    Listing.where(store_id: @store.id)
           .where.not(genres: [])
           .pluck(Arel.sql("unnest(genres)"))
           .each_with_object(Hash.new(0)) { |genre, counts| counts[genre] += 1 }
  end
end
```

The `unnest(genres)` PostgreSQL function efficiently expands the GIN-indexed array column.

### 5. Dynamic LLMs.txt from the database

LLMs.txt (llmstxt.org standard) serves AI crawler context. A controller serves it dynamically from the live database:

```ruby
# app/controllers/llms_controller.rb
class LlmsController < ApplicationController
  layout false
  def show
    @stores = Store.order(:name).select(:name, :discogs_username, :total_listings).limit(20)
  end
  def full
    @stores = Store.order(:name).select(:name, :discogs_username, :total_listings)
  end
end
```

Rendered as `text.erb` views with store links and descriptions. Routes go before the catch-all `/:slug` route.

### 6. UTM tracking for attribution

Outbound Discogs links get UTM parameters via a frontend utility:

```typescript
function buildUtmUrl(baseUrl: string, storeSlug: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set("utm_source", "milkcrate");
  // ...
  return url.toString();
}
```

Click events use `navigator.sendBeacon` for fire-and-forget tracking (works during page navigation):

```typescript
function trackClick(storeSlug: string, listingId: number): void {
  navigator.sendBeacon("/click", new URLSearchParams({
    store_slug: storeSlug,
    listing_id: String(listingId),
  }));
}
```

### 7. SSR and browser API compatibility

Inertia SSR in a Node.js environment means `window`, `document`, `localStorage`, and `matchMedia` are not available. The app already had proper guards, but if adding SSR to an existing Inertia app:

- **`typeof window === "undefined"`** guards in initializer functions (useState lazy initializers, module-level calls)
- **`useEffect`** for any side effects involving browser APIs (useEffect only runs on the client)
- Check components that access `localStorage` outside of useEffect, `document.querySelector` in function body, `window.matchMedia` outside useEffect

## Why This Matters

Without SSR, Inertia apps are invisible to non-JS crawlers. Without structured data, even rendered pages lack context for search engines to generate rich results. Without sitemaps, search engines may not discover all pages. Without tracking, you can't measure organic-to-Discogs conversion — the key metric for pitching the product to Discogs vendors.

The `@page_seo` pattern scales cleanly: adding a new page means adding a locale entry and a controller line. No React changes needed.

## When to Apply

- **Any Inertia Rails app** that needs SEO should use controller-side SEO, not react-helmet. The server knows the data; inject it there.
- **SSR enablement** is worth the deployment complexity when organic search traffic is a primary acquisition channel. For internal tools or authenticated-only apps, skip it.
- **Genre diversity detection** is specific to apps with variable-content storefronts where each store has a different genre focus. For uniform content sites, a simpler keyword strategy works.
- **Dynamic LLMs.txt** is useful for any public site that AI crawlers should understand. The llmstxt.org standard is consumed by ChatGPT, Perplexity, and Google AI.

## Examples

### Adding SEO to a new Inertia page

1. Add copy to `en.yml` under `pages.seo.<page_name>`:
```yaml
seo:
  about:
    title: "About — Milkcrate"
    meta_description: "Learn about Milkcrate, the curated Discogs storefront platform."
```

2. Wire in the controller:
```ruby
class PagesController < ApplicationController
  SEO_CONFIG["about"] = I18n.t("pages.seo.about")
end
```

3. No frontend changes needed — the layout reads @page_seo automatically.

### Narrow store detection flow

```
Store listings → GenreDiversityAnalyzer → { narrow?, dominant_genre, top_genres }
                                              ↓
                                        SeoHelper.seo_title(store)
                                              ↓
                                     Controller sets @page_seo[:title]
                                              ↓
                                      Layout renders <title> in HTML
```

## Related

- [Layout SEO readiness — yield :head pattern](https://inertia-rails.dev/guide/layout) in inertia_rails docs
- SSR documentation: `config/initializers/inertia_rails.rb` — see the `ssr_enabled`, `ssr_cache`, and `on_ssr_error` options
- `docs/superpowers/specs/2026-06-11-seo-optimization-design.md` — full design spec
- `docs/plans/2026-06-11-002-feat-storefront-seo-plan.md` — implementation plan with all 10 units
- llmstxt.org specification — `/llms.txt` standard for AI crawlers
- sitemap_generator gem — standard Rails sitemap generation
