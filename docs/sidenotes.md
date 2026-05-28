# Sidenotes

Quick-captured thoughts, ideas, and tasks collected during sessions.

<!-- Entries are appended by /sn — newest first -->

## 2026-05-28

- **CrateView back button navigates to stale/expired page instead of store view** — Clicking the back button in CrateView calls `history.back()`, which navigates to the last browser history entry. If the previous page was an expired OAuth callback or a stale middleware redirect, the user gets dumped on an error page instead of returning to the store floor. Should replace `history.back()` with an explicit navigation to the store view, or store the store-return URL explicitly and navigate to it rather than relying on browser history.

- **Pile sheet exit animation missing** — The pile sheet slides in smoothly with a spring animation (`springDrawer`), but on close it disappears instantly with no exit transition. The drawer just vanishes instead of sliding back out, which feels jarring after the polished entry. Should add an exit animation (slide-out matching the entry direction) or a fade-out so the dismissal feels intentional rather than abrupt.

## 2026-05-27

- **Post-OAuth redirect should return shopper to the crate** — After a Discogs shopper OAuth completes, `complete_shopper_auth` redirects to `store_path` with a generic notice. If the user was on a crate page and clicked a listing's "Add to Cart" / "Want" button that required auth, the OAuth redirect dumps them on the store landing page with no cue to follow through. Should preserve the crate context (thread `return_to` through the OAuth chain), redirect back to that crate, and visually emphasize the "Add to Cart" action on the listing that triggered the flow.

- **Freshness scoring shouldn't hard-code 3 points** — The current freshness value gives exactly 3 points. This should be a fine-tuned, emergent behavior instead. The model should learn to weigh recency appropriately based on data patterns, not a fixed multiplier. Needs experimentation to find the right approach (decay function, ML feature, etc.).
- **Low-quality images must never reach the UI** — A shitty image (blurry, too small, wrong aspect ratio, Discogs placeholder) completely kills the vibe. We need a quality gate that filters out bad images before they get to the interface. Either reject them at import time or strip them from listings before rendering. A placeholder or no image is better than a bad image.
- **Inventory export fixtures for OAuth sync testing** — Need to add a couple of fixture inventory exports that we can use to test the OAuth sync pipeline end-to-end. Options: create a dummy export from my single-listing store and pad it with synthetic data, or get a real export from an actual Discogs store. The fixture should cover edge cases (multiple conditions, sold items, images, etc.) so we can validate the full import pipeline without hitting the real Discogs API every time.
- **JS frontend audit rules** — Need a full audit of the JS/React frontend code matching the rigor of the Ruby audit. Establish component decomposition rules (analogous to Sandi Metz's 5-line method) that we can audit against after making changes. Also need to understand what the existing TypeScript reviewers actually check — unclear whether they're enforcing meaningful constraints.

## 2026-05-24

- **Pile scope — global vs per-store** — The pile is currently global (same pile across all stores). When you browse a different store, the pile carries over. This is either a bug or a feature. It could be confusing ("why are there records from Philadelphia Music on the betternowrecords page?") or it could be a useful cross-store collection feature ("I'm browsing everywhere and building one unified pile"). Need to decide: scope pile to the specific store, or lean into cross-store as a feature with appropriate UI to clarify what's in the pile and where it came from.

## 2026-05-23

- **Remove "Is this your store?" link** — Looks very strange on mobile and has a very limited use case. Should be removed.
- **Header navigation improvements** — "Philadelphia Music" in the header should link to the store view (the main browsing page), not just the site root. "On MilkCrate" in the header should link to the marketing/landing page.
- **Discogs button in header** — The "Discogs" button in the header isn't great UI. Needs revisiting — likely confusing to users and unclear about what action it triggers.
- **Job progress bar on storefront cards** — Add a live progress bar to admin/dashboard storefront cards that tracks sync/enrich job status. `/jobs` dashboard doesn't give a high-level progress report. Want a quick visual way to see job output and ensure jobs are running well.
