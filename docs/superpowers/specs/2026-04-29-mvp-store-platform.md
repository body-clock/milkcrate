# Milkcrate MVP — Store Platform

## Product

A hosted service where a record store pays to have their Discogs inventory presented as an interactive, tactile storefront. One instance per store, no multi-tenancy in the MVP.

**Pitch**: "Your 10,000 Discogs listings are a spreadsheet. Milkcrate makes them feel like your store."

**Success metric**: Visitor opens the page, finds a record they want, clicks through to Discogs, buys it. The store sees increased discovery and sales from inventory that was previously invisible.

## Who it's for

- **The store** — gets a beautiful, interactive storefront on their own domain or subdomain. Pays monthly.
- **The store's customers** — browse anonymously. No accounts. Dig sessions stored in localStorage.

## Homepage — Single scrollable page

Linear flow through space, like walking through a real store:

1. **Wall** (top) — Staff Picks. 6-10 records displayed prominently. From the PicksSelector algorithm. Encourages immediate browsing.
2. **New Arrivals** — recently listed records, in a horizontal scrollable crate.
3. **Genre Sections** — each genre gets a crate. Flippable records within each, one at a time.
4. **Footer** — store info, link to Discogs.

No mode toggle. No "Store view" page. One continuous scroll.

## Store config

Per-instance customization via a single YAML file at `config/store.yml`. No database, no admin UI — just edit the file and redeploy.

```yaml
# config/store.yml
name: Philadelphia Music
discogs_username: philadelphiamusic
description: >
  Independent record store in South Philly. Deep soul, jazz, and funk
  sections built over decades of digging.

# Optional — overrides the default oxblood palette
colors:
  accent: "#c84830"
  # bg, raised, card, text, dim, border, notice — all overridable

# Optional — custom domain for Let's Encrypt
domain: philadelphiamusic.com
```

The controller reads this file. The Inertia props include the store config as `branding` data. React components pull name, description, colors from props.

## White-labeled storefront

The app feels like it belongs to the store, not the platform. The store's name is the header. The domain is theirs (or a subdomain they control). Milkcrate is invisible except for a small "Powered by Milkcrate" link in the footer.

Page layout sketch:

```
┌─────────────────────────────────┐
│  Philadelphia Music             │  Header — store identity, minimal
├─────────────────────────────────┤
│                                 │
│   ★ Staff Picks ★              │  Wall
│   ┌─────┐ ┌─────┐ ┌─────┐     │
│   │     │ │     │ │     │     │
│   └─────┘ └─────┘ └─────┘     │
│                                 │
├─────────────────────────────────┤
│ 🆕 New Arrivals                 │
│ → flick through crate →        │
├─────────────────────────────────┤
│ 🎷 Jazz                         │
│ → flick through crate →        │
├─────────────────────────────────┤
│ ...more genres...               │
├─────────────────────────────────┤
│     Powered by Milkcrate        │  Footer — subtle platform credit
└─────────────────────────────────┘
```

## What gets removed

- "Add Store" page and controller action
- Store rotation (no longer rotating between stores)
- "Store overview" mode toggle
- Crate/Store view toggle
- `StoresController#new` and `StoresController#create`
- `config/stores.yml` rotation config
- All Hotwire/Turbo/Stimulus remnants (importmaps, Stimulus controllers)
- `StoresController#featured` — replaced by a single action that loads the current store directly

## What stays, refined

- **Crate view** — the record stack and vertical drag interaction
- **RecordCard** — flip mechanic
- **PicksSelector** — algorithm refinement
- **DailySelectionService** — daily rotation keeps it fresh
- **Inertia + React** — the entire frontend stack
- **Dig sessions** — but moved to localStorage (no backend)
- **PWA** — manifest, service worker for mobile install

## What's new

- **Wall component** — horizontal row of staff picks, opens into crate view when clicked
- **Scrollable homepage** — single page, wall at top, then crates
- **Single-store routing** — no more rotation. Root route loads the configured store directly.
- **Store config** — a single env var or config file specifies WHICH store to serve
- **Analytics hook** — track when a user clicks through to Discogs (fires a POST)
- **Simplified header** — store name, no nav links

## Data model changes

- Remove `DigSession` model and table (move to localStorage)
- Remove `DigSessionItem` model
- Remove `DailySelection` daily_rotation columns if unused
- Add `Store.analytics_token` for click-through tracking (optional)
- `Store` keeps: name, discogs_username, total_listings, sync_status

## Deployment

- One Kamal deploy config per store
- `config/deploy.yml` points `STORE_USERNAME` env var to the Discogs username
- Each store gets their own domain or subdomain
- First store: `philadelphiamusic` on current server

## Picks algorithm refinements

- Add Discogs `want` / `have` ratio as a scoring signal (records with high want-to-have ratios are more interesting)
- The ratio is fetched during enrichment (already have `EnrichListingsJob`)
- Higher ratio = more people searching for it = more interesting pick

## What's not in MVP

- User accounts / registration
- Multi-tenancy
- Analytics dashboard
- Pricing page / billing
- Store management UI
- Email notifications
- Cross-store browsing

## Implementation sequence

1. **Simplify routing & controllers** — single store, remove rotation
2. **Remove dead features** — add store page, store rotation, dig session backend, Hotwire remnants
3. **Build wall component** — staff picks display at top of homepage
4. **Unify homepage** — wall + crates in single scrollable page
5. **Move dig sessions to localStorage** — React-based persistence, remove DB models
6. **Picks algorithm refinement** — want/have ratio scoring
7. **Analytics hook** — click-through tracking
