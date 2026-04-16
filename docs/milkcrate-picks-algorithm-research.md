# Milkcrate Picks Algorithm Research

## 2026-04-15

### Competitive context

- Discogs still centers marketplace inventory management, search, and filtering rather than editorial curation. Its buyer guidance emphasizes direct search, seller lookup, and browsing with filters.
- Discogs Player is explicitly optimizing digging speed: ingest a seller inventory, filter it hard, listen quickly, and export the shortlist.
- CrateScout is positioning around AI taste matching plus local store discovery.
- Collection apps like Crate Digger, Gatefold, Vinyl Crate, and Recordfy are clustering around personal collection management, alerts, and recommendation layers.

### What still looks open

The obvious whitespace is not "better filtering" or "more AI." It is a store-specific interpretation layer that makes an actual seller inventory feel like a good in-person dig: what is hidden, what is odd, what is unexpectedly strong, and why a record is worth stopping on.

That implies Milkcrate should bias toward picks that feel:

- buried but rewarding
- specific to one store's real inventory shape
- explainable in plain language

### Current selector behavior

`PicksSelector` already rewards:

- discovery styles
- multi-genre crossover
- vintage records
- decent condition
- records from tiny sections

This is a strong start, but it over-favors obvious "specialty bin" records and under-favors weird records hidden inside crowded bins.

### Refinement added this run

Added a crowded-section bonus for records with discovery styles when their primary genre sits inside a large section.

Why this matters:

- In real stores, the hardest and most satisfying finds are often not in the tiny oddball section.
- They are tucked inside the giant Jazz, Electronic, Rock, or Funk bins where volume creates invisibility.
- This helps Milkcrate surface records that would realistically be missed by a faster or more literal digger.

### Guardrails

- Keep this bonus discovery-only. A crowded section should not boost generic catalog filler.
- Keep the existing small-section bonus. Milkcrate should value both tiny-bin oddities and buried-in-plain-sight records.
- Prefer score changes that sharpen taste over broadening the top pool indiscriminately.

### Follow-up ideas

- Add a light penalty for records with very weak metadata signals and no taste-forward attributes.
- Normalize condition text so `Near Mint`, `NM`, and similar variants are treated consistently.
- Consider a "too obvious" dampener if repeated mainstream anchor records dominate picks across days.

## 2026-04-16

### Current selector shape

`PicksSelector` is currently a lightweight second-pass ranker layered on top of the broader `DailySelectionService`.

- `DailySelectionService` answers "what should be in rotation today?"
- `PicksSelector` answers "what feels worth stopping on right now?"

That split is good. The selector should stay opinionated and small rather than turning into a second general-purpose discovery engine.

### Competitive context

#### Discogs marketplace

Discogs still centers buyer-driven search, filtering, and seller inventory access rather than editorial curation.

- Discogs buyer guidance explicitly frames browsing around filters like format, year, and price, plus direct seller inventory search.
- Discogs seller inventory pages likewise emphasize inventory management, filtering, and sorting.
- Discogs' own genre/style model remains hierarchical: genre is broad, style is the more precise descriptive unit.

Implication for Milkcrate: competing on search or raw inventory access is a dead end. The opportunity is stronger editorial ranking inside a single seller's catalog.

Sources:

- https://support.discogs.com/hc/en-us/articles/360001573434-How-To-Buy-Music-On-Discogs
- https://support.discogs.com/hc/en-us/articles/360013826974-How-To-Place-An-Order-Using-The-Android-App
- https://support.discogs.com/hc/en-us/articles/360007714754-How-Can-I-Manage-My-Inventory
- https://support.discogs.com/hc/en-us/articles/360005055213-Database-Guidelines-9-Genres-Styles

#### CR8S

CR8S positions itself as a digital crate-digging product with a curated library and a richer presentation layer. That is directionally adjacent, but it is not doing seller-inventory interpretation in the Discogs marketplace sense.

Implication for Milkcrate: Milkcrate should lean harder into "this specific store has weird, promising corners" instead of trying to become a general listening platform.

Source:

- https://cr8s.com/

### Adjustment made today

Added a style-rarity boost to `PicksSelector`.

Why:

- Genre rarity is useful but too blunt.
- In practice, "Electronic" or "Rock" often hides the interesting part.
- Style is usually where the record-store texture lives.
- Discogs itself treats style as the more specific descriptive layer, which matches the kind of signal Milkcrate should reward.

New rule:

- If a listing has styles that appear fewer than 3 times in the store catalog, each rare style adds a small boost.

Why this is a good surgical change:

- It preserves the current selector architecture.
- It does not introduce external data or new persistence.
- It sharpens the difference between "generally solid record" and "record that feels like a find."
- It complements the existing tiny-section genre boost instead of replacing it.

### Notes for next iterations

- Consider capping total style-rarity contribution if multi-style records start dominating too aggressively.
- Consider adding a mild penalty for ultra-generic style combinations that are heavily represented in a store.
- If picks start feeling too niche, rebalance against recency rather than removing rarity entirely.
