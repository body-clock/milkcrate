# Sidenotes

Quick-captured thoughts, ideas, and tasks collected during sessions.

<!-- Entries are appended by /sn — newest first -->

## 2026-05-28

- ~~**Pile sheet exit animation missing** — The pile sheet slides in smoothly with a spring animation (`springDrawer`), but on close it disappears instantly with no exit transition. The drawer just vanishes instead of sliding back out, which feels jarring after the polished entry. Should add an exit animation (slide-out matching the entry direction) or a fade-out so the dismissal feels intentional rather than abrupt.~~
  ✅ *Resolved — Wrapped in `AnimatePresence` with `exit` animation reversing entry direction (backdrop fades out, drawer slides back down/right).*

## 2026-05-27

- **Freshness scoring shouldn't hard-code 3 points** — The current freshness value gives exactly 3 points. This should be a fine-tuned, emergent behavior instead. The model should learn to weigh recency appropriately based on data patterns, not a fixed multiplier. Needs experimentation to find the right approach (decay function, ML feature, etc.).


