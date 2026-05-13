---
title: "Responsive branching refactors silently drop guard conditions from non-primary paths"
date: 2026-05-13
category: logic-errors
module: storefront
problem_type: logic_error
component: frontend_stimulus
symptoms:
  - "CrateTabs rendered on desktop when hideTabs prop was true — guard condition lost during isCompact refactoring"
  - "navigate function returned boolean but no caller consumed the return value — dead return type artifact"
root_cause: logic_error
resolution_type: code_fix
severity: medium
tags: [responsive, branching, guard-condition, refactoring, code-review, react, typescript, viewport]
---

# Responsive Branching Refactors Silently Drop Guard Conditions

## Problem

When refactoring a single render path into responsive `isCompact` branches, guard conditions (like `!hideTabs`) were replicated to the compact path but accidentally dropped from the non-compact path. The condition existed in the original single-path code but the refactor only carried it to one branch. Additionally, a function's return type was changed from `void` to `boolean` as an internal artifact, but no caller consumed the new return value — a dead-code signal that the refactor touched the function contract without completing the caller-side work.

## Symptoms

- **CrateTabs rendered when they should be hidden.** On desktop viewports with `hideTabs={true}`, the crate tab row appeared in the empty-crate state because the non-compact branch rendered `<CrateTabs>` without checking the `hideTabs` prop.
- **Unused boolean return type.** `navigate()` returned `boolean` (true/false for navigation success/failure), but every call site — button `onClick`, keyboard handler, `handleDragEnd` — discarded the return value. The hint-dismissal side effect happened inside the function regardless.

## What Didn't Work

These were found during a multi-agent code review (`ce-code-review`), not through trial-and-error debugging. The review surfaced both issues before they reached production. The key insight: neither bug would have been caught by existing tests because the empty-crate path had zero test coverage and the boolean return had no consumer-side assertions.

## Solution

### Fix 1: Restore the `!hideTabs` guard to the non-compact branch

The original empty-crate render path (before responsive refactoring):

```tsx
// Original — single path, guard condition is elsewhere (caller doesn't render CrateView at all)
{backButton}
<div className="mb-3">
  <CrateTabs crates={crates} activeSlug={activeSlug} onSelect={onSelectCrate} />
</div>
```

After the `isCompact` refactor — the `!hideTabs` guard was replicated to the compact path inside `compactHeader` but omitted from the non-compact branch:

```tsx
// Broken — non-compact path renders CrateTabs unconditionally
{isCompact ? compactHeader : backButton}
{!isCompact && (
  <div className="mb-3">
    <CrateTabs crates={crates} activeSlug={activeSlug} onSelect={onSelectCrate} />
  </div>
)}
```

The fix adds the guard back:

```tsx
// Fixed — guard restored to the non-compact branch
{isCompact ? compactHeader : backButton}
{!isCompact && !hideTabs && (
  <div className="mb-3">
    <CrateTabs crates={crates} activeSlug={activeSlug} onSelect={onSelectCrate} />
  </div>
)}
```

### Fix 2: Remove the dead boolean return

The `navigate` function gained a `boolean` return type during the refactor (to internally gate `setShowGestureHint(false)`), but the hints are dismissed as a side effect inside the function — the return value was never checked by callers:

```tsx
// Broken — boolean return never consumed
const navigate = useCallback((delta: number) => {
    const next = index + delta
    if (next < 0 || next >= total) return false  // dead return value
    direction.current = delta
    setIndex(next)
    setShowGestureHint(false)
    return true  // dead return value
}, [index, total])
```

The fix removes the boolean return and keeps the side effect:

```tsx
// Fixed — void return, side effect intact
const navigate = useCallback((delta: number) => {
    const next = index + delta
    if (next < 0 || next >= total) return
    direction.current = delta
    setIndex(next)
    setShowGestureHint(false)
}, [index, total])
```

## Why This Works

The `!hideTabs` guard was always part of the component's contract — it existed in the original single-path code through the calling component. When the render path was split into `isCompact` branches, the guard was correctly wired into the compact path (`compactHeader` already checks `hideTabs` internally) but the refactor didn't carry the same check to the now-separate non-compact path. Restoring it at the branch point makes every path respect the same guard, matching the main (non-empty) render path which already had `{!isCompact && !hideTabs && (...)}`.

The boolean return was a function-contract artifact: `navigate` was changed to return a success/failure signal during the refactor, but the surrounding work that would have consumed that signal (e.g., having `handleDragEnd` check the return to dismiss the hint) was completed in a different way — by putting the dismissal side effect inside `navigate`. The boolean became vestigial the moment `setShowGestureHint(false)` moved inside the function.

## Prevention

**After any responsive branching refactor, audit every render site for guard-condition parity across all branches.** The pattern: when a single `{component}` or `{condition && <Component />}` is split into `{isCompact ? <CompactVariant /> : <DesktopVariant />}`, every guard that applied to the original single path must appear on every branch.

A concrete audit checklist for responsive refactors:

1. **Find every guard condition** on the original render path (prop gates like `!hideTabs`, data gates like `records.length > 0`, permission gates)
2. **Verify each guard appears on every new branch** — compact path, non-compact path, and any intermediate tiers
3. **Check the empty/error state paths separately** — they often have their own branching and are easy to miss during review
4. **Test every branch with the guard condition active** — a test that sets `hideTabs={true}` on a desktop viewport would have caught the regression immediately

For dead return types: **when a function's contract changes during refactoring, verify that every call site either consumes the new contract or that the contract isn't needed.** If the new return value drives a side effect inside the function but isn't checked externally, keep the side effect and drop the return type. TypeScript's `noUnusedLocals` won't catch this because the return value is computed — a focused code review pass on function contracts catches it.

### Test patterns that would have caught these

```tsx
// Guards the empty-crate desktop path
it("hides tabs in empty desktop state when hideTabs is true", () => {
  render(<CrateView crates={[]} activeSlug="" hideTabs={true} ... />)
  expect(screen.queryByRole("tablist")).not.toBeInTheDocument()
})

// Guards against vestigial return types
// (caught by code review, not tests — but if navigate were extracted as a hook,
//  its return type would be part of the public contract and testable)
```

## Related

- `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md` — the viewport tier system the refactored code uses. Documents the boolean-inversion audit rule (`isDesktop ? X : Y` → `isCompact ? Y : X`) which is the same class of refactoring pitfall.
- PR [#140](https://github.com/body-clock/milkcrate/pull/140) — the CrateView mobile space pass where these bugs were found and fixed.
- Plan: `docs/plans/2026-05-13-001-feat-crate-view-mobile-space-plan.md`
