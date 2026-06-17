---
title: "feat: Add horizontal scroll rail of curated records to explore page"
type: feat
status: completed
date: 2026-06-15
origin: docs/brainstorms/explore-records-wall.md
---

# Explore Page Records Wall

## Summary

Add a Netflix-style horizontal scroll rail to the top of the explore page showing curated records from across all stores. Each record tile displays only cover art; tapping navigates to the store's crate view. The rail reuses existing wall curation logic (RecordScorer + WallPolicy) aggregated across all ready stores.

---

## Problem Frame

The explore page currently shows a directory of record stores that first-time visitors don't recognize. Analytics show 22 visitors entered on `/explore` with an average time of 13 seconds and 72% of all exits. Visitors from Reddit and Hacker News see store names like "BKRecordExchange" — which mean nothing to them — and leave without clicking through. The page has no hook that demonstrates the actual product experience (browsing records in crates). (see origin: docs/brainstorms/explore-records-wall.md)

---

## Requirements

- R1. Display a horizontal scroll rail of curated records at the top of the explore page
- R2. Sample records from across all stores using existing wall curation logic
- R3. Each record tile displays only cover art; tapping reveals details and store name
- R4. Clicking a record tile navigates to that store's crate view
- R5. The rail displays approximately 20-30 records, showing 3-4 at a time
- R6. The rail uses horizontal scroll consistent across all screen sizes
- R7. The wall has a distinct visual identity from the per-store wall
- R8. The horizontal scroll rail works with touch gestures on mobile
- R9. The store directory remains unchanged below the rail

**Origin flows:** F1. Visitor lands on explore → sees records wall → taps record → lands in store crate

---

## Scope Boundaries

- In scope: Cross-store curation service, featured_records prop, horizontal scroll rail component, navigation to store crate
- Out of scope: Genre filtering (separate feature), changing where external links point, altering the store directory
- Deferred for later: Editorial curation controls, rotating/refreshing the featured set on a schedule

---

## Context & Research

### Relevant Code and Patterns

- **Curation logic**: `app/services/storefront_curation.rb` — builds wall using `RecordScorer` + `WallPolicy` for genre diversity
- **Wall strategy**: `app/services/crate_strategies/wall.rb` — selects 12 records with genre diversity cap (max count/3 per genre)
- **Scoring**: `app/services/record_scorer.rb` — pluggable strategies (Vintage, Condition, Desirability, etc.)
- **Horizontal scroll pattern**: `app/frontend/components/crate_tabs_horizontal.tsx` — uses `overflow-x-auto snap-x snap-mandatory` with flex children
- **RecordTile**: `app/frontend/components/record_tile.tsx` — cover-only display component
- **Explore page**: `app/frontend/pages/explore.tsx` — current structure with HeaderSection, FeaturedSection, DirectoryBody
- **Explore controller**: `app/controllers/explore_controller.rb` — returns stores, featured_stores, copy, error
- **Caching**: `StorefrontCuration::CacheManager` pattern — cache serialized payload with store/date/version in key

### External References

- None required — local patterns are sufficient

---

## Key Technical Decisions

- **Reuse existing scoring infrastructure**: Create a new service that queries across all ready stores and applies the same `RecordScorer` + `WallPolicy` logic rather than building a new algorithm
- **Lightweight prop**: Strip the Listing type down to `{ id, title, artist, cover_image_url, store_slug }` for the rail prop to minimize payload
- **Horizontal scroll pattern**: Use `overflow-x-auto snap-x snap-mandatory` with flex children, matching the existing pattern in `crate_tabs_horizontal.tsx`
- **Cache on same cadence as explore page**: 24-hour TTL, invalidated when stores sync

---

## Open Questions

### Resolved During Planning

- Q: How to query across all stores efficiently? A: Use `Listing.joins(:store).where(store: Store.ready)` with the same scoring and diversity cap logic from `WallPolicy`
- Q: How to link from record to store? A: Each record includes `store_slug` (from `store.discogs_username`), link to `/:store_slug`

