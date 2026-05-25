# Sidenotes

Quick-captured thoughts, ideas, and tasks collected during sessions.

<!-- Entries are appended by /sn — newest first -->

## 2026-05-24

- **Checkout process / Discogs cart integration** — We need to thoroughly investigate the checkout flow. Whether via OAuth or another approach, there needs to be a way to send the user's entire pile directly to their Discogs cart. Without that, the user has to manually add everything, which makes the whole thing much harder to use.
- **Pile scope — global vs per-store** — The pile is currently global (same pile across all stores). When you browse a different store, the pile carries over. This is either a bug or a feature. It could be confusing ("why are there records from Philadelphia Music on the betternowrecords page?") or it could be a useful cross-store collection feature ("I'm browsing everywhere and building one unified pile"). Need to decide: scope pile to the specific store, or lean into cross-store as a feature with appropriate UI to clarify what's in the pile and where it came from.

## 2026-05-23

- **Remove "Is this your store?" link** — Looks very strange on mobile and has a very limited use case. Should be removed.
- **Header navigation improvements** — "Philadelphia Music" in the header should link to the store view (the main browsing page), not just the site root. "On MilkCrate" in the header should link to the marketing/landing page.
- **Discogs button in header** — The "Discogs" button in the header isn't great UI. Needs revisiting — likely confusing to users and unclear about what action it triggers.
- **Job progress bar on storefront cards** — Add a live progress bar to admin/dashboard storefront cards that tracks sync/enrich job status. `/jobs` dashboard doesn't give a high-level progress report. Want a quick visual way to see job output and ensure jobs are running well.
