---
name: milkcrate
last_updated: 2026-05-22
---

# milkcrate Strategy

## Target problem

Discogs is great for search but has no discovery. A buyer can find a specific record or check their wantlist, but they can't browse a store's collection the way they'd flip through crates in a physical shop. Record stores have personality and depth that their Discogs inventories completely hide.

Two structural problems with the public Discogs API make this harder than it looks: the inventory endpoint caps at 10,000 listings (100 pages × 100 records), so large stores like Philadelphia Music with 90,000 listings show an incomplete catalog. And Discogs provides no push mechanism for listing changes — if a record sells, the app keeps showing it until the next sync, which destroys buyer trust.

## Our approach

Make online record browsing feel like walking into a record store — spatial bins, walls, and genre sections where what's displayed feels like it belongs there, curated by a digger's algorithm that surfaces what's interesting, not just what's listed.

Two tiers, two data sources, one value proposition. A zero-friction free demo shows a curated preview using public API data — the algorithm is good enough that the top 10,000 records from a 90,000-store are still a compelling browse. An OAuth partnership unlocks the full catalog via Discogs' inventory export CSV (no 10k ceiling) and order polling for near-real-time sales detection. The free tier proves the concept; the paid tier delivers the real product.

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

### Store onboarding & OAuth partnership

A two-tier model built around Discogs OAuth. Free: enter a Discogs username, get an immediate demo storefront with a curated sample of the store's catalog — zero friction, no account, proves the concept in one click. Paid: one-time OAuth authorization that unlocks full inventory via Discogs' CSV export endpoint (no 10k ceiling) and order polling for near-real-time sold-item detection. The paid tier also includes identity controls, custom pages, and conversion analytics.

The upgrade path is designed into the product, not bolted on. The free demo is a compelling teaser, not a broken product — the algorithm does the work. The OAuth flow is a one-step guided upgrade within the store dashboard, not a separate onboarding process.

_Why it serves the approach:_ The approach needs both complete inventory and live freshness to deliver real browsing. OAuth is the only path that unlocks both. The free tier provides the proof; the partnership provides the product.

## Milestones

- **2026-06-06** — Record fair at Philamoca: pitch to vendors, distribute branded non-woven bags with milkcrate URL, gather interest
