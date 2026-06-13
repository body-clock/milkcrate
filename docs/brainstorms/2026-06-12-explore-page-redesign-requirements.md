---
date: 2026-06-12
topic: explore-page-redesign
---

# Explore Page Redesign

## Summary

Redesign the explore page from a plain directory into a discovery experience with a featured section, richer store cards, and filtering to only show ready stores.

---

## Problem Frame

The current explore page lists all stores as simple text cards (name, username, listing count). It feels like a contact list, not a place to discover record stores. There's no visual hierarchy, no incentive to click, and stores that haven't been synced or enriched show up with incomplete data ("Waiting on first enrichment"). The page doesn't answer "why should I click on this one?"

---

## Requirements

**Filtering**

- R1. Only show stores that have completed at least one sync and one enrichment cycle
- R2. Hide stores where `last_synced_at` or `last_enriched_at` is NULL

**Featured section**

- R3. Show a "Featured" section at the top of the page
- R4. Feature 3 stores per day, selected randomly
- R5. Featured stores rotate daily (different set each day)
- R6. Featured stores are drawn from the same pool of ready stores (filtered by R1/R2)

**Store cards**

- R7. Each store card displays: store name, @username, and listing count (existing)
- R8. Each store card displays location if available from Discogs profile
- R9. Each store card displays profile picture/avatar if available from Discogs API
- R10. Each store card displays genre tags parsed from the store's Discogs profile description
- R11. Each store card displays a short description from the store's Discogs profile
- R12. Cards with missing data show whatever is available (no exclusion for incomplete profiles)

**Layout**

- R13. Featured section appears above the main grid
- R14. Main grid retains current responsive behavior (2 columns mobile, 3 desktop)

---

## Success Criteria

- The explore page feels like a place to discover stores, not a directory
- Users have a reason to click on a specific store (visual hook from avatar, description, or tags)
- Stores that aren't ready don't clutter the page
- Featured section provides variety and encourages exploration

---

## Scope Boundaries

- Inventory-derived genre tags (analyzing listing genres during enrichment) are deferred to a later iteration
- Store owners cannot control whether they appear in the featured section
- No manual curation interface for featured stores (rotation is random)
- No search or filter functionality beyond the featured section and genre tags

---

## Key Decisions

- Random rotation for featured stores instead of algorithmic or manual curation (avoids favoring the same popular stores)
- Profile descriptions used for genre tags instead of inventory analysis (simpler, can add inventory-derived tags later)
- Incomplete stores shown with available data instead of hidden (keeps the directory complete)

---

## Dependencies / Assumptions

- Discogs API provides avatar_url in user profile response
- Discogs API provides location in user profile response
- Store model has `last_synced_at` and `last_enriched_at` fields for filtering
- Genre tag parsing from profile descriptions is best-effort (some stores have no useful description)

---

## Outstanding Questions

### Deferred to Planning

- [Needs research] How to parse genre tags from freeform profile descriptions (regex keywords? simple pattern matching?)
- [Technical] How to implement daily rotation for featured stores (random seed based on date? database query with offset?)
- [Technical] Should avatar URLs be cached locally or fetched from Discogs on each page load?
