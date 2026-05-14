---
date: 2026-05-14
topic: milkcrate-picks-mobile-polish
focus: Mobile Milkcrate Picks should feel more fun and engaging; desktop should feel less like a wall; unify CrateView header using the stronger compact version; keep implementation simple through the new compositional system.
mode: repo-grounded
---

# Ideation: Milkcrate Picks Mobile Polish

## Grounding Context

Milkcrate is a Rails 8 + Inertia React storefront for browsing Discogs seller inventories as curated crates. The product strategy says browsing should feel like walking into a record store: spatial bins, walls, genre sections, and a digger's algorithm surfacing interesting records instead of search results.

The current Picks surface is still special-cased in `app/frontend/components/store_floor.tsx`: desktop renders a 5-column cover wall, while compact renders a horizontal strip of large cover buttons. That compact strip is the source of the carousel feeling: it is one row, hidden-scrollbar, and mostly passive after the first card.

The compositional system now has better primitives. `CrateShelf` renders a crate-like header plus record grid and is already used by `StorefrontPreview`. `CrateCard` has a stronger tactile container identity: lid lift, grouped thumbnails, press scale, and `DIG ->` label. `CrateView` already has a compact header with back button, active crate title, count, and tabs; the desktop path still uses a separate toolbar that lacks that active-crate context.

Relevant implementation seams:

- `app/frontend/components/store_floor.tsx:19-21` defines desktop columns and compact special behavior.
- `app/frontend/components/store_floor.tsx:30-104` renders Picks as a special card with separate desktop grid and compact horizontal scroll.
- `app/frontend/components/crate_shelf.tsx:14-24` documents the shared crate/shelf primitive.
- `app/frontend/components/crate_view.tsx:161-187` defines the stronger compact CrateView header.
- `app/frontend/components/crate_view.tsx:206-225` defines the weaker desktop toolbar.
- `app/frontend/components/crate_card.tsx:56-83` already encodes crate-as-container motion.
- `app/frontend/contexts/viewport_context.tsx:3` defines compact/comfy/wide tiers.

Past solution docs reinforce two guardrails: use viewport tiers rather than ad hoc responsive booleans, and centralize tactile behavior through motion tokens/primitives instead of one-off animation values.

External context: Apple HIG emphasizes purposeful, gesture-consistent motion and avoiding gratuitous frequent animation. Baymard's carousel research warns that many carousel implementations, especially mobile ones, create usability problems; their mobile product-list research also frames mobile lists as a tradeoff between overview and item detail. The implication for Milkcrate is not "never swipe," but "do not make the primary Picks affordance a hidden horizontal row when the product metaphor is a crate/wall."

Sources:

- Apple HIG Motion: https://developer.apple.com/design/Human-Interface-Guidelines/motion
- Baymard homepage carousel UX: https://baymard.com/blog/homepage-carousel
- Baymard mobile product lists: https://baymard.com/mcommerce-usability/benchmark/mobile-page-types/product-list/19137-cb2

## Topic Axes

- Picks surface shape: how the Picks section appears on mobile and desktop.
- CrateView header/navigation: how active crate context and tabs are presented across tiers.
- Tactile engagement: how the interaction feels fun without becoming noisy.
- Compositional reuse: how much custom Picks/toolbar code can be deleted.
- Responsive density: how much inventory is visible without becoming a wall or carousel.

## Ranked Ideas

### 1. Turn Picks Into a Responsive Crate Shelf, Not a Carousel

**Description:** Replace the compact horizontal Picks strip with a crate/shelf composition: header, count/date, and a compact cover grid that shows 4-6 records in one glance. On desktop, use the same primitive with a wider grid or composed variants instead of a separate wall branch. The goal is one Picks object that morphs by tier, not two different experiences.

**Axis:** Picks surface shape

**Basis:** `direct:` `StoreFloor` has a split desktop grid vs compact horizontal scroll at `store_floor.tsx:43-103`, while `CrateShelf` already provides a name-header plus record-grid primitive at `crate_shelf.tsx:14-24`.

**Rationale:** This directly removes the boring carousel behavior while using the compositional system the code already has. It also makes mobile feel more like a crate bin: a bounded object with records inside, not a row of unrelated cards.

**Downsides:** A 4-6 cover preview exposes fewer individual records than the current 10-card strip unless the user opens the crate. The header/action needs to make "open for all picks" obvious.

**Confidence:** 92%

**Complexity:** Low

**Status:** Unexplored

### 2. Promote the Compact CrateView Header to Every Viewport

**Description:** Delete the separate desktop toolbar and use the compact header structure across all tiers: back control, active crate name, record count, and tabs underneath. Desktop can scale spacing and button shape, but it should keep the same information architecture. This unifies the crate view with the version that already works better.

**Axis:** CrateView header/navigation

**Basis:** `direct:` `crate_view.tsx:161-187` has the compact active-crate header; `crate_view.tsx:206-225` has a desktop toolbar that mainly shows back plus tabs and omits the prominent active crate title/count.

**Rationale:** The desktop crate view feels more like tooling than browsing because the current toolbar foregrounds navigation chrome over crate identity. Promoting the compact header is the simplest possible unification and should reduce code, not add abstraction.

