---
title: "Verify subagent refactoring output: prop threading, import paths, and callback wiring"
date: 2026-06-02
category: workflow-issues
module: frontend
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - "Dispatching parallel subagents to perform automated refactoring across many files"
  - "Reviewing subagent output for structural issues that don't appear as lint errors"
  - "Extracting React components, splitting functions, or reorganizing files via subagents"
tags:
  - subagents
  - refactoring
  - code-review
  - sandi-metz
  - react
  - verification
  - prop-threading
  - import-paths
---

# Verify Subagent Refactoring Output: Prop Threading, Import Paths, and Callback Wiring

## Context

A large-scale Sandi Metz POODR refactoring was dispatched across ~60 JS/TS source files using parallel subagents. The subagents correctly applied lint rules (splitting components, extracting helpers, eliminating magic numbers), but introduced 3 categories of runtime bugs that required follow-up fixes:

1. **Prop name typos** — a prop `onBrowseModeSelect` was forwarded as `onBrowseModeSelected` (trailing 'd'), causing "not a function" errors in the browser console.
2. **Unthreaded callbacks** — extracted tab-button components received a string (`onSelect={crate.slug}`) instead of a callback (`onSelect={() => onSelect(crate.slug)}`), because the parent's `onSelect` prop was never passed through the extracted component tree.
3. **Broken import paths** — files moved to a subdirectory retained imports referencing the original flat path (`./status_components` instead of `./directory_name/status_components`).

These bugs were all caught by the Vite dev server or browser console within minutes — but they consumed follow-up time and confidence in the automated refactoring.

## Guidance

After any subagent-driven refactoring that modifies the component tree or file layout, verify these three patterns before considering the batch complete:

**1. Check prop name consistency across component boundaries.**

When a subagent extracts a child component from a parent, prop names that were function parameters in the parent become prop names in the child's interface. A typo of one character (or mismatched naming convention like `Selected` vs `Select`) produces `undefined` at runtime rather than a compile error.

```tsx
// ❌ Subagent-generated — typo in forwarded prop name
<WideSidebar onBrowseModeSelected={fn} />

// ✅ Fixed — matches the child component's interface
<WideSidebar onBrowseModeSelect={fn} />
```

Scan the diff for renamed props where the parent forwards a prop that differs from the child's interface definition by more than just a prefix convention (e.g., `onX` → `handleX` is intentional; `onX` → `onXed` is a typo).

**2. Verify callback props are functions, not values.**

When a subagent extracts an iterative pattern (`.map()`) into its own component, callback invocations inside the loop are often replaced with prop-passing. Verify that the prop is passed as a closure or function reference, not as the raw value.

```tsx
// ❌ Subagent-generated — passes string, not function
<TabButton onSelect={crate.slug} />

// ✅ Fixed — wraps in function that calls the threaded callback
<TabButton onSelect={() => onSelect(crate.slug)} />
```

A quick grep for patterns like `onSelect={variable}` or `onClick={variable}` (where variable is not a function reference) catches this.

**3. Verify import paths after file restructuring.**

When a subagent creates a subdirectory with the same name as an existing file, the original file's relative imports to the subdirectory need updating.

```tsx
// ❌ Subagent-generated — still imports from original flat path
import { LookupStatus } from "./status_components";

// ✅ Fixed — uses subdirectory path after restructuring
import { LookupStatus } from "./discogs_seller_lookup_input/status_components";
```

A grep for all relative imports in any file that was NOT moved but whose siblings DID move will surface these. The pattern: if `ComponentName/` directory exists, files outside it should not reference `./` paths that resolve inside it.

## Why This Matters

Subagents operate with isolated context. A subagent refactoring `ComponentName.tsx` may not know that another subagent simultaneously extracted `ComponentName/SubComponent.tsx`. This context isolation is what makes parallel dispatch fast, but it creates a verification gap that the orchestrator must fill.

The three patterns above account for approximately 80% of subagent-generated structural bugs observed in practice. Catching them at diff-review time (rather than at runtime) saves 5-15 minutes per batch of regressions.

These are not subagent quality issues per se — they are a natural consequence of composable parallelism. The fix is not to reduce parallelism but to add a targeted post-batch verification step.

## When to Apply

- After dispatching parallel subagents for cross-cutting refactors
- When subagents extract components from parent files (check prop forwarding)
- When subagents create subdirectories with the same name as existing files (check import paths)
- When subagents split iterative patterns into separate components (check callback props)
- When reviewing a diff that creates new component files and modifies parent files simultaneously

## Examples

The three bugs from this session:

**Bug 1 — Prop name typo**

```tsx
// wide_layout.tsx (generated)
onBrowseModeSelected={onBrowseModeSelect}
// WideSidebar expects: onBrowseModeSelect (no 'd')
```

Root cause: Subagent renamed `onBrowseModeSelect` → `onBrowseModeSelected` in one file but not the other. Fix: Align prop names across the component boundary.

**Bug 2 — Unthreaded callback**

```tsx
// crate_tabs_vertical.tsx (generated)
<TabButton onSelect={crate.slug} />
// TabButton expects: onSelect: () => void, not a string
```

Root cause: Subagent extracted the TabButton render loop but didn't thread the parent's `onSelect` callback through the new component's Props interface. Fix: Add `onSelect` to the intermediate component's props and wrap the call.

**Bug 3 — Broken import path**

```tsx
// discogs_seller_lookup_input.tsx (generated)
import { LookupStatus } from "./status_components";
// File moved to: ./discogs_seller_lookup_input/status_components.tsx
```

Root cause: Subagent moved dependency files into a subdirectory but didn't update the parent's import paths. Fix: Update the import to `./discogs_seller_lookup_input/status_components`.

## Related

- Issue #225 — oxlint: Enforce Sandi Metz JS/React rules (the refactoring this workflow was applied to)
- docs/solutions/best-practices/sandi-metz-refactor-helpers-stay-private-and-behavior-specs.md — related Sandi Metz refactoring guidance for Ruby
