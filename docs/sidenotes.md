# Sidenotes

Quick-captured thoughts, ideas, and tasks collected during sessions.

<!-- Entries are appended by /sn — newest first -->

## 2026-05-28

- ~~**Pile sheet exit animation missing** — The pile sheet slides in smoothly with a spring animation (`springDrawer`), but on close it disappears instantly with no exit transition. The drawer just vanishes instead of sliding back out, which feels jarring after the polished entry. Should add an exit animation (slide-out matching the entry direction) or a fade-out so the dismissal feels intentional rather than abrupt.~~
  ✅ *Resolved — Wrapped in `AnimatePresence` with `exit` animation reversing entry direction (backdrop fades out, drawer slides back down/right).*


