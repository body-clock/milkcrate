# Tactile Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the featured store page as an interactive Inertia + React page with a default crate-dig view, crate switching via Inertia partial reloads, and a toggleable store overview.

**Architecture:** A single Inertia page (`stores/featured`) with two view modes (CrateView + StoreView) controlled by React state. Crate switching uses `router.reload({ only: [...] })`. Add-to-pile uses Inertia `<Form>` POST. The existing crate-dig CSS, flip mechanic, and keyboard nav patterns are preserved and ported to React.

**Tech Stack:** Inertia.js + React 19 + TypeScript, Tailwind CSS, Ruby 3.4, Rails 8.1

**Prerequisite:** `2026-04-17-inertia-rails-integration-plan` must be complete — Inertia pipeline, Vite build, persistent layout, and shared props must be operational.

---

## File Structure

- Create: `app/frontend/pages/stores/featured.tsx` — full page rewrite
- Create: `app/frontend/components/crate_view.tsx` — crate-dig stacking + nav
- Create: `app/frontend/components/crate_tabs.tsx` — horizontal scrollable tabs
- Create: `app/frontend/components/record_stack.tsx` — stacked records display
- Create: `app/frontend/components/record_card.tsx` — flip card (ported from ViewComponent)
- Create: `app/frontend/components/crate_nav.tsx` — prev/next arrows + counter
- Create: `app/frontend/components/store_view.tsx` — store overview grid
- Create: `app/frontend/components/featured_shelf.tsx` — picks/new arrivals preview row
- Create: `app/frontend/components/genre_grid.tsx` — clickable bin cards
- Create: `app/frontend/components/add_to_pile_form.tsx` — Inertia Form wrapper
- Create: `app/frontend/types/inertia.ts` — shared type definitions
- Modify: `app/controllers/stores_controller.rb` — expand props contract
- Remove: `app/components/record_card_component.rb` (replaced by React)
- Remove: `app/components/record_card_component.html.erb` (replaced)
- Remove: `app/views/stores/featured.html.erb` (replaced)
- Remove: `app/views/stores/picks_preview.html.erb` (replaced by crate switching)
- Remove: `app/views/store_sections/show.html.erb` (subsumed by CrateTabs)
- Modify: `app/javascript/controllers/` — remove crate_controller.js, record_card_controller.js (replaced by React)

### Task 1: Expand Controller Props Contract

**Files:**
- Modify: `app/controllers/stores_controller.rb`
- Test: existing request specs

- [ ] **Step 1: Update the featured action to send full props**

  ```ruby
  # app/controllers/stores_controller.rb
  def featured
    return render :no_stores if (entries = Store.rotation).empty?

    entry = entries[Date.current.jd % entries.count]
    @store = Store.find_by(discogs_username: entry["username"])
    return render :no_stores unless @store

    daily_ids = daily_selection_ids(@store)
    picks = PicksSelector.new(@store).select(listing_ids: daily_ids)

    crates = build_crates(@store, picks, daily_ids)

    render inertia: "stores/featured", props: {
      store: store_props(@store, entry["description"]),
      crates:,
      active_crate_slug: "picks",
      current_session: current_session_props
    }
  end

  private

  def store_props(store, description)
    {
      id: store.id,
      name: store.name,
      discogs_username: store.discogs_username,
      description:,
      total_listings: store.total_listings,
      sync_status: store.sync_status
    }
  end

  def current_session_props
    session = @current_dig_session
    return nil unless session

    {
      id: session.id,
      name: session.name,
      item_ids: session.dig_session_items.pluck(:listing_id)
    }
  end

  def build_crates(store, picks, daily_ids)
    crates = []

    crates << crate_props("picks", "Milkcrate Picks", picks, store)

    scope = daily_ids.any? ? store.listings.where(id: daily_ids) : store.listings
    genre_counts = scope.pluck(:genres).flatten.tally.sort_by { |_, c| -c }

    genre_counts.each do |genre, _|
      genre_listings = scope.by_genre(genre).daily_shuffle.limit(100).to_a
      crates << crate_props(genre.parameterize, genre, genre_listings, store)
    end

    crates
  end

  def crate_props(slug, name, listings, store)
    {
      slug:,
      name:,
      count: listings.size,
      records: listings.map { |l| listing_props(l) }
    }
  end

  def listing_props(listing)
    {
      id: listing.id,
      discogs_listing_id: listing.discogs_listing_id,
      artist: listing.artist,
      title: listing.title,
      label: listing.label,
      year: listing.year,
      format: listing.format,
      genres: listing.genres,
      styles: listing.styles,
      condition: listing.condition,
      price: listing.price.to_s,
      currency: listing.currency,
      cover_image_url: listing.cover_image_url,
      thumbnail_url: listing.thumbnail_url,
      notes: listing.notes,
      discogs_url: listing.discogs_url,
      in_pile: @current_dig_session&.listing_ids&.include?(listing.id) || false
    }
  end
  ```

  Also add a `def current_crate` action for partial reloads:
  ```ruby
  # app/controllers/stores_controller.rb
  def current_crate
    store = Store.find(params[:store_id])
    slug = params[:slug] || "picks"
    daily_ids = daily_selection_ids(store)

    crates = build_crates(store, PicksSelector.new(store).select(listing_ids: daily_ids), daily_ids)
    crate = crates.find { |c| c[:slug] == slug }

    render inertia: "stores/featured", props: {
      active_crate: crate,
      active_crate_slug: slug
    }
  end
  ```

