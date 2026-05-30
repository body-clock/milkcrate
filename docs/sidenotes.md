# Sidenotes

Quick-captured thoughts, ideas, and tasks collected during sessions.

<!-- Entries are appended by /sn — newest first -->

## 2026-05-28

- ~~**Pile sheet exit animation missing** — The pile sheet slides in smoothly with a spring animation (`springDrawer`), but on close it disappears instantly with no exit transition. The drawer just vanishes instead of sliding back out, which feels jarring after the polished entry. Should add an exit animation (slide-out matching the entry direction) or a fade-out so the dismissal feels intentional rather than abrupt.~~
  ✅ *Resolved — Wrapped in `AnimatePresence` with `exit` animation reversing entry direction (backdrop fades out, drawer slides back down/right).*

## 2026-05-27

- **Freshness scoring shouldn't hard-code 3 points** — The current freshness value gives exactly 3 points. This should be a fine-tuned, emergent behavior instead. The model should learn to weigh recency appropriately based on data patterns, not a fixed multiplier. Needs experimentation to find the right approach (decay function, ML feature, etc.).
- **Inventory export fixtures for OAuth sync testing** — Need to add a couple of fixture inventory exports that we can use to test the OAuth sync pipeline end-to-end. Options: create a dummy export from my single-listing store and pad it with synthetic data, or get a real export from an actual Discogs store. The fixture should cover edge cases (multiple conditions, sold items, images, etc.) so we can validate the full import pipeline without hitting the real Discogs API every time.
- **JS frontend audit rules** — Need a full audit of the JS/React frontend code matching the rigor of the Ruby audit. Establish component decomposition rules (analogous to Sandi Metz's 5-line method) that we can audit against after making changes. Also need to understand what the existing TypeScript reviewers actually check — unclear whether they're enforcing meaningful constraints.

## 2026-05-24

- ~~**Pile scope — global vs per-store** — The pile is currently global (same pile across all stores). When you browse a different store, the pile carries over. This is either a bug or a feature. It could be confusing ("why are there records from Philadelphia Music on the betternowrecords page?") or it could be a useful cross-store collection feature ("I'm browsing everywhere and building one unified pile"). Need to decide: scope pile to the specific store, or lean into cross-store as a feature with appropriate UI to clarify what's in the pile and where it came from.~~
  ✅ *Resolved — Decided: per-store pile with localStorage scoped to current store.*

## 2026-05-23

- **Discogs button in header** — The "Discogs" button in the header isn't great UI. Needs revisiting — likely confusing to users and unclear about what action it triggers.
- **Job progress bar on storefront cards** — Add a live progress bar to admin/dashboard storefront cards that tracks sync/enrich job status. `/jobs` dashboard doesn't give a high-level progress report. Want a quick visual way to see job output and ensure jobs are running well.
