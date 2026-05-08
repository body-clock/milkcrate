---
name: milkcrate
last_updated: 2026-05-07
---

# milkcrate Strategy

## Target problem

Discogs is great for search but has no discovery. A buyer can find a specific record or check their wantlist, but they can't browse a store's collection the way they'd flip through crates in a physical shop. Record stores have personality and depth that their Discogs inventories completely hide.

## Our approach

Make online record browsing feel like walking into a record store — spatial bins, walls, and genre sections where what's displayed feels like it belongs there, curated by a digger's algorithm that surfaces what's interesting, not just what's listed.

## Who it's for

**Primary:** Record buyers shopping online — they're hiring milkcrate to get a taste of a store's collection before they buy or visit, discovering records they wouldn't have found through search or wantlists alone.

## Key metrics

- **Outbound clicks to Discogs** — measured via click tracking; the primary handoff signal
- **Items added to pile** — measured via local browser storage; proxy for discovery quality
- **Crates/collections browsed per session** — measured via session analytics; depth of exploration

## Tracks

### Digital storefront character

What makes a record store feel unique and interesting — translating the personality of a physical shop into a digital space without trying to replace the tactile experience. Every store's character comes through the screen.

_Why it serves the approach:_ The approach bets that browsing should feel like a record store. This track builds the spatial, character-driven experience that makes that real.

### Digger's algorithm

What makes a record "interesting" enough to surface — measurable parameters from metadata that map onto real-life record curation instincts. Keeping low-quality filler out without burying rares and oddities someone might love. Includes experimentation with embedding models for grouping records in unexpected ways and generating natural-language summaries of collections.

_Why it serves the approach:_ The approach bets on algorithmic curation over editorial or social. This track builds the taste engine that decides what goes in the bins.

### Store onboarding & freemium model

Prove value with near-zero seller effort — a store connects their API key and gets a storefront with no setup required. The free tier demonstrates the product; a paid tier at a no-brainer price unlocks deeper features (full-inventory access, premium placement).

_Why it serves the approach:_ The approach needs inventory to browse. This track makes it trivial for stores to say yes, building the supply side without friction.

## Milestones

- **2026-06-06** — Record fair at Philamoca: pitch to vendors, distribute branded non-woven bags with milkcrate URL, gather interest