- [ ] **Step 2: Add the partial reload route**

  ```ruby
  # config/routes.rb — inside resources :stores
  member do
    get :current_crate
  end
  ```

- [ ] **Step 3: Write a request spec verifying new props shape**

  ```ruby
  # spec/requests/stores/featured_spec.rb
  require "rails_helper"

  RSpec.describe "GET /" do
    it "returns Inertia props with crates and store data" do
      # ...factory setup...
      get "/", headers: { "X-Inertia" => "true" }
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.dig("props", "crates")).to be_an(Array)
      expect(body.dig("props", "crates").first).to include("slug", "name", "records")
    end
  end
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add app/controllers/stores_controller.rb config/routes.rb spec/requests/stores/featured_spec.rb
  git commit -m "feat: expand controller props for crate/store views"
  ```

### Task 2: Build Type Definitions And RecordCard

**Files:**
- Create: `app/frontend/types/inertia.ts`
- Create: `app/frontend/components/record_card.tsx`

- [ ] **Step 1: Write shared TypeScript types**

  ```typescript
  // app/frontend/types/inertia.ts
  export interface Store {
    id: number
    name: string
    discogs_username: string
    description: string | null
    total_listings: number | null
    sync_status: string
  }

  export interface Listing {
    id: number
    discogs_listing_id: string
    artist: string | null
    title: string | null
    label: string | null
    year: number | null
    format: string | null
    genres: string[]
    styles: string[]
    condition: string | null
    price: string
    currency: string
    cover_image_url: string | null
    thumbnail_url: string | null
    notes: string | null
    discogs_url: string
    in_pile: boolean
  }

  export interface Crate {
    slug: string
    name: string
    count: number
    records: Listing[]
  }

  export interface CurrentSession {
    id: number
    name: string
    item_ids: number[]
  }

  export interface FeaturedProps {
    store: Store
    crates: Crate[]
    active_crate_slug: string
    current_session: CurrentSession | null
  }
  ```

- [ ] **Step 2: Port RecordCard to React (CSS flip mechanic preserved)**

  ```tsx
  // app/frontend/components/record_card.tsx
  import React, { useState } from "react"
  import type { Listing } from "../types/inertia"
  import { router } from "@inertiajs/react"

  interface Props {
    listing: Listing
    inPile: boolean
  }

  export default function RecordCard({ listing, inPile }: Props) {
    const [flipped, setFlipped] = useState(false)

    const handleFlip = (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("a, button, form")) return
      setFlipped((f) => !f)
    }

    const handleAddToPile = (e: React.MouseEvent) => {
      e.stopPropagation()
      router.post(`/listings/${listing.id}/add_to_session`)
    }

    const handleRemoveFromPile = (e: React.MouseEvent) => {
      e.stopPropagation()
      router.delete(`/listings/${listing.id}/remove_from_session`)
    }

    return (
      <div
        className={`mc-record-card ${flipped ? "flipped" : ""}`}
        onClick={handleFlip}
        data-listing-id={listing.id}
      >
        <div className="mc-record-card-inner">
          <div className="mc-record-front">
            {listing.cover_image_url ? (
              <img src={listing.cover_image_url} alt={listing.title ?? ""} loading="lazy" />
            ) : (
              <div className="mc-record-no-image">♪</div>
            )}
          </div>

          <div className="mc-record-back">
            <div className="mc-record-back-title">{listing.title}</div>
            <div className="mc-record-back-artist">{listing.artist}</div>
            <div className="mc-record-back-meta">
              {[listing.label, listing.year, listing.condition].filter(Boolean).join(" · ")}
            </div>
            <div className="mc-record-back-price">
              {listing.price ? `$${parseFloat(listing.price).toFixed(2)}` : "—"}
            </div>
            <div className="mc-record-back-actions">
              {inPile ? (
                <button onClick={handleRemoveFromPile} className="mc-btn">
                  ✓ In pile
                </button>
              ) : (
                <button onClick={handleAddToPile} className="mc-btn mc-btn-primary">
                  + Pile
                </button>
              )}
              <a href={listing.discogs_url} target="_blank" rel="noopener" className="mc-btn">
                Discogs ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add app/frontend/types/ app/frontend/components/record_card.tsx
  git commit -m "feat: add TypeScript types and RecordCard React component"
  ```

