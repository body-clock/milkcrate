---
title: "Discogs OAuth 1.0a integration and inventory CSV export"
date: 2026-05-22
category: integration-issues
module: discogs_client
problem_type: integration_issue
component: authentication
severity: high
tags:
  - oauth
  - discogs
  - inventory-export
  - csv-parsing
  - api-authentication
applies_when:
  - "Adding new OAuth-authenticated endpoints to DiscogsClient"
  - "Debugging the inventory export trigger → poll → download flow"
  - "Understanding which Discogs API endpoints require seller-level OAuth"
  - "Adding or modifying CSV column mappings for inventory exports"
---

# Discogs OAuth 1.0a Integration and Inventory CSV Export

## Context

Milkcrate syncs Discogs seller inventory and presents it as a curated storefront. The public Discogs API (authenticated with a personal access token) is limited to 10,000 listings per seller and cannot detect sold listings. Two capabilities require **seller-level OAuth 1.0a**:

1. **Inventory Export API** — full CSV of every listing with no 10k ceiling
2. **List Orders API** — poll for new orders to detect sold listings

The personal access token belongs to the application (milkcrate) and only grants access to the application owner's data. To act on behalf of a seller (e.g., Philadelphia Music), we need OAuth tokens obtained through the seller authorizing the application.

## OAuth 1.0a Flow

Discogs uses OAuth 1.0a (not OAuth 2.0). Key endpoints:

| Step | Endpoint | Method | Purpose |
|------|----------|--------|---------|
| 1 | `https://api.discogs.com/oauth/request_token` | GET | Obtain request token |
| 2 | `https://www.discogs.com/oauth/authorize` | GET | User authorizes app (browser redirect) |
| 3 | `https://api.discogs.com/oauth/access_token` | POST | Exchange verifier for access token |
| 4 | `https://api.discogs.com/oauth/identity` | GET | Verify identity (returns username) |

**Critical details:**

- **Authorize URL is on `www.discogs.com`**, not `api.discogs.com`. The `OAuth::Consumer` gem always prepends `site` to `authorize_path`, so the authorize URL must be constructed manually:
  ```
  "https://www.discogs.com/oauth/authorize?oauth_token=#{rt.token}"
  ```
- **Request tokens expire after 15 minutes** — if the callback takes longer, the user needs to restart the flow
- **Access tokens never expire** (unless revoked by the user) — store them permanently
- **Signature method**: Discogs suggests PLAINTEXT but also supports HMAC-SHA1. The `oauth` gem defaults to HMAC-SHA1, which works fine
- **Callback URL** must be registered in Discogs developer settings and match the URL passed during the request token step

### Auth Levels

| Credentials | Rate limit | Image URLs | Acts as user |
|-------------|-----------|------------|-------------|
| None | Low | No | No |
| Consumer key/secret only | High | Yes | No |
| Personal access token | High | Yes | Token owner only |
| **Full OAuth 1.0a** | High | Yes | **Any user who authorizes** |

The personal access token is suitable for reading public inventory data. Only OAuth 1.0a gives access to seller-protected endpoints like inventory export and marketplace orders.

## Authentication Implementation

### Shared OAuth Consumer (`DiscogsOauthConsumer.build`)

The `OAuth::Consumer` configuration is identical across three classes and should be defined in one place:

```ruby
# app/services/discogs_oauth_consumer.rb
OAuth::Consumer.new(
  key, secret,
  site: "https://api.discogs.com",
  request_token_path: "/oauth/request_token",
  authorize_path: "/oauth/authorize",
  access_token_path: "/oauth/access_token"
)
```

Used by:
- `DiscogsOauthClient` — OAuth dance (request token, exchange, verify identity)
- `DiscogsClient` — OAuth-signed requests for export/order endpoints
- `AuthController` — reconstructs request token in callback

### Client Architecture

Two authentication modes live on `DiscogsClient`:

