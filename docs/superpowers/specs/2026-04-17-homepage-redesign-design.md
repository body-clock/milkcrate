# Tactile Homepage Redesign Design

## Goal

Rebuild the featured store page as an interactive, tactile Inertia + React page that drops the user into a crate view by default, with easy crate switching and a toggleable store overview.

## Prerequisites

Project 1 (Inertia Rails Integration) must be complete — the Inertia pipeline, Vite build, and persistent layout must be operational.

## Architecture

The controller renders a single Inertia page with all data as props. The React frontend manages two view modes (crate / store) with no server round-trips for mode switching. Crate switching triggers Inertia partial reloads.

### Component tree

```
persistent AppLayout
└── Stores/Featured (page)
    ├── StoreHeader
    │   ├── StoreName + record count
    │   └── ModeToggle (crate ↔ store, React state)
    │
    ├── CrateView (mode === 'crate')
    │   ├── CrateTabs
    │   │   └── tab per crate: Picks*, New Arrivals, Jazz, Electronic, etc.
    │   ├── RecordStack
    │   │   └── RecordCard (flip mechanic, CSS-based)
    │   ├── RecordActions (AddToPile / RemoveFromPile)
    │   └── CrateNav (counter, ← → buttons, keyboard handler)
    │
    └── StoreView (mode === 'store')
        ├── FeaturedShelf (picks + new arrivals as peekable rows)
        ├── GenreGrid (clickable bin cards)
        └── click bin → switches to CrateView for that crate
```

### Controller data contract

```
render inertia: 'stores/featured', props: {
  store: {
    id, name, discogs_username, description,
    total_listings, sync_status
  },
  crates: [
    {
      slug: 'picks',
      name: 'Milkcrate Picks',
      count: 20,
      records: [{ id, title, artist, styles, genres, year,
                  condition, price, cover_image_url,
                  thumbnail_url, discogs_url, in_pile: bool }]
    },
    {
      slug: 'new-arrivals',
      name: 'New Arrivals',
      count: 12,
      records: [...]
    },
    {
      slug: 'jazz',
      name: 'Jazz',
      count: 24,
      records: [...]
    }
    // ... one per genre section
  ],
  active_crate_slug: 'picks',
  total_records: 428,
  flash: {}
}
```

### Data flow

- **Page load**: Controller collects all crate previews (picks, new arrivals, genre sections) and full record data for the active crate. Single Inertia render.
- **Crate switch**: `router.reload({ only: ['active_crate'] })` — Inertia partial reload, server returns fresh record data for the selected crate.
- **Mode toggle** (crate ↔ store): React `useState`, instant, no server call.
- **Add to pile**: Inertia `<Form>` POST to `/listings/:id/add_to_session` → Inertia handles re-render with updated `in_pile` state.
- **Shuffle picks**: `router.get(picks_preview_path, { seed: new_seed })` — Inertia navigation, replaces current crate data.
- **Navigate between crates in Store View**: Clicking a bin card sets `active_crate_slug` + switches mode to `'crate'`.

### CrateView components

**CrateTabs**: Horizontal scrollable tabs. Active tab highlighted with accent color. Clicking a tab triggers partial reload. Tabs are: Picks (default, highlighted), New Arrivals, then genre sections in descending count order.

**RecordStack**: Shows current record prominently with previous record(s) offset behind it with a depth shadow effect. Same visual as existing crate-dig view. Only the current record and 1-2 depth records are rendered.

**RecordCard**: CSS flip mechanic preserved from current implementation. Front shows cover image (or fallback icon). Back shows title, artist, tracklist preview, meta, price, actions (add/remove from pile). Clicking the card toggles flip.

**CrateNav**: Counter ("3 / 20"), prev/next buttons, keyboard bindings (← →). Prev disabled at start, next disabled at end. Keyboard handler attached at the CrateView level.

### StoreView components

**FeaturedShelf**: Two compact rows showing Milkcrate Picks and New Arrivals as small cover thumbnails with a "Open crate →" link. Each row shows up to 10 records.

**GenreGrid**: 2-column grid of clickable bin cards. Each card shows an emoji icon, genre name, and record count. Clicking a bin switches to CrateView for that genre section.

### State management

| State | Owner | Mechanism |
|-------|-------|-----------|
| Current view mode (crate/store) | React | useState |
| Active crate slug | Server | Inertia props + partial reload |
| Current record index | React | useReducer |
| Card flipped state | React | CSS class toggle (per card) |
| In-pile status | Server | Inertia props, updated via Form POST |
| Dig session ID | Server | inertia_share + usePage |

### Crate data loading strategy

Key design question: do we load all records for all crates on page load, or lazy-load per crate?

**Recommended: lazy-load per crate.** The initial page render includes:
- Store metadata
- Crate list with names and counts (lightweight)
- Full record data for the active crate only (Picks)

Switching crates triggers `router.reload({ only: ['active_crate'] })` which fetches only the new crate's records. This keeps the initial payload small.

Exception: StoreView's FeaturedShelf shows preview thumbnails (first 5 records per featured crate). These are included in the initial props as `crate_previews`.

### Error handling

- Missing/invalid crate slug: server returns 404 Inertia response
- Sync still in progress: store.sync_status check in React, show waiting state
- Empty crate: CrateView shows "Nothing here yet" with a link to StoreView
- Failed add/remove: flash message through Inertia's flash mechanism

### Migration from current

The current `stores#featured` view and `stores#picks_preview` are replaced entirely. The current `store_sections#show` (crate-dig view per section) is also subsumed — all section browsing happens through the home page's CrateTabs.

Existing routes (`/stores/:id/sections/:slug`) can redirect to the homepage with the crate tab pre-selected, or be removed.

### Success criteria

- Landing on the homepage drops into the Picks crate immediately
- Switching crates via tabs triggers a partial reload
- Toggle between Crate and Store views is instant
- Adding/removing records from the pile works inline
- Keyboard navigation (← →) works in Crate mode
- Mobile swipe navigation works in Crate mode
- All existing specs pass (with route adjustments)