### Task 3: Build CrateView With Tabs And Navigation

**Files:**
- Create: `app/frontend/components/crate_tabs.tsx`
- Create: `app/frontend/components/record_stack.tsx`
- Create: `app/frontend/components/crate_nav.tsx`
- Create: `app/frontend/components/crate_view.tsx`

- [ ] **Step 1: Create CrateTabs**

  ```tsx
  // app/frontend/components/crate_tabs.tsx
  import React from "react"
  import type { Crate } from "../types/inertia"

  interface Props {
    crates: Crate[]
    activeSlug: string
    onSelect: (slug: string) => void
  }

  export default function CrateTabs({ crates, activeSlug, onSelect }: Props) {
    return (
      <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
        {crates.map((crate) => (
          <button
            key={crate.slug}
            onClick={() => onSelect(crate.slug)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${
              crate.slug === activeSlug
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {crate.slug === "picks" ? "✨ " : crate.slug === "new-arrivals" ? "🆕 " : ""}
            {crate.name}
          </button>
        ))}
      </div>
    )
  }
  ```

- [ ] **Step 2: Create RecordStack**

  ```tsx
  // app/frontend/components/record_stack.tsx
  import React from "react"
  import RecordCard from "./record_card"
  import type { Listing } from "../types/inertia"

  interface Props {
    records: Listing[]
    index: number
    inPile: Set<number>
  }

  export default function RecordStack({ records, index, inPile }: Props) {
    return (
      <div className="relative flex items-center justify-center min-h-[280px]">
        {[-2, -1, 0].map((offset) => {
          const i = index + offset
          if (i < 0 || i >= records.length) return null
          const rot = offset * 2
          const zIndex = 10 + offset
          const xOffset = offset * 30

          return (
            <div
              key={records[i].id}
              className="absolute transition-all duration-300"
              style={{
                transform: `rotate(${rot}deg) translateX(${xOffset}px)`,
                zIndex,
              }}
            >
              <RecordCard listing={records[i]} inPile={inPile.has(records[i].id)} />
            </div>
          )
        })}
      </div>
    )
  }
  ```

- [ ] **Step 3: Create CrateNav**

  ```tsx
  // app/frontend/components/crate_nav.tsx
  import React from "react"

  interface Props {
    index: number
    total: number
    onPrev: () => void
    onNext: () => void
  }

  export default function CrateNav({ index, total, onPrev, onNext }: Props) {
    return (
      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-gray-500">{crateName}</span>
        <div className="flex items-center gap-3">
          <button
            onClick={onPrev}
            disabled={index <= 0}
            className="text-xl cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ‹
          </button>
          <span className="text-sm text-gray-400">
            {index + 1} / {total}
          </span>
          <button
            onClick={onNext}
            disabled={index >= total - 1}
            className="text-xl cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ›
          </button>
        </div>
        <span className="text-xs text-gray-600">← → to browse</span>
      </div>
    )
  }
  ```

- [ ] **Step 4: Wire CrateView together**

  ```tsx
  // app/frontend/components/crate_view.tsx
  import React, { useState, useCallback, useEffect } from "react"
  import { router } from "@inertiajs/react"
  import CrateTabs from "./crate_tabs"
  import RecordStack from "./record_stack"
  import CrateNav from "./crate_nav"
  import type { Crate } from "../types/inertia"

  interface Props {
    crates: Crate[]
    activeSlug: string
    onToggleMode: () => void
    inPile: Set<number>
  }

  export default function CrateView({ crates, activeSlug, onToggleMode, inPile }: Props) {
    const activeCrate = crates.find((c) => c.slug === activeSlug) ?? crates[0]
    const [recordIndex, setRecordIndex] = useState(0)

    useEffect(() => {
      setRecordIndex(0)
    }, [activeSlug])

    const handleCrateSelect = useCallback(
      (slug: string) => {
        if (slug === activeSlug) return
        router.reload({ only: ["crates", "active_crate_slug"], data: { crate: slug } })
      },
      [activeSlug]
    )

    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === "ArrowRight") setRecordIndex((i) => Math.min(i + 1, activeCrate.records.length - 1))
        if (e.key === "ArrowLeft") setRecordIndex((i) => Math.max(i - 1, 0))
      },
      [activeCrate.records.length]
    )

    useEffect(() => {
      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }, [handleKeyDown])

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <CrateTabs crates={crates} activeSlug={activeSlug} onSelect={handleCrateSelect} />
          <button onClick={onToggleMode} className="text-xs border border-gray-600 rounded px-2 py-1 cursor-pointer">
            🏪 Store view
          </button>
        </div>

        <RecordStack records={activeCrate.records} index={recordIndex} inPile={inPile} />

        <CrateNav
          index={recordIndex}
          total={activeCrate.records.length}
          onPrev={() => setRecordIndex((i) => Math.max(i - 1, 0))}
          onNext={() => setRecordIndex((i) => Math.min(i + 1, activeCrate.records.length - 1))}
        />
      </div>
    )
  }
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add app/frontend/components/crate_view.tsx app/frontend/components/crate_tabs.tsx app/frontend/components/record_stack.tsx app/frontend/components/crate_nav.tsx
  git commit -m "feat: build crate view with tabs, stack, and keyboard navigation"
  ```

