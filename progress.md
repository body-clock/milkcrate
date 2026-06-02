# Progress

## Status
In Progress — batch refactoring Sandi Metz oxlint warnings

## Completed
- `app/frontend/hooks/use_pointer_proximity.ts` — 4 warnings resolved
  - Extracted magic numbers `HALF` and `PROXIMITY_FACTOR`
  - Split 55-line hook into `usePointerEnter`, `usePointerMove`, `usePointerLeave`, `useRafCleanup`, and a slim `usePointerProximity`
  - Suppressed false-positive `no-param-reassign` and `react-hooks/exhaustive-deps` for React ref patterns
