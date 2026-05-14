---
date: 2026-05-14
topic: recommendation-system-personalized-dig
focus: embedding-backed recommendation system using listing metadata, pgvector, and personalized dig
mode: repo-grounded
---

# Ideation: Recommendation System and Personalized Dig

## Grounding Context

Milkcrate is a Rails 8.1/PostgreSQL/Inertia React app for browsing Discogs seller inventory as curated crates. The current storefront curation path is `StorefrontCuration` -> `CrateStrategies` -> `RecordScorer` -> `CuratedCrate` -> `CratePresenter` -> React storefront.

The app already has strong curation seams: `CrateStrategies::*` selects candidate records, `RecordScorer` applies deterministic taste and quality signals, `CuratedCrate` enforces crate shape, and `CratePresenter` keeps frontend props stable. The pile is currently localStorage-backed and is the clearest existing taste signal. There is no pgvector extension, OpenAI client, embedding table, recommendation table, or event table yet.

Product strategy emphasizes browsing over searching, taste over data, and a digger algorithm that surfaces interesting records. Existing solution docs point toward first-class crate strategies, shared presenter shapes, viewport-tiered UI, centralized motion tokens, and explicit guard coverage for responsive/personalized states.

External research supports treating vector search as candidate generation, not final ranking. Plain nearest-neighbor retrieval tends to overproduce same-artist, same-genre, and duplicate-vibe results. Stronger systems retrieve broad candidates, then rerank with diversity, novelty, business rules, and user/session signals. Official OpenAI docs list `text-embedding-3-small` as a current small embedding model with a default vector length of 1536 dimensions.

Sources:

- https://platform.openai.com/docs/models/text-embedding-3-small
- https://platform.openai.com/docs/guides/embeddings/embedding-models%5D%5Blist
- https://github.com/ankane/neighbor
- https://github.com/pgvector/pgvector
- https://www.elastic.co/search-labs/blog/maximum-marginal-relevance-diversify-results

## Topic Axes

- Embedding and indexing architecture
- Recommendation ranking and diversity
- Personalization signals and session memory
- Storefront placement and interaction
- Evaluation and tuning

## Ranked Ideas

### 1. Vector Shadow Index Behind Existing Crate Strategies

**Description:** Add a `listing_embeddings` or `record_embeddings` table keyed to listings, using `text-embedding-3-small` vectors and pgvector. Use embeddings only to retrieve broad candidates; final presentation still flows through `CrateStrategies`, `RecordScorer`, `CuratedCrate`, and `CratePresenter`.

**Axis:** Embedding and indexing architecture

**Basis:** `direct:` the current code already has a clean crate strategy spine. `external:` OpenAI docs list `text-embedding-3-small` as an embedding model with 1536 default dimensions; pgvector and the Rails `neighbor` gem support vector search inside PostgreSQL/Rails.

**Rationale:** This keeps vector search from becoming the product experience. Embeddings become a back-room sorting lens, while Milkcrate remains a digital storefront built around curated crates.

**Downsides:** Requires migrations, async embedding jobs, embedding versioning, model configuration, and a reindex path when enrichment changes.

**Confidence:** 90%

**Complexity:** Medium-high

**Status:** Unexplored

### 2. Two-Stage Digger Algorithm

**Description:** Retrieve 100-1000 vector-near candidates, then rerank with `RecordScorer`, MMR-style diversity, same-artist suppression, label/genre/decade spread, condition, price, freshness, and hidden-gem boosts. The goal is a crate that feels related but not interchangeable.

**Axis:** Recommendation ranking and diversity

**Basis:** `direct:` the user reported that plain semantic matching produced same-artist and close semantic matches. `external:` MMR-style reranking and diversity-aware recommendation research directly address repetitive nearest-neighbor output.

**Rationale:** This is the core fix for the boring-match failure mode. Vector similarity should propose possibilities, not decide the crate.

**Downsides:** Ranking becomes harder to explain and tune; MMR and diversity weights need offline fixtures before production trust.

**Confidence:** 92%

**Complexity:** High

**Status:** Unexplored

### 3. Pile-Derived Taste Shadow

**Description:** Use the existing localStorage pile as the first personalization signal. A user adding one or more records can seed a temporary taste vector or session profile without accounts, durable clickstream ingestion, or a full event table.

**Axis:** Personalization signals and session memory

**Basis:** `direct:` `use_pile.ts` already captures the strongest visible expression of user intent. `reasoned:` adding to pile is higher-signal than passive page views because it represents a record the shopper may actually buy.

**Rationale:** This gives personalized dig a pragmatic first input and keeps the first release privacy-light and low-infrastructure.