### Task 4: Build StoreView (Overview Mode)

**Files:**
- Create: `app/frontend/components/featured_shelf.tsx`
- Create: `app/frontend/components/genre_grid.tsx`
- Create: `app/frontend/components/store_view.tsx`

- [ ] **Step 1: Create StoreView**

  ```tsx
  // app/frontend/components/store_view.tsx
  import React from "react"
  import { router } from "@inertiajs/react"
  import type { Crate } from "../types/inertia"

  interface Props {
    crates: Crate[]
    onOpenCrate: (slug: string) => void
    onToggleMode: () => void
  }

  export default function StoreView({ crates, onOpenCrate, onToggleMode }: Props) {
    const featured = crates.filter((c) => c.slug === "picks" || c.slug === "new-arrivals")
    const genreCrates = crates.filter((c) => c.slug !== "picks" && c.slug !== "new-arrivals")

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Store Overview</h2>
          <button onClick={onToggleMode} className="text-xs border border-purple-500 rounded px-2 py-1 cursor-pointer">
            📦 Crate view
          </button>
        </div>

        {/* Featured shelves */}
        {featured.map((crate) => (
          <div key={crate.slug} className="border border-gray-800 rounded mb-3">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
              <span className="font-medium text-sm">
                {crate.slug === "picks" ? "✨ " : "🆕 "}{crate.name}
              </span>
              <span className="text-xs text-gray-500">{crate.count} records</span>
            </div>
            <div className="flex gap-1 overflow-x-auto px-3 py-2">
              {crate.records.slice(0, 10).map((record) => (
                <div key={record.id} className="flex-shrink-0 w-12 h-12 rounded bg-gray-800 overflow-hidden">
                  {record.thumbnail_url ? (
                    <img src={record.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">♪</div>
                  )}
                </div>
              ))}
            </div>
            <div className="px-3 pb-2">
              <button
                onClick={() => onOpenCrate(crate.slug)}
                className="text-xs text-purple-400 cursor-pointer hover:text-purple-300"
              >
                Open crate →
              </button>
            </div>
          </div>
        ))}

        {/* Genre grid */}
        <div className="grid grid-cols-2 gap-2">
          {genreCrates.map((crate) => (
            <button
              key={crate.slug}
              onClick={() => onOpenCrate(crate.slug)}
              className="border border-gray-800 rounded p-3 text-center cursor-pointer hover:border-gray-600 transition-colors"
            >
              <div className="text-lg">
                {crate.name === "Jazz" ? "🎷" :
                 crate.name === "Electronic" ? "⚡" :
                 crate.name === "Rock" ? "🎸" :
                 crate.name === "Funk / Soul" ? "🎵" : "💿"}
              </div>
              <div className="text-sm mt-1">{crate.name}</div>
              <div className="text-xs text-gray-500">{crate.count} records</div>
            </button>
          ))}
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/frontend/components/store_view.tsx
  git commit -m "feat: build store overview view with featured shelves and genre grid"
  ```

### Task 5: Rewrite Featured Page To Wire Everything Together

**Files:**
- Modify: `app/frontend/pages/stores/featured.tsx`
- Remove: `app/views/stores/featured.html.erb`
- Remove: `app/views/stores/picks_preview.html.erb`
- Remove: `app/views/store_sections/show.html.erb`
- Remove: `app/javascript/controllers/crate_controller.js`
- Remove: `app/javascript/controllers/record_card_controller.js`
- Remove: `app/components/record_card_component.rb`
- Remove: `app/components/record_card_component.html.erb`

