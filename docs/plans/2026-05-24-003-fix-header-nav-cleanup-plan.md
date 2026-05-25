---
title: "Header Nav Cleanup"
type: fix
status: active
date: 2026-05-24
---

# Header Nav Cleanup

## Summary

Two small header fixes in `app/frontend/layouts/app_layout.tsx`: remove the "Is this your store?" button and fix navigation link destinations.

## Implementation

### U1. Remove "Is this your store?" link
- Delete the `{discogsUsername && !oauthAuthorized && (...)}` form block
- Clean up unused `oauthAuthorized` variable and type parameter

### U2. Fix header navigation links
- Store name → links to store view at `/{discogsUsername}`
- "on Milkcrate" → links to root `/`
- BrandMark on non-store pages → stays at root `/`
- Wrapping div preserves layout styling

### U3. Update test
- Fix `oauth_claims.test.tsx` to verify Discogs link + store name link instead of removed claim button

## Files Changed
- `app/frontend/layouts/app_layout.tsx`
- `app/frontend/test/pages/oauth_claims.test.tsx`
