---
date: 2026-05-07
topic: featured-crate-limits
---

# Featured Crate Display Limits

## Summary

Cap featured crates (New Arrivals, Daily Rotation) to 4 records on the homepage while allowing the full crate view to show up to 50 records from the same ranked pool — matching the pattern genre crates already use.

---

## Problem Frame

Featured crates currently send all their listings over the wire for the homepage, even though the frontend only displays 4 cover images per crate. This wastes bandwidth and leaves an unused `FEATURED_CRATE_SIZE = 4` constant in the codebase. Meanwhile, clicking into a featured crate shows every record — there's no upper bound — making the browsing experience inconsistent with genre crates, which cap at 50.

The genre crates already demonstrate the desired pattern: a per-crate data cap on the backend (`GENRE_CRATE_SIZE = 50`), with crate cards showing just 4 cover images as a preview. Applying the same discipline to featured crates reduces payload size on the homepage and gives the crate view a reasonable browse depth.

---

## Requirements

- R1. Featured crates on the homepage send at most 4 records to the frontend (data-level cap, not just frontend display slicing).
- R2. Opening a featured crate into the full crate view shows up to 50 records drawn from the same ranked pool — the homepage 4 are the top of the same 50.
- R3. The crate card count badge reflects the full pool size (50), not the preview cap (4), so users know more records are available when they click in.
- R4. The existing `FEATURED_CRATE_SIZE = 4` constant is applied as the homepage cap; the crate-view cap reuses the existing `GENRE_CRATE_SIZE` (50) or a clear equivalent.

---

## Acceptance Examples

- AE1. **Covers R1, R4.** Given featured crates are present, when the homepage loads, each featured crate section contains at most 4 record objects in its data payload.
- AE2. **Covers R2.** Given a user clicks into a featured crate from the homepage, when the crate view opens, the user can browse up to 50 records in the card stack.
- AE3. **Covers R3.** Given a featured crate has more than 4 records in its full pool, when the homepage renders the crate card, the count badge displays the full total (e.g., "50"), not "4".

---

## Success Criteria

- Homepage payload for featured crates is reduced to at most 4 records per crate instead of the full pool.
- Clicking into a featured crate from the homepage presents a browseable view with up to 50 records.
- No change to how featured crate records are selected or ranked — only the display caps change.

---

## Scope Boundaries

- Changing the selection or ranking logic for featured crate records.
- Modifying genre crate or picks wall behavior.
- Mobile vs desktop display differences.

---

## Key Decisions

- **Reuse genre crate pattern**: The same two-tier approach (small preview cap for the homepage section, larger cap for the full crate view) that genre crates already use. Featured crates follow the same `FEATURED_CRATE_SIZE` / `GENRE_CRATE_SIZE` split.
- **Count shows full total**: The crate card's count badge reflects the full pool (50), not the preview cap (4), so the homepage communicates depth rather than appearing sparse.
