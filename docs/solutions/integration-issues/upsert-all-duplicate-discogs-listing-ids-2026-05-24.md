---
title: "Prevent upsert_all crash on duplicate Discogs listing IDs across pages"
date: 2026-05-24
category: integration-issues
module: store_sync
problem_type: race_condition
component: service_object
severity: medium
applies_when:
  - "Syncing store inventory with a page limit (MAX_PAGES)"
  - "Discogs API returns the same listing on multiple pages"
tags:
  - store-sync
  - upsert
  - pagination
  - duplicate-ids
---

# Prevent upsert_all crash on duplicate Discogs listing IDs across pages

## Context

The Discogs inventory API can return the same listing across multiple pages when paginating. This is inherent to Discogs' pagination — a listing may appear on pages N and N+1 if its sort position changes between requests (the API is eventually consistent within a pagination session).

## Problem

`StoreSyncService#import_listings` collects all normalized listings across all fetched pages, then passes them to `ActiveRecord#upsert_all` in a single batch. When the same `discogs_listing_id` appears on two pages, `upsert_all` fails with:

```
PG::CardinalityViolation: ERROR: ON CONFLICT DO UPDATE command cannot affect row a second time
```

This happens because PostgreSQL's `ON CONFLICT DO UPDATE` cannot process multiple rows with the same conflict target within a single statement.

## Solution

Deduplicate the records array by `discogs_listing_id` before passing to `upsert_all`:

```ruby
records = records.uniq { |r| r[:discogs_listing_id] }
```

## Impact

- Resolves the crash during `stores:sync` with `MAX_PAGES` set
- Also protects full syncs (all pages) against the same issue, which can occur when Discogs pagination boundaries shift mid-sync
- No data loss: the first occurrence of each listing ID is kept, subsequent duplicates are dropped