1. **Personal access token** — used via Faraday connection with `Authorization: Discogs token=#{token}` header. Powers public API calls (`seller_inventory`, `release`, `seller_profile`)
2. **OAuth access token** — used via `OAuth::AccessToken` for seller-protected endpoints. Powers `inventory_export`, `check_export_status`, `download_export`, `list_orders`

## Inventory Export API

### Endpoints

| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/inventory/export` | POST | Request a CSV export | `{ "id": 42 }` (or 409 if export in progress) |
| `/inventory/export` | GET | List recent exports | `{ "exports": [...] }` |
| `/inventory/export/{id}` | GET | Check export status | `{ "status": "completed" }` (or 304 if not modified) |
| `/inventory/export/{id}/download` | GET | Download CSV | Raw CSV body |

### Response Handling

- **409 Conflict** on trigger — an export is already running. Fall back to checking recent exports via `GET /inventory/export`
- **304 Not Modified** on status check — export is still being generated. Retry after polling interval
- The export ID field may be `"id"` or `"export_id"` — handle both
- The response body shape for status check and export listing may vary; log the actual response shapes on first live export to confirm

### Polling Configuration

```ruby
POLL_INTERVAL = 5.seconds
MAX_POLL_TIME = 10.minutes
```

## CSV Export Format

The actual Discogs inventory export CSV columns differ from what the API documentation might suggest. Verified columns from a real export:

```
listing_id,artist,title,label,catno,format,release_id,status,price,
listed,comments,media_condition,sleeve_condition,accept_offer,
external_id,weight,format_quantity,location,quantity
```

### Column Mapping

| CSV Column | Parser Field | Type | Notes |
|-----------|-------------|------|-------|
| `listing_id` | `discogs_listing_id` | string | Always present |
| `release_id` | `discogs_release_id` | string | |
| `artist` | `artist` | string | |
| `title` | `title` | string | |
| `label` | `label` | string | |
| `format` | `format` | string | |
| `media_condition` | `condition` | string | Not `condition` as column name |
| `price` | `price` | decimal | |
| `listed` | `listed_at` | datetime | Not `posted` as column name |
| `comments` | `notes` | string | |
| `status` | `_status` | string | Used for filtering, not stored |

### Filtering Rules

Records are filtered **after** parsing by `RecordFilter`:
- **Vinyl only**: Exclude CD, Cassette, DVD, VHS
- **Available only**: Exclude Sold, Draft, Expired statuses
- **Has listing_id**: Exclude rows without a listing_id

## Key Files

| File | Purpose |
|------|---------|
| `app/services/discogs_oauth_consumer.rb` | Shared OAuth consumer builder |
| `app/services/discogs_oauth_client.rb` | OAuth dance (request token, exchange, verify) |
| `app/services/discogs_client.rb` | Both public token + OAuth-signed API calls |
| `app/services/auth_callback_service.rb` | Handles OAuth callback, creates StoreOwner + Store |
| `app/services/authorize_store_service.rb` | Validates seller inventory, initiates OAuth |
| `app/services/csv_export_sync/csv_parser.rb` | Parses Discogs CSV into normalized records |
| `app/services/csv_export_sync/record_filter.rb` | Filters parsed records (vinyl, available, has ID) |
| `app/services/csv_export_sync/export_requester.rb` | Trigger → poll → download loop |
| `app/services/csv_export_sync_service.rb` | Orchestrates full CSV import pipeline |

## Why This Matters

Before this integration, the sync was limited to 10,000 listings per store via the paginated public API. Stores like Philadelphia Music with 90,000 listings showed only a fraction of their inventory. OAuth unlocks the full inventory via CSV export and enables sold-item detection via order polling — both essential for the product's core value proposition.

## When to Apply

- Adding a new Discogs API endpoint that requires seller-level access
- Modifying the sync pipeline for OAuth-authorized stores
- Debugging export failures or CSV parsing issues
- Understanding why a particular endpoint returns 401 (check if it needs OAuth vs app token)
