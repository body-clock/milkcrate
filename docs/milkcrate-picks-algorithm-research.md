# Milkcrate Picks Algorithm Research

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
