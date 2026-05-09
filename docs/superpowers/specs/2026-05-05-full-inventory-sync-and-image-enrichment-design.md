# Full Inventory Sync and Image Enrichment

**Date:** 2026-05-05

## Problem

Production has two related issues:

1. **Listing gap.** The Discogs seller inventory API caps at 100 pages × 100 items = 10,000 items per sync pass. philadelphiamusic has ~23,000 listings. Each daily sync only captures the 10,000 most recently listed items, leaving ~8,500 older listings invisible to production.

2. **Image quality.** ~51% of production listings show only a 150px Discogs thumbnail (`q:40/h:150/w:150`) rather than a full-resolution image. Development shows 77% of listings have full images from the same store, suggesting the listing gap is part of the problem. Releases confirmed to have no Discogs image need a fallback source.

## Solution Overview

Three changes in sequence:

1. Fix the listing gap with a two-pass sync (newest + oldest inventory)
2. Mark releases confirmed imageless on Discogs after a single enrichment attempt
3. Fall back to MusicBrainz Cover Art Archive for confirmed-imageless releases

## Section 1 — Two-Pass Sync

### What changes

`StoreSyncService#full_sync` gains a `sort_order:` keyword argument (default `"desc"`). `DiscogsClient#seller_inventory` already accepts `sort_order:`.

`FullStoreSyncJob` calls `full_sync` twice per run: once with `sort_order: "desc"` (newest 10k) and once with `sort_order: "asc"` (oldest 10k). With a 23k-item store this covers ~87% of inventory vs ~43% today. Listings are upserted idempotently so overlap between passes is safe.

### Job chain after change

```
FullStoreSyncJob
  → StoreSyncService#full_sync(sort_order: "desc")
  → StoreSyncService#full_sync(sort_order: "asc")
  → EnrichReleasesJob.perform_later(store_id)
  → DailyCurationJob.perform_later(store_id)
```

### API cost

~200 Discogs API calls per pass (100 pages × 2 passes). At ~0.6s/call that is roughly 4 minutes of sync time per daily run. Within acceptable limits.

## Section 2 — Single-Attempt Discogs Image Enrichment

### Schema change

Add `discogs_image_missing` boolean column to `releases`, default `false`.

### What changes

In `EnrichReleasesJob#enrich_release`, after calling `extract_primary_image(data)`:

- If `cover_url` is present: update listings with the full image URL (existing behaviour). Leave `discogs_image_missing` false.
- If `cover_url` is nil: set `discogs_image_missing = true` on the release. Do not retry — trust the API response.

Existing releases enriched before this change have `discogs_image_missing = false` (the column default). They will be treated as not-yet-confirmed-missing and will be re-enriched on their next stale cycle (7 days), at which point the flag is set correctly.

## Section 3 — MusicBrainz Cover Art Archive Fallback

### Schema changes

Add `musicbrainz_id` string column to `releases`, default `nil`.

- `nil` = not yet searched
- non-empty string = MBID found
- `""` (empty string) = searched, no match found

### New job: `EnrichMusicBrainzImagesJob`

Runs after `EnrichReleasesJob` in the `FullStoreSyncJob` chain.

Targets releases where `discogs_image_missing = true AND musicbrainz_id IS NULL`.

**Per release:**

1. Search MusicBrainz: `GET https://musicbrainz.org/ws/2/release/?query=artist:"<artist>" AND release:"<title>"&fmt=json`
   - Rate limit: 1 req/sec (enforced with 1s sleep between calls)
   - No authentication required; set `User-Agent: Milkcrate/1.0 +https://milkcrate.fm`
2. Take the first result with `score >= 90`. If none, write `""` to `musicbrainz_id` and continue.
3. Fetch cover: `GET https://coverartarchive.org/release/{mbid}/front`
   - CAA returns a redirect to the actual image URL
   - Follow redirect; store the final URL
4. On success: write MBID to `releases.musicbrainz_id`, update `cover_image_url` on all matching listings.
5. On no CAA image (404): write MBID to `releases.musicbrainz_id` anyway (MBID is valid, just no art). `cover_image_url` stays as thumbnail.

### Updated job chain

```
FullStoreSyncJob
  → StoreSyncService#full_sync(sort_order: "desc")
  → StoreSyncService#full_sync(sort_order: "asc")
  → EnrichReleasesJob.perform_later(store_id)       # sets discogs_image_missing
  → EnrichMusicBrainzImagesJob.perform_later(store_id)  # NEW
  → DailyCurationJob.perform_later(store_id)
```

## Testing

- `StoreSyncService`: add test for `sort_order: "asc"` pass; confirm upsert handles overlap correctly
- `EnrichReleasesJob`: test that `discogs_image_missing` is set true when API returns no images; test it is left false when images are present
- `EnrichMusicBrainzImagesJob`: test successful match updates `cover_image_url` and `musicbrainz_id`; test no-match writes `""`; test score < 90 is rejected; test CAA 404 stores MBID but leaves cover unchanged
- Integration: confirm job chain order in `FullStoreSyncJob`

## Out of Scope

- Changing the frontend image display (thumbnails vs full images are already handled via `cover_image_url`)
- Handling MusicBrainz rate limit errors beyond the 1 req/sec sleep
- Sourcing images from Spotify, iTunes, or other providers
- Storing multiple image sources per listing
