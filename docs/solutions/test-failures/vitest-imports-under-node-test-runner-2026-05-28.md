---
title: "Lib test files must use `node:test` imports, not vitest"
date: 2026-05-28
category: test-failures
module: frontend
problem_type: test_failure
component: testing_framework
symptoms:
  - "CI test:frontend job fails with `TypeError: Cannot read properties of undefined (reading 'config')` from vitest/runner"
  - "New test file in app/frontend/lib/ imports from vitest but runs under Node native test runner"
root_cause: incomplete_setup
resolution_type: code_fix
severity: low
tags: [vitest, node-test, test-runner, ci, csrf-token]
---

# Lib test files must use `node:test` imports, not vitest

## Problem

A test file added to `app/frontend/lib/` imported `describe`, `expect`, `it` from `vitest`, but files in this directory run under Node's native test runner. CI failed with a vitest runtime error because vitest's runner globals aren't available in the `node --test` context.

## Symptoms

- CI `test:frontend` step fails with:
  ```
  TypeError: Cannot read properties of undefined (reading 'config')
      at initSuite (vitest/runner/dist/chunk-artifact.js:1848)
  ```
- Only new `.test.ts` files in `app/frontend/lib/` are affected — all existing ones use `node:test` and pass.

## What Didn't Work

- **Keeping vitest imports** — The error comes from vitest's own runner code trying to access `runner.config` during suite initialization. This isn't a fixable configuration issue; vitest simply isn't the runtime.
- **Moving the file to vitest's include path** — The project deliberately excludes `app/frontend/lib/*.test.ts` from vitest via `vitest.config.ts: exclude: ["app/frontend/lib/*.test.ts"]`. These are pure-library tests that don't need jsdom or React Testing Library.

## Solution

Switch the imports from `vitest` to Node's built-in test and assert modules:

```diff
- import { describe, expect, it } from "vitest";
+ import { describe, it } from "node:test";
+ import assert from "node:assert";
  import { csrfToken } from "./csrf_token";

  describe("csrfToken", () => {
    it("returns an empty string when document is not available", () => {
      ...
-     expect(csrfToken()).toBe("");
+     assert.strictEqual(csrfToken(), "");
    });
  });
```

Test assertions use Node's `assert` module instead of vitest's `expect`. The most commonly needed methods:

| vitest / Jest | Node assert equivalent |
|--------------|----------------------|
| `expect(x).toBe(y)` | `assert.strictEqual(x, y)` |
| `expect(x).toEqual(y)` | `assert.deepStrictEqual(x, y)` |
| `expect(fn).toThrow()` | `assert.throws(fn)` |
| `expect(x).toBeDefined()` | `assert.ok(x !== undefined)` or `assert.notStrictEqual(x, undefined)` |
| `expect(x).toBeNull()` | `assert.strictEqual(x, null)` |

## Why This Works

The project uses a dual-runner test architecture:

- **`npm run test:frontend`** — `node --experimental-webstorage --test --import tsx app/frontend/lib/*.test.ts` runs pure-library tests under Node's native test runner. These tests don't need DOM simulation.
- **`npm run test:components`** — `vitest run` runs component, hook, and page tests with jsdom and React Testing Library.

Files in `app/frontend/lib/` are explicitly excluded from vitest's include pattern:
```ts
// vitest.config.ts
include: ["app/frontend/**/*.test.{ts,tsx}"],
exclude: ["app/frontend/lib/*.test.ts"],
```

Any new lib test file that uses vitest imports will fail in CI because `node --test` doesn't provide vitest's runner context. The fix is to use `node:test` and `node:assert` — the same imports every other lib test file already uses.

## Prevention

- When adding a new `.test.ts` file to `app/frontend/lib/`, use `node:test` and `node:assert` imports, not vitest. Check any existing lib test file for the correct pattern.
- The dual-runner architecture (`test:frontend` for lib, `test:components` for vitest) is intentional. Do not move lib tests into vitest without explicit architectural agreement — the lib tests don't need jsdom and run faster under `node --test`.
- CI runs both test commands. A failure in `test:frontend` with a vitest stack trace means a lib test file is importing from vitest.

## Related Issues

- Commit `a943b6e` — fix applied
- Commit `3a6168e` — original file created with vitest imports (first Sandi Metz wave)
- Existing lib test files: `crate_window.test.ts`, `design_system_foundations.test.ts`, `first_swipe_lesson.test.ts`, `format_price.test.ts`, `motion_tokens.test.ts`, `riffle_navigation.test.ts` — all use `node:test`/`node:assert`
- Deferred plan `2026-05-18-002-refactor-frontend-health-check-fixes-plan.md` listed migrating lib tests *to* vitest as a P2/P3 — this direction was not taken
