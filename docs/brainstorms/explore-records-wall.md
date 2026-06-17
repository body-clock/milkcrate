---
date: 2026-06-15
topic: explore-records-wall
---

# Explore Page Records Wall

## Summary

Add a featured records wall to the top of the explore page that shows curated records from across all stores, with each record linking directly into the store's crate view.

---

## Problem Frame

The explore page currently shows a directory of record stores that first-time visitors don't recognize. Analytics show 22 visitors entered on `/explore` with an average time of 13 seconds and 72% of all exits. Visitors from Reddit and Hacker News see store names like "BKRecordExchange" — which mean nothing to them — and leave without clicking through. The page has no hook that demonstrates the actual product experience (browsing records in crates).

---

## Requirements

**Featured records wall**

- R1. Display a horizontal scroll rail of curated records at the top of the explore page, above the existing store directory.
- R2. Sample records from across all stores using the same curation logic that determines what appears on each store's wall.
- R3. Each record tile displays only cover art (no text visible by default). Tapping/clicking reveals the record details and store name.
- R4. Clicking a record tile navigates to that store's crate view, landing where that record exists in the store's inventory.
- R5. The rail displays approximately 20-30 records (tunable), showing 3-4 at a time.
- R6. The rail uses horizontal scroll (Netflix-style) consistent across all screen sizes — same behavior on mobile and desktop.
- R7. The wall has a distinct visual identity from the per-store wall — it should feel like a cross-store discovery surface, not a merged store wall.

**Store directory (unchanged)**

- R10. The existing store directory grid remains below the records wall with no changes to its behavior.

**Mobile and responsiveness**

- R8. The horizontal scroll rail works with touch gestures on mobile (swipe to scroll).
- R9. The store directory below the rail remains responsive (1 column mobile, 2 small, 4 large).

---

## Success Criteria

- Visitors spend more time on the explore page (target: >30 seconds average, up from 13).
- Higher click-through rate from explore to individual store pages.
- Lower bounce rate on explore page.

---

## Scope Boundaries

- In scope: Records wall component, aggregated record query, navigation from record to store crate.
- Out of scope: Genre filtering (separate feature), changing where external links point, altering the store directory.
- Deferred for later: Editorial curation controls, rotating/refreshing the featured set on a schedule.

---

## Visual layout

```
+----------------------------------------------------------+
|  Explore Record Stores                                    |
|  Discover independent record stores powered by MilkCrate  |
+----------------------------------------------------------+
|                                                          |
|  [Record] [Record] [Record] [Record] [Record] [Record] > |
|   (horizontal scroll rail — cover art only, 3-4 visible) |
|                                                          |
+----------------------------------------------------------+
|  Featured Stores                           [3]            |
|  +--------+  +--------+  +--------+                      |
|  | Store1 |  | Store2 |  | Store3 |                      |
|  +--------+  +--------+  +--------+                      |
+----------------------------------------------------------+
|  All Stores                                [36]           |
|  +------+ +------+ +------+ +------+                      |
|  | S1   | | S2   | | S3   | | S4   |                     |
|  +------+ +------+ +------+ +------+                      |
+----------------------------------------------------------+
```

---

## Key Decisions

- Reuse existing wall curation logic rather than building a new algorithm.
- Keep store directory below records wall to serve both discovery and store-browsing use cases.
- Horizontal scroll rail with cover art only — clean, visual, curiosity-driven.
- Distinct visual identity from per-store wall — this is a cross-store discovery surface.

---

## Dependencies / Assumptions

- Stores have enough records to populate a meaningful wall (currently ~36 stores with varying inventory).
- The wall curation logic is accessible and can be run across all stores in a single query.
