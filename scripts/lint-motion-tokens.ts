#!/usr/bin/env node

/**
 * Scans .tsx/.ts files for inline animation values that should be
 * sourced from @/lib/motion_tokens instead.
 *
 * Run: node scripts/lint-motion-tokens.ts app/frontend/
 *
 * Flags:
 *   stiffness: <number> in an object literal (unless inside motion_tokens.ts itself)
 *   damping: <number> in an object literal (same exception)
 *   whileHover / whileTap with raw scale numbers
 *   transition with inline spring configs
 *
 * Exits 0 when clean, 1 when violations found.
 */

import { readFileSync } from "node:fs"
import { relative } from "node:path"
import { globSync } from "node:fs"

const root = process.argv[2] || "app/frontend"
const files = globSync(`${root}/**/*.{ts,tsx}`, {
  ignore: ["**/node_modules/**", "**/*.test.*"],
})

const VIOLATIONS: string[] = []

for (const file of files) {
  // Skip the token file itself and its tests — they define/assert the values
  if (file.endsWith("motion_tokens.ts") || file.endsWith("motion_tokens.test.ts")) continue

  const src = readFileSync(file, "utf-8")
  const rel = relative(process.cwd(), file)
  const lines = src.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const ln = i + 1

    // Inline stiffness or damping outside motion_tokens
    if (/stiffness:\s*\d+/.test(line)) {
      VIOLATIONS.push(`${rel}:${ln}  inline stiffness — use a spring preset from @/lib/motion_tokens`)
    }
    if (/damping:\s*\d+/.test(line)) {
      VIOLATIONS.push(`${rel}:${ln}  inline damping — use a spring preset from @/lib/motion_tokens`)
    }

    // whileHover or whileTap with raw numeric scale
    if (/whileHover.*scale:\s*\d/.test(line)) {
      VIOLATIONS.push(`${rel}:${ln}  whileHover with raw scale — use SCALE_HOVER from @/lib/motion_tokens`)
    }
    if (/whileTap.*scale:\s*\d/.test(line)) {
      VIOLATIONS.push(`${rel}:${ln}  whileTap with raw scale — use SCALE_PRESS from @/lib/motion_tokens`)
    }

    // transition with inline spring config
    if (/transition.*type:\s*"spring".*(stiffness|damping)/.test(line)) {
      VIOLATIONS.push(`${rel}:${ln}  inline spring transition — use transitionHover/Drawer/Flip from @/lib/motion_tokens`)
    }
  }
}

if (VIOLATIONS.length > 0) {
  console.error(`${VIOLATIONS.length} motion token violation(s):\n`)
  for (const v of VIOLATIONS) console.error(`  ${v}`)
  console.error(`\nImport from @/lib/motion_tokens instead of writing inline values.`)
  process.exit(1)
}

console.log(`✓ No motion token violations in ${files.length} files.`)
