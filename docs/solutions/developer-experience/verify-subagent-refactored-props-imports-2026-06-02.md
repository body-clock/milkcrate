---
title: Verify subagent-refactored component props and import paths
date: 2026-06-02
category: developer-experience
module: frontend_components
problem_type: developer_experience
component: tooling
severity: medium
applies_when:
  - "Using AI subagents (parallel or serial) to refactor JS/TS components"
  - "Subagents extract sub-components into separate files"
  - "Subagents create new directories alongside existing files"
tags:
  - subagent
  - code-review
  - refactoring
  - component-extraction
  - import-paths
  - prop-threading
---

# Verify subagent-refactored component props and import paths

## Context

During a large-scale sandi-metz refactoring of a React/TypeScript frontend, parallel subagents extracted ~60 new component files from existing components. Three classes of runtime bugs were introduced that all followed the same pattern: the subagent created well-formed individual files but failed to correctly wire the connections *between* them, and between extracted files and their parent directories.

The bugs only surfaced at runtime in the browser — no build-time or type-check warnings caught them.

## Guidance

After any subagent-driven component extraction or file restructuring, verify three things before declaring the refactor complete:

**1. Prop names must match at every forwarding layer**

When a subagent creates a chain of components (Parent → Child → Grandchild), verify that the prop name is identical at every forwarding point. The most common error is a one-character typo (e.g., `onBrowseModeSelected` vs `onBrowseModeSelect`) in a single forwarding layer.

```
// ❌ wide_layout.tsx forwards with a typo:
<WideSidebar onBrowseModeSelected={handler} />
// WideSidebar receives undefined for onBrowseModeSelect
// → "onBrowseModeSelect is not a function"

// ✅ Match the downstream interface name:
<WideSidebar onBrowseModeSelect={handler} />
```

Verify by: grepping the prop name across all files in the forwarding chain. Each file should reference the same spelling.

**2. Callback props must be functions, not values**

When a subagent extracts a clickable sub-component (like a tab button), it may pass a raw value instead of wrapping it in a function:

```
// ❌ Passes a string, not a function:
<TabButton onSelect={crate.slug} />
// → "onSelect is not a function"

// ✅ Wraps in a callback that calls onSelect with the slug:
<TabButton onSelect={() => onSelect(crate.slug)} />
```

This happens because the original code called `onSelect(crate.slug)` inline, and the subagent preserved the value but lost the function wrapper.

Verify by: looking at every `onSelect`, `onClick`, `onChange`, or `on*` prop on extracted sub-components. Confirm the value is a function reference or closure, not a scalar.

**3. Import paths must be updated when files move into subdirectories**

When a subagent takes a file and creates a same-named directory (e.g., `discogs_seller_lookup_input.tsx` → `discogs_seller_lookup_input/` subdirectory), any sibling imports from the parent file must be rewritten:

```
// Parent file: components/discogs_seller_lookup_input.tsx
// Subagent moved status_components.tsx → ./discogs_seller_lookup_input/status_components.tsx

// ❌ Old import (no longer resolves):
import { LookupStatus } from "./status_components";

// ✅ Updated import (points to subdirectory):
import { LookupStatus } from "./discogs_seller_lookup_input/status_components";
```

Verify by: running the dev server or a type check (`tsc --noEmit`) after subagent refactoring. Don't rely on the subagent to update imports — they have no awareness that the parent file remains in the original location.

## Why This Matters

These bugs share a root cause: subagents create internally consistent code at each target file, but have no awareness of the *connections* between files — the forwarding chain, the callbacks, and the relative import graph. Each individual file looks correct in isolation, and no build-time tool catches the errors because the types, exports, and function signatures are all technically correct. The errors only surface when a user clicks an element at runtime.

Without systematic verification, each refactoring batch produces 1-3 runtime errors that take additional fix-and-push cycles to resolve.

## When to Apply

- Before merging any subagent refactoring that touches more than 5 files
- After any subagent that created new component files alongside existing ones
- When the subagent creates a same-named subdirectory (e.g., `Component.tsx` → `Component/`)
- When components are split into parent-child-grandchild forwarding chains

## Examples

Example — full fix cycle for a broken prop forwarding chain:

```
1. Error: "Uncaught TypeError: onBrowseModeSelect is not a function"
2. Grep for "onBrowseModeSelect" and "onBrowseModeSelected" across all files
3. Found typo in wide_layout.tsx: onBrowseModeSelected → onBrowseModeSelect
4. Fix: rename prop to match downstream interface

1. Error: "Uncaught TypeError: onSelect is not a function"
2. Check crate_tabs.tsx → it has onSelect but doesn't pass it to extracted tab components
3. Check VerticalTabs/HorizontalTabs → they pass the string of the slug, not a function
4. Fix: add onSelect to both component interfaces, thread it from parent, wrap in closure

1. Error: Vite "Failed to resolve import" for ./status_components
2. Check file layout: discogs_seller_lookup_input.tsx coexists with discogs_seller_lookup_input/
3. The imported files are in the subdirectory, so parent import path is stale
4. Fix: prefix import paths with the subdirectory name
```

## Related

- `scripts/validate-frontmatter.py` — catches YAML safety issues in frontmatter
- The `ce-sandi-metz-reviewer` agent — originally triggered this refactoring