**Downsides:** Pile-only personalization ignores meaningful passive signals such as dwell, skips, and crate paths. It may react slowly for users who browse a long time before adding anything.

**Confidence:** 86%

**Complexity:** Medium

**Status:** Unexplored

### 4. Session Crate Continuations

**Description:** Add dig continuations from the current crate or pile: "same feel, different shelf", "left turn", or "deepen this mood". Each continuation uses embeddings for recall, then strategy-specific reranking to stay close, branch adjacent, or widen the dig.

**Axis:** Storefront placement and interaction

**Basis:** `direct:` Milkcrate already has crate entry/exit and crate tabs. `reasoned:` a continuation crate matches the physical-store metaphor better than a generic recommendation carousel.

**Rationale:** Personalization becomes part of browsing momentum. Every crate can create the next crate without introducing search filters or a separate recommendation page.

**Downsides:** Requires careful UI restraint so continuation crates do not crowd the storefront or create too many choices.

**Confidence:** 82%

**Complexity:** Medium

**Status:** Unexplored

### 5. Crate Strategy Candidate Ports

**Description:** Generalize strategy input so strategies can receive candidates from eligible listings, vector neighbors, pile-derived seeds, or theme concepts. The strategy remains responsible for final selection and still returns ordinary `CuratedCrate` objects.

**Axis:** Embedding and indexing architecture

**Basis:** `direct:` existing solution docs favor first-class `CrateStrategies::*` and shared presenter props. `reasoned:` a candidate port lets pgvector enter the architecture without making controllers, presenters, or React components recommendation-aware.

**Rationale:** This is the architecture move that keeps recommendations from becoming a parallel stack.

**Downsides:** Premature generalization is possible; it should emerge from the first vector-backed strategy rather than be overbuilt upfront.

**Confidence:** 84%

**Complexity:** Medium

**Status:** Unexplored

### 6. Golden Crate Evaluation Harness

**Description:** Create repeatable offline fixtures: same-artist trap, one-record seed, sparse metadata, tiny inventory, huge inventory, and genre-heavy shop. Score outputs for artist repetition, semantic spread, diversity, freshness, long-tail exposure, and whether `RecordScorer` explanations still make sense.

**Axis:** Evaluation and tuning

**Basis:** `direct:` the current curation system is deterministic enough to test. `external:` recommendation research emphasizes evaluating diversity and novelty, not just click or relevance metrics.

**Rationale:** Recommendation tuning will otherwise become subjective. Golden crates let algorithm changes be reviewed before OpenAI, pgvector, or ranking changes affect shoppers.

**Downsides:** Requires curated fixture data and human judgment to define what a good dig looks like.

**Confidence:** 88%

**Complexity:** Medium

**Status:** Unexplored

### 7. Staff Shelf Explanations

**Description:** Give personalized crates deterministic, human-feeling labels from dominant facets: "late-night soul", "rougher edges", "clean copies", or "adjacent jazz-funk". Generate these from scorer facets and dominant candidate attributes, not from an LLM initially.

**Axis:** Storefront placement and interaction

**Basis:** `direct:` the product strategy values store character and a tactile, curated feel. `reasoned:` deterministic labels keep explanations cheap, stable, and tied to the records actually shown.

**Rationale:** This makes recommendations feel hand-placed instead of algorithmic, while preserving the browse-first storefront identity.

**Downsides:** Labels can become cheesy or misleading if the facet extraction is weak. This should follow ranking quality, not precede it.

**Confidence:** 76%

**Complexity:** Low-medium

**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Embedding index as shadow catalog / back-room bins / seller inventory index | Duplicates stronger "Vector Shadow Index Behind Existing Crate Strategies" framing. |
| 2 | MMR ranker / anti-boring diversity rules / DJ set pacing / serendipity budget | Duplicates stronger "Two-Stage Digger Algorithm" framing. |
| 3 | Client pile taste memory / one-record local taste vector / privacy-first session crate | Duplicates stronger "Pile-Derived Taste Shadow" framing. |
| 4 | Fully controlled exploration board | Interesting, but risks turning the storefront into a control surface rather than browse-first curation. |
| 5 | Zero-control autopilot dig | Better as a constraint inside personalized dig than a standalone direction. |
| 6 | Tiny inventory mode | Real edge case, but belongs in implementation requirements after the core architecture is chosen. |
| 7 | Huge inventory mode | Real edge case, but belongs in implementation requirements after the core architecture is chosen. |
| 8 | Personalized storefront takeover | Too much blast radius; a dedicated personalized dig slot is a safer first product surface. |
