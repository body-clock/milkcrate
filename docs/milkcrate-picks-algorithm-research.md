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
