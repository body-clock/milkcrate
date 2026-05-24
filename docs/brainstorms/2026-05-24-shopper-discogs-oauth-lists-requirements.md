---
date: 2026-05-24
topic: shopper-discogs-oauth-lists
---

# Shopper Discogs OAuth + Lists Integration

## Summary

Give Milkcrate shoppers the ability to send their pile of record listings to a private Discogs list for easy purchasing, using a lightweight OAuth flow and the Discogs Lists API. A small icon in the header shows connection status, and the pile sheet provides the "Create Discogs list" action.

---

## Problem Frame

Shoppers browsing a store on Milkcrate can add records to their pile, but there's no way to efficiently move those records into a Discogs purchase flow. They have to manually find each listing on Discogs and add it to their cart — a high-friction process that kills conversion. The pile sheet currently has a disabled "Add all to Discogs cart" button labeled "Coming soon," but Discogs has no public cart API. Meanwhile, the "Discogs ↗" link in the header is confused with unclear labeling and destination.

---

## Actors

- A1. **Shopper**: Browsing a store's catalog on Milkcrate, adding records to their pile.
- A2. **Discogs API**: OAuth identity, Lists API, and release endpoints.

---

## Key Flows

- F1. **Shopper authenticates via header icon**
  - **Trigger:** Shopper hovers on Discogs icon in header, sees tooltip, clicks to connect.
  - **Actors:** A1, A2
  - **Steps:**
    1. Shopper clicks Discogs icon in header.
    2. Browser redirects to Discogs OAuth authorize page.
    3. Shopper approves access on Discogs.
    4. Discogs redirects to Milkcrate callback URL.
    5. Milkcrate exchanges verifier for access tokens.
    6. Tokens stored persistently in `discogs_shopper_identities`.
    7. Shopper redirected back to store page with connected status.
  - **Outcome:** Shopper is authenticated and sees connected status in header.
  - **Covered by:** R1, R2, R3, R8

- F2. **Shopper creates Discogs list from pile**
  - **Trigger:** Shopper opens pile sheet and clicks "Create Discogs list."
  - **Actors:** A1, A2
  - **Steps:**
    1. Shopper opens pile sheet.
    2. Clicks "Create Discogs list" button.
    3. If not authenticated, redirect to F1 first.
    4. System creates a private Discogs list on shopper's account named "Picks from {store_name}."
    5. System adds each pile item as a release entry in the list.
    6. Shopper is redirected to the Discogs list URL.
    7. Pile remains intact (list creation is non-destructive).
  - **Outcome:** A private Discogs list exists on the shopper's account containing all pile releases.
  - **Covered by:** R4, R5, R6, R7, R9, R10

---

## Requirements

**Shopper OAuth Infrastructure**
- R1. Create a `discogs_shopper_identities` database table with columns: `id`, `discogs_username`, `oauth_token`, `oauth_token_secret`, `store_slug` (the store where they authed), `last_used_at`, `created_at`, `updated_at`.
- R2. Add OAuth callback handling for shoppers — reuse or extend the existing `/auth/discogs/callback` route to accept an `origin` parameter that redirects back to the correct store page after auth.
- R3. Shopper OAuth tokens persist across sessions. Token revocation or invalidation clears the stored identity for that user+store combination.

**Discogs Lists API**
- R4. Create a new service (e.g., `Discogs::ShopperListClient`) with methods: `create_list(name:, description:, is_private: true)` and `add_item(list_id:, release_id:)`.
- R5. Map each pile listing to its Discogs `release_id` for the list API call. Handle listings missing release data gracefully (skip, with user-visible count of skipped items).
- R6. List names follow the format `"Picks from {store_name}"`. Store name is the store's display name in Milkcrate. Lists are private by default.

**Header UI**
- R7. Replace the current text link "Discogs ↗" / "Store ↗" with a small Discogs logo icon in the header.
- R8. Icon shows a tooltip on hover: when disconnected shows "Connect with Discogs", when connected shows "Connected as @{discogs_username}". Connected state also shows a subtle indicator (e.g., filled dot or checkmark).

**Pile Integration**
- R9. The pile sheet's "Add all to Discogs cart" button is replaced with "Create Discogs list" (or "Send to Discogs"). When the shopper is not authenticated, clicking this button initiates the OAuth flow (F1) before proceeding.
- R10. After the list is created successfully, show a success state in the pile sheet with a link to the Discogs list. Provide feedback on how many items were added vs. skipped.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3, R8.** Given a shopper browsing `sonic-boom.milkcrate.com`, when they click the Discogs icon in the header and complete the OAuth flow, the header updates to "Connected as @shopper_user" and the authentication persists across page reloads and browser sessions.
- AE2. **Covers R5, R9, R10.** Given a shopper with 5 items in their pile (4 with valid release_id, 1 missing), when they click "Send to Discogs" in the pile sheet after authenticating, a list is created on their Discogs account with 4 releases and the pile sheet shows "Added 4 of 5 items to your list (1 skipped — missing release data)."
- AE3. **Covers R9.** Given an unauthenticated shopper with items in their pile, when they click "Send to Discogs," they are redirected to the Discogs OAuth authorize page before proceeding.

---

## Success Criteria

- A shopper can go from browsing → adding to pile → receiving a Discogs list URL in under 30 seconds of wall-clock time (excluding OAuth redirect).
- The header icon is unobtrusive (no text label in the nav flow) but discoverable.
- Zero regressions in the existing store owner OAuth flow.

---

## Scope Boundaries

- **Direct one-click purchase** is deferred. This feature creates a list for browsing-based purchasing, not an automated buy.
- **Wantlist integration** is deferred. Discogs lists provide the right level of organization for pile-to-cart flow.
- **Public or shareable lists** are deferred. Lists default to private. A public/shareable option can be added later.
- **Cross-store aggregated lists** are deferred. Lists are created per store visit. A combined list from multiple stores is future work.

---

## Key Decisions

- **Shopper OAuth over session-only:** Persistent tokens mean shoppers authenticate once, not every session. More durable, better UX.
- **Discogs Lists over Wantlist:** Lists are more flexible (custom naming, grouping, notes) and map better to the "store picks" metaphor than the permanent Wantlist.
- **Icon + tooltip over text button:** Smaller header footprint. The icon is recognizable to Discogs users and unobtrusive to others.
- **Two entry points for auth:** Header icon for discovery, pile sheet for functional auth-at-time-of-need.

---

## Dependencies / Assumptions

- The Discogs Lists API (`POST /lists`, `POST /lists/{id}/items`) is publicly available and supports OAuth 1.0a with the same consumer key used for store owner auth.
- Each pile listing's data includes or can derive a `release_id` (the Discogs release identifier, distinct from the seller's `listing_id`).
- Existing `DiscogsOauthClient` and `DiscogsOauthConsumer` can be reused for shopper auth without breaking the store owner flow.
- The existing `/auth/discogs/callback` can be extended to handle both store-owner and shopper flows via a session flag or route param.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R1][Technical] Should `discogs_shopper_identities` be keyed on `(discogs_username, store_slug)` or a single session/token per shopper globally?
- [Affects R2][Needs research] Does the existing `/auth/discogs/callback` handler need modification or is a new route cleaner?
- [Affects R5][Needs research] Where is `release_id` available in the existing listing data model? Verify against the Discogs API response shape for seller inventory.
- [Affects R7][Technical] Where to source a small Discogs logo icon? SVG from Discogs brand resources or a Unicode approximation.
- [Affects R4][Technical] Does the Lists API support adding items one at a time or in batch? Determine optimal batching strategy.