### Deferred to Implementation

- Q: Exact query performance with 36+ stores? A: Validate during implementation; may need indexing or pagination if slow

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification.*

```
┌─────────────────────────────────────────────────────────────┐
│ ExploreController#index                                     │
│  ├─ @stores = Store.ready                                   │
│  ├─ @featured_stores = cached_featured_sample               │
│  └─ @featured_records = CrossStoreWallCuration.call(limit: 24) │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ CrossStoreWallCuration                                      │
│  1. Query: Listing.joins(:store).where(store: Store.ready)  │
│  2. Score: RecordScorer.score(listing) for each             │
│  3. Diversity: WallPolicy genre cap (max count/3 per genre) │
│  4. Sort: score desc, take top N                            │
│  5. Return: [{ id, title, artist, cover_image_url,         │
│               store_slug, store_name }]                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ ExplorePage (React)                                         │
│  <HeaderSection />                                          │
│  <FeaturedRecordsRail records={featured_records} />  ← NEW │
│  <FeaturedSection stores={featured_stores} />               │
│  <DirectoryBody stores={stores} />                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ FeaturedRecordsRail                                         │
│  <section>                                                  │
│    <h2>Featured Records</h2>                                │
│    <div class="flex overflow-x-auto snap-x snap-mandatory"> │
│      {records.map(r =>                                      │
│        <Link href={`/${r.store_slug`}>                      │
│          <RecordTile listing={r} />                         │
│        </Link>                                              │
│      )}                                                     │
│    </div>                                                   │
│  </section>                                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Units

### U1. Cross-store curation service

**Goal:** Create a service that queries across all ready stores and returns curated records using existing scoring and diversity logic

**Requirements:** R2

**Dependencies:** None

**Files:**
- Create: `app/services/cross_store_wall_curation.rb`
- Test: `test/services/cross_store_wall_curation_test.rb`

**Approach:**
- Query `Listing.joins(:store).where(store: Store.ready)` with conditions (cover_image_url present, listed within last year)
- Score each listing using `RecordScorer.score(listing)`
- Apply `WallPolicy` genre diversity cap (max count/3 per genre, minimum 2)
- Sort by score descending, take top N (default 24)
- Return array of lightweight hashes: `{ id, title, artist, cover_image_url, store_slug, store_name }`
- Cache the result with 24-hour TTL, key includes store count and date

**Technical design:**

```ruby
class CrossStoreWallCuration
  DEFAULT_LIMIT = 24
  CACHE_TTL = 24.hours

  def self.call(limit: DEFAULT_LIMIT)
    new(limit).call
  end

  def call
    Rails.cache.fetch(cache_key, expires_in: CACHE_TTL) do
      listings = Listing.joins(:store)
        .where(stores: { status: :ready })
        .where.not(cover_image_url: nil)
        .where("listed_at > ?", 1.year.ago)

      scored = listings.map { |l| [l, RecordScorer.score(l)] }
      diverse = WallPolicy.apply_diversity_cap(scored, limit: @limit)

      diverse.map do |listing, score|
        {
          id: listing.id,
          title: listing.title,
          artist: listing.artist,
          cover_image_url: listing.cover_image_url,
          store_slug: listing.store.discogs_username,
          store_name: listing.store.name
        }
      end
    end
  end
end
```

**Patterns to follow:**
- `app/services/storefront_curation.rb` — scoring and diversity cap pattern
- `app/services/wall_policy.rb` — genre diversity logic

**Test scenarios:**
- Happy path: Given 5 ready stores with 100+ listings each, when call runs, then returns up to 24 records with cover images from multiple stores
- Edge case: Given no ready stores, when call runs, then returns empty array
- Edge case: Given stores with no listings, when call runs, then returns empty array
- Edge case: Given listings without cover images, when call runs, then excludes them from results
- Integration: Given a listing in the wall, when call runs, then that listing's store_slug matches its store's discogs_username

**Verification:**
- Service returns an array of hashes with required keys
- Results include records from multiple stores
- Genre diversity cap is applied (no more than max/3 per genre)
- Cache key changes when store count or date changes

---

### U2. Add featured_records prop to ExploreController

**Goal:** Wire the cross-store curation service into the explore page and pass records as an Inertia prop

**Requirements:** R1, R2

**Dependencies:** U1

**Files:**
- Modify: `app/controllers/explore_controller.rb`
- Test: `test/controllers/explore_controller_test.rb`

**Approach:**
- Call `CrossStoreWallCuration.call(limit: 24)` in the controller action
- Add `featured_records:` to the Inertia render props
- Cache the result alongside the existing explore cache

**Patterns to follow:**
- `app/controllers/explore_controller.rb` — existing prop serialization pattern
- `app/controllers/stores_controller.rb` — how store data is passed to Inertia

**Test scenarios:**
- Happy path: Given stores with listings, when GET /explore, then response includes `featured_records` array with 24 or fewer records
- Happy path: Given the featured_records prop, when inspecting a record, then it has id, title, artist, cover_image_url, store_slug, store_name
- Edge case: Given no ready stores, when GET /explore, then `featured_records` is empty array

**Verification:**
- Explore page loads without errors
- `featured_records` prop is present in Inertia response
- Records include store_slug for navigation

---

### U3. Create FeaturedRecordsRail component

**Goal:** Build the horizontal scroll rail component that displays curated records

**Requirements:** R1, R3, R5, R6, R7, R8

**Dependencies:** None (can be built in parallel with U1-U2)

**Files:**
- Create: `app/frontend/components/explore_directory/featured_records_rail.tsx`
- Create: `app/frontend/components/explore_directory/featured_record_tile.tsx`
- Test: `app/frontend/components/explore_directory/featured_records_rail.test.tsx`

**Approach:**
- Create a new component in `explore_directory/` (co-located with existing explore components)
- Use `overflow-x-auto snap-x snap-mandatory` for horizontal scroll
- Each tile is a `<Link>` to `/:store_slug` wrapping a `RecordTile`
- Add section header "Featured Records" with record count
- Style distinctly from per-store wall: no peek sheet, no pagination dots, simpler treatment
- Use `flex` children with `snap-start` and fixed width tiles
- Support touch gestures via native scroll (no Framer Motion needed)

**Technical design:**

```tsx
// featured_records_rail.tsx
interface FeaturedRecord {
  id: number;
  title: string | null;
  artist: string | null;
  cover_image_url: string | null;
  store_slug: string;
  store_name: string;
}

interface Props {
  records: FeaturedRecord[];
  label: string;
}

export default function FeaturedRecordsRail({ records, label }: Props) {
  if (records.length === 0) return null;

  return (
    <section>
      <div className="mc-section-header">
        <h2 className="mc-section-name">{label}</h2>
        <span className="mc-section-count">{records.length}</span>
      </div>
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-4 -mx-4 px-4 sm:-mx-0 sm:px-0">
        {records.map((record) => (
          <FeaturedRecordTile key={record.id} record={record} />
        ))}
      </div>
    </section>
  );
}

// featured_record_tile.tsx
export default function FeaturedRecordTile({ record }: { record: FeaturedRecord }) {
  return (
    <Link
      href={`/${record.store_slug}`}
      className="snap-start shrink-0 w-[45vw] sm:w-[200px] lg:w-[220px] group"
    >
      <RecordTile listing={record} tactileHover />
      <p className="mt-2 text-xs text-mc-text-dim truncate">{record.store_name}</p>
    </Link>
  );
}
```

**Patterns to follow:**
- `app/frontend/components/crate_tabs_horizontal.tsx` — horizontal scroll pattern
- `app/frontend/components/explore_directory/featured_card.tsx` — section structure
- `app/frontend/components/record_tile.tsx` — cover-only display

**Test scenarios:**
- Happy path: Given 24 records, when rail renders, then shows 24 tiles in a horizontal scrollable row
- Happy path: Given a record with cover_image_url, when tile renders, then shows the cover image
- Happy path: Given a record without cover_image_url, when tile renders, then shows placeholder
- Edge case: Given empty records array, when rail renders, then renders nothing
- Happy path: Given a record, when tile is clicked, then navigates to `/:store_slug`
- Happy path: Given the rail on mobile, when user swipes horizontally, then scrolls through records

**Verification:**
- Component renders without errors
- Horizontal scroll works on mobile and desktop
- Each tile links to the correct store
- Store name is visible below each tile
- Visual identity is distinct from per-store wall

---

### U4. Integrate rail into explore page

**Goal:** Add the FeaturedRecordsRail to the explore page layout and wire up props

**Requirements:** R1, R4, R9

**Dependencies:** U2, U3

**Files:**
- Modify: `app/frontend/pages/explore.tsx`
- Modify: `app/frontend/types/inertia.ts` (add FeaturedRecord interface)
- Test: `app/frontend/test/pages/explore.test.tsx`

**Approach:**
- Add `FeaturedRecord` type to `inertia.ts`
- Add `featured_records: FeaturedRecord[]` to `ExploreDirectoryProps`
- Insert `<FeaturedRecordsRail />` between `<HeaderSection />` and `<FeaturedSection />`
- Pass `records={featured_records}` and `label={copy.featured_records_label}`
- Add `featured_records_label` to explore copy in `config/locales/en.yml`

**Patterns to follow:**
- `app/frontend/pages/explore.tsx` — existing page structure
- `app/frontend/pages/stores/show.tsx` — how props flow to components

**Test scenarios:**
- Happy path: Given featured_records prop, when explore page renders, then rail appears between header and featured stores
- Happy path: Given empty featured_records, when explore page renders, then rail does not appear
- Integration: Given the rail and directory, when page renders, then both sections are present

**Verification:**
- Explore page loads with the rail visible
- Rail appears in correct position (after header, before featured stores)
- Store directory remains unchanged below

---

### U5. Add featured_records_label to copy

**Goal:** Add the section label for the records rail to the locale file

**Requirements:** R1

**Dependencies:** None

**Files:**
- Modify: `config/locales/en.yml`

**Approach:**
- Add `featured_records_label: "Featured Records"` under `pages.explore`
- Pass this to the FeaturedRecordsRail component

**Test expectation: none — copy/label change**

**Verification:**
- Label appears in the explore page
- Label is translatable (in the locale file)

---

## System-Wide Impact

- **Interaction graph:** The explore page gains a new section; no existing callbacks or middleware affected
- **Error propagation:** If the curation service fails, the explore page should still render with an empty rail (graceful degradation)
- **State lifecycle risks:** None — this is a read-only feature with no state mutations
- **API surface parity:** The Inertia prop shape is new; no existing API changes
- **Unchanged invariants:** Store directory behavior, featured stores section, and header section remain unchanged

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Query performance with 36+ stores | Cache results for 24 hours; add database index on listings(store_id, cover_image_url, listed_at) if slow |
| WallPolicy expects single-store input | Verify WallPolicy works with cross-store listings; may need minor adaptation |
| Genre diversity cap may over-restrict with cross-store data | Test with real data; adjust limit or cap if needed |

---

## Documentation / Operational Notes

- No documentation changes needed for this feature
- Monitor explore page load time after deployment
- Consider adding analytics event when a record is clicked from the rail (future enhancement)

---

## Sources & References

- **Origin document:** docs/brainstorms/explore-records-wall.md
- Related code: `app/services/storefront_curation.rb`, `app/services/wall_policy.rb`, `app/services/record_scorer.rb`
- Related code: `app/frontend/components/crate_tabs_horizontal.tsx`, `app/frontend/components/record_tile.tsx`
