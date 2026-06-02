---
title: React default imports are dead code under automatic JSX runtime with noUnusedLocals
date: 2026-06-01
category: tooling-decisions
module: frontend
problem_type: tooling_decision
component: tooling
severity: low
applies_when:
  - "Creating a new React component file in a project using the automatic JSX runtime (jsx: react-jsx)"
  - "Editing an existing React component that has import React from 'react'"
  - "Enabling noUnusedLocals in tsconfig for a React project using automatic JSX"
symptoms:
  - "TypeScript error TS6133: 'React' is declared but its value is never read"
  - "Red squiggly underline on React in import React, { ... } from 'react'"
  - "CI typecheck fails on unused default React import"
tags:
  - react
  - jsx-transform
  - typescript
  - no-unused-locals
  - import-convention
  - ts6133
  - frontend-tooling
---

# React default imports are dead code under automatic JSX runtime with noUnusedLocals

## Context

On 2026-05-18, commit `3a423ed` added `noUnusedLocals: true` to the project's
`tsconfig.json`. The project already used the automatic JSX runtime
(`"jsx": "react-jsx"`), which the Inertia + React 19 + Vite setup established
from the start. With both settings active, any `import React from "react"`
statement is dead code — the JSX transpiler auto-imports `jsx()` and `jsxs()`
from `react/jsx-runtime`, and TypeScript's noUnusedLocals flags the unused
default import as TS6133.

The problem surfaced during PR review of a new `pile_toast.tsx` component
(PR #221, branch `issue-217-storefront-mobile-hierarchy`). The CI typecheck
caught `import React, { useEffect } from "react"` as dead code (session
history [pi]).

**Scope:** Prior storefront implementation sessions (April–May 2026) created
~400 files using the `import React from "react"` pattern. These predate the
`noUnusedLocals` addition and were never flagged — every `import React` in the
codebase from before May 18 is now dead code, invisible until someone touches
those files or runs a full `tsc --noEmit` across the frontend.

## Guidance

Use named imports for React hooks, utilities, and types rather than the
default `React` import, unless the module body explicitly references
`React` as a value (e.g., `React.Children`, `React.cloneElement`,
`React.createContext`, `React.lazy`, `React.memo`, `React.startTransition`).

**Instead of:**
```tsx
import React, { useState, useEffect } from "react";
```

**Use:**
```tsx
import { useState, useEffect } from "react";
```

If a component uses JSX but no `React.*` APIs, drop the default import
entirely:
```tsx
// No import needed from "react" at all — JSX is auto-imported
export function Hello({ name }: { name: string }) {
  return <p>Hello, {name}</p>;
}
```

## Why This Matters

- **Cleaner builds** — `noUnusedLocals: true` catches dead imports at compile
  time, preventing silent cruft accumulation.
- **Smaller bundles** — Tree-shaking is more effective when the compiler can
  precisely track which named exports are used.
- **Developer clarity** — Named imports signal exactly what's consumed,
  reducing cognitive overhead when reading the import block.
- **Future-proofing** — The automatic JSX runtime is the default in React 17+
  and in Vite, Next.js, and Remix. Explicit `React` imports will become
  increasingly anachronistic.
- **CI compliance** — With `noUnusedLocals`, an unused `React` import produces
  a hard typecheck error (TS6133) that blocks CI.

## When to Apply

This applies to every component or module that:

- Uses TSX/JSX in a project with `jsx: "react-jsx"` or `"react-jsxdev"`
  in tsconfig (automatic JSX runtime)
- Imports `React` as a default without using any `React.*` property in
  the module body

The fix is safe whenever the module only uses JSX + hooks + utilities.
Keep the default import when any of these are used:

- `React.Children`
- `React.cloneElement`
- `React.createContext`
- `React.Fragment` (though `<>...</>` or named `Fragment` import works)
- `React.lazy`
- `React.memo`
- `React.startTransition`
- `React.Suspense`

**Caveat:** Some libraries or older toolchains may still require the
default import (e.g., certain Jest configurations, older ESLint
`react/jsx-uses-react` rules). Verify with a typecheck before removing.
If using `eslint-plugin-react` with the automatic runtime, set
`react/jsx-uses-react: "off"` and `react/react-in-jsx-scope: "off"`.

## Examples

### Before (TS6133 — unused default import)
```tsx
import React, { useEffect } from "react";

export function Toast({ message }: { message: string }) {
  useEffect(() => {
    const timer = setTimeout(() => console.log("dismissed"), 3000);
    return () => clearTimeout(timer);
  }, []);
  return <div className="toast">{message}</div>;
}
```

### After (passes typecheck)
```tsx
import { useEffect } from "react";

export function Toast({ message }: { message: string }) {
  useEffect(() => {
    const timer = setTimeout(() => console.log("dismissed"), 3000);
    return () => clearTimeout(timer);
  }, []);
  return <div className="toast">{message}</div>;
}
```

### When the default import is needed
```tsx
import React from "react";

// React.memo and React.Fragment used directly
export const Heading = React.memo(function Heading({ text }: { text: string }) {
  return <React.Fragment>{text}</React.Fragment>;
});
```

## Related

- Commit `3a423ed` — added `noUnusedLocals: true` to tsconfig
- docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md
  — references noUnusedLocals behavior and what it does/doesn't catch
- docs/solutions/test-failures/vitest-imports-under-node-test-runner-2026-05-28.md
  — pattern analog: import conventions depend on runtime configuration
- docs/plans/2026-05-27-001-refactor-frontend-sandi-metz-js-plan.md —
  documents active TypeScript strict mode with noUnusedLocals enforcement
- PR #221 — first instance caught by CI typecheck post-noUnusedLocals
