# Issue Execution Order

Generated: 2026-05-04

## Summary

12 open issues. 7 are `ready-for-agent` (TDD-executable). 5 are `ready-for-human` (require design, research, or product decisions).

---

## Not TDD-Eligible (ready-for-human)

These require human judgment, design tooling, or are reference documents — skip for agent execution.

| # | Title | Reason |
|---|-------|--------|
| #76 | PRD: Deepen storefront curation architecture | Parent PRD / reference doc |
| #62 | Product: freemium business model and pilot strategy | Product/strategy decision |
| #66 | chore: product polish before May 17 pitch | Mixed checklist, needs human review |
| #68 | design: logo — icon + wordmark | Requires Figma, not code |
| #36 | Research Discogs accessibility compliance | Research task, no code output |

---

## TDD Execution Order

### Wave 1 — No blockers (can run in parallel)

#### 1. #77 — Introduce storefront curation output without changing rendered crates

**Priority: highest.** This is the foundation issue — #78, #79, #80, and #81 all depend on it. Nothing in the curation refactor chain moves until this lands.

Explicitly states "Blocked by: None - can start immediately." Introduces the storefront curation interface that returns the same Milkcrate Picks and genre crate records the storefront already renders. Controller routes through it; behavior stays identical.

#### 2. #65 — rake task to onboard a new store

**Independent of all other issues.** `bin/rails milkcrate:add_store[discogs_username]` — creates Store record, kicks off `FullStoreSyncJob`, prints store URL. Small, self-contained, high business value for the May 17 pitch.

#### 3. #59 — Homepage layout: bento dashboard for genre bins

**Independent frontend work.** No backend dependencies. Desktop bento card grid for genre bins — hero cell, right stack, bottom row. Previous implementation was reverted; needs another pass on spacing, typography, card proportions. Can run parallel to Wave 1 backend work.

---

### Wave 2 — Blocked by #77 (run after Wave 1, can be parallel with each other)

#### 4. #78 — Use storefront curation output for daily surfaced-record bookkeeping

**Blocked by #77.** Removes the drift where daily curation rebuilds genre-bin rules separately from storefront rendering. After #77 lands, the daily curation job consumes the new curation interface output instead of independently recalculating picks and genre crate membership.

#### 5. #79 — Extract record scoring behind a behavior-preserving scoring interface

**Blocked by #77.** Moves condition quality, want/have desirability, freshness/exposure, and deterministic daily variation behind a focused scoring interface. #78 and #79 have the same single blocker and no dependency on each other — run them in parallel.

---

### Wave 3 — Blocked by #77 + #78 + #79

#### 6. #80 — Make presentation consume curated crates only

**Blocked by #77, #78, #79.** Finishes the curation/presentation separation. Presentation accepts already-curated crate data as input; stops deciding Milkcrate Picks membership, genre crate membership, duplicate handling, or scoring. Returns the same props the frontend expects.

---

### Wave 4 — Blocked by #80

#### 7. #81 — Remove legacy curation coupling and tighten regression coverage

**Blocked by #80.** Final cleanup pass. Controller, presentation, scoring, and daily curation no longer duplicate curation responsibilities. Obsolete selector/presenter/job coupling is removed or made private. Regression tests cover the end-to-end path. No new product behavior.

---

## Dependency Graph

```
#65 (independent)
#59 (independent)
#77 ──┬──► #78 ──┐
      │          ├──► #80 ──► #81
      └──► #79 ──┘
```

---

## Rationale

**Start with #77, #65, #59 in parallel.** The curation refactor chain is the largest body of work (5 issues, clear dependency chain). #77 is the critical path — the sooner it lands, the sooner #78 and #79 can proceed in parallel. #65 and #59 are independent quick wins that add business value without waiting on anything.

**#78 and #79 in parallel after #77.** They share the same single blocker and have no coupling with each other. Running them concurrently cuts the total chain length.

**#80 only after all of Wave 2.** It explicitly depends on the scoring interface (#79) and daily curation alignment (#78) being in place before presentation can safely consume curated output.

**#81 last.** It's an explicit cleanup pass — it depends on the new architecture being stable and proven by the earlier slices.