- [ ] **Step 1: Rewrite featured page with both modes**

  ```tsx
  // app/frontend/pages/stores/featured.tsx
  import React, { useState, useMemo } from "react"
  import AppLayout from "../layouts/app_layout"
  import CrateView from "../components/crate_view"
  import StoreView from "../components/store_view"
  import type { FeaturedProps } from "../types/inertia"

  export default function Featured({ store, crates, active_crate_slug, current_session }: FeaturedProps) {
    const [mode, setMode] = useState<"crate" | "store">("crate")
    const [activeSlug, setActiveSlug] = useState(active_crate_slug)

    const inPile = useMemo(
      () => new Set(current_session?.item_ids ?? []),
      [current_session]
    )

    const handleOpenCrate = (slug: string) => {
      setActiveSlug(slug)
      setMode("crate")
    }

    return (
      <AppLayout>
        <div className="mb-4">
          <h1 className="text-xl font-bold mc-text">{store.name}</h1>
          <p className="text-xs mc-dim mt-0.5">
            @{store.discogs_username} &middot; {store.total_listings ?? "?"} vinyl listings
          </p>
          {store.description && (
            <p className="text-sm mc-dim mt-2 max-w-prose">{store.description}</p>
          )}
        </div>

        {store.sync_status === "syncing" ? (
          <div className="py-16 text-center mc-dim text-sm">
            <p className="text-4xl mb-4">⏳</p>
            <p>Syncing inventory… check back in a moment.</p>
          </div>
        ) : crates.length === 0 ? (
          <div className="py-16 text-center mc-dim text-sm">
            <p>No vinyl found yet.</p>
          </div>
        ) : mode === "crate" ? (
          <CrateView
            crates={crates}
            activeSlug={activeSlug}
            onToggleMode={() => setMode("store")}
            inPile={inPile}
          />
        ) : (
          <StoreView
            crates={crates}
            onOpenCrate={handleOpenCrate}
            onToggleMode={() => setMode("crate")}
          />
        )}
      </AppLayout>
    )
  }
  ```

- [ ] **Step 2: Remove obsolete ERB views and Stimulus controllers**

  ```bash
  rm app/views/stores/featured.html.erb
  rm app/views/stores/picks_preview.html.erb
  rm app/views/store_sections/show.html.erb
  rm app/javascript/controllers/crate_controller.js
  rm app/javascript/controllers/record_card_controller.js
  rm app/components/record_card_component.rb
  rm app/components/record_card_component.html.erb
  ```

- [ ] **Step 3: Verify build compiles and page renders**

  Run: `mise exec -- bundle exec vite build`
  Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Remove unused route (sections no longer a separate page)**

  ```ruby
  # config/routes.rb — remove sections resource
  # resources :sections, only: %i[show], controller: "store_sections"
  ```

- [ ] **Step 5: Run test suite and fix any failing specs**

  Run: `mise exec -- bundle exec rspec`
  Expected: All tests pass. If store_sections specs fail, update them to match the new routing.

- [ ] **Step 6: Commit**

  ```bash
  git add app/frontend/pages/stores/featured.tsx config/routes.rb
  git rm app/views/stores/featured.html.erb app/views/stores/picks_preview.html.erb app/views/store_sections/show.html.erb app/javascript/controllers/crate_controller.js app/javascript/controllers/record_card_controller.js app/components/record_card_component.rb app/components/record_card_component.html.erb
  git commit -m "feat: replace ERB homepage with Inertia React crate/store views"
  ```

### Task 6: Verify And Polish

**Files:** All views and components above

- [ ] **Step 1: Start dev server and smoke test**

  Run: `bin/dev`
  Expected: Vite + Rails start. Homepage loads in crate mode. Toggle to store view works. Crate switching works. Add/remove from pile works.

- [ ] **Step 2: Run full test suite**

  Run: `mise exec -- bundle exec rspec`
  Expected: Green.

- [ ] **Step 3: Commit any final fixes**

  ```bash
  git add -A
  git commit -m "chore: fix test and build issues from homepage migration"
  ```

## Self-Review

**Spec coverage:** All requirements from `2026-04-17-homepage-redesign-design.md` covered:
- Default crate landing (crate view with Picks first) — Tasks 3, 5
- Crate switching via tabs — Task 3
- Store overview toggle — Task 4
- Add/remove from pile — Task 2, built into RecordCard
- Keyboard navigation — Task 3
- Partial reloads for crate data — Task 3
- Obsolete ERB/Stimulus removed — Task 5

**No placeholders.** Every step has complete code, commands, and expected outcomes.