**Downsides:** Desktop tests currently assert only that the back button/details are present, so this needs a small test update to lock in the new shared header behavior.

**Confidence:** 95%

**Complexity:** Low

**Status:** Unexplored

### 3. Give Picks the CrateCard "DIG" Container Identity

**Description:** Reuse the CrateCard interaction language for Picks: a lid-like header lift, grouped thumbnail motion, and a visible `DIG ->` affordance when interactive. On touch/mobile, keep it subtle: press scale and immediate feedback rather than hover-only flourishes.

**Axis:** Tactile engagement

**Basis:** `direct:` `CrateCard` already implements lid lift and grouped thumbnail scale in `crate_card.tsx:56-83`; Picks mobile currently uses plain `motion.button` cards in a row at `store_floor.tsx:80-92`.

**Rationale:** Fun should come from the object behaving like a crate, not from adding decorative animation. Reusing an existing motion vocabulary gives mobile Picks more character and keeps desktop/mobile behavior coherent.

**Downsides:** Hover-only details such as `DIG ->` do not translate to touch unless the label is visible by default or appears on press/focus.

**Confidence:** 86%

**Complexity:** Low

**Status:** Unexplored

### 4. Make Desktop Picks a Curated Front Wall, Not a Uniform Tile Wall

**Description:** Keep desktop visually abundant, but break the rigid 5x2 grid with a composed front-wall layout: one larger lead pick, 4-6 supporting covers, and the rest implied by the crate open action. This can be a variant of the same Picks shelf rather than a bespoke masonry system.

**Axis:** Responsive density

**Basis:** `direct:` the README describes Milkcrate Picks as 12 genre-diverse top-scored records displayed as a wall of cover art, and `store_floor.tsx:45-72` currently renders desktop as uniform grid cells.

**Rationale:** The user specifically called desktop a wall. A lead-pick composition preserves the "front wall" idea while giving the section hierarchy and taste, closer to a record store display than a contact sheet.

**Downsides:** This is slightly more subjective than the header/carousel fixes. It may need a quick visual pass in browser to avoid looking like a generic editorial card layout.

**Confidence:** 78%

**Complexity:** Medium

**Status:** Unexplored

### 5. Add a Clear "Open the Crate" Commit Point to Picks

**Description:** After the Picks preview grid, add one deliberate action label/button such as `Dig through all picks` or `Open Milkcrate Picks`. The whole container can still be clickable, but the explicit commit point gives mobile users a clear next move after scanning the preview.

**Axis:** Tactile engagement

**Basis:** `direct:` the current Picks header is clickable (`store_floor.tsx:31-41`) and each compact cover is clickable (`store_floor.tsx:80-92`), but there is no explicit action after the preview. `CrateView` already supports opening at a crate or record index.

**Rationale:** Carousels often feel boring because they ask the user to keep swiping. A commit point reframes the preview as a doorway into the crate. It also makes reducing the visible mobile covers less risky.

**Downsides:** Adds another visible control, so it must be styled as part of the crate object rather than a generic CTA.

**Confidence:** 82%

**Complexity:** Low

**Status:** Unexplored

### 6. Extract `CrateHeader` as the Small Shared Primitive

**Description:** If unifying the CrateView header and Picks/CrateShelf header reveals duplication, extract only a tiny `CrateHeader` primitive: title, count/meta, optional back action, optional tabs/action slot. Do not create a broad responsive layout framework.

**Axis:** Compositional reuse

**Basis:** `direct:` `CrateShelf`, `CrateCard`, `StoreFloor` Picks, and `CrateView` all hand-roll small title/count/header rows. The user explicitly noted the new compositional system should make this trivial.

**Rationale:** The right abstraction is the smallest one that deletes the mobile/desktop header fork. A tiny header primitive helps future crate surfaces stay consistent without introducing heavy layout machinery.

**Downsides:** This should be created only if the implementation naturally repeats markup. Prematurely extracting it before doing the simple replacement would overcomplicate a small polish pass.

**Confidence:** 75%

**Complexity:** Low

**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Keep carousel but add peeking/progress affordance | Improves discoverability but preserves the core boring horizontal-strip model. |
| 2 | Cover-flow / 3D carousel | Too gimmicky and likely conflicts with the design system's grounded tactile language. |
| 3 | Auto-scrolling attract animation | Apple motion guidance warns against unnecessary frequent motion; likely annoying on mobile. |
| 4 | One oversized hero pick only | Too little overview for a discovery surface; loses genre-diverse Picks value. |
| 5 | Add metadata captions under each mobile cover | Makes mobile denser but not more crate-like; better handled inside CrateView details. |
| 6 | Add haptic feedback | Native-web support is inconsistent and it would not solve the visual boredom. |
| 7 | Add more records to the horizontal strip | More of the same failure mode. |
| 8 | Put CrateView tabs into StoreFloor Picks | Scope confusion; tabs belong in crate view, not the storefront preview. |
| 9 | Use StorefrontPreview wholesale inside StoreFloor | Too broad; that component explicitly says StoreFloor owns full browsing behavior. |
| 10 | Fully custom masonry wall | More implementation than needed; contradicts the "trivial/simple" constraint. |
