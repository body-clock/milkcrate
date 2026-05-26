#!/usr/bin/env node

/**
 * Rejects deprecated presentation recipes and raw semantic styling in active
 * React sources. Residual Rails templates are documented separately and are
 * intentionally outside this active-surface guard.
 *
 * Run: npx tsx scripts/lint-design-system-tokens.ts app/frontend
 */

import { globSync, readFileSync } from "node:fs"
import { relative } from "node:path"

const root = process.argv[2] ?? "app/frontend"
const files = globSync(`${root}/**/*.{ts,tsx}`, {
  exclude: ["**/node_modules/**", "**/*.test.*"],
})

const deprecatedClassPattern =
  /(?:^|[\s"'`])mc-(?:btn(?:-primary)?|input|notice|text|dim|border)(?=$|[\s"'`])/g
const rawStatusPalettePattern =
  /\b(?:text|bg|border)-(?:red|amber|emerald|green|yellow|orange|rose|sky)-\d{2,3}(?:\/\d+)?\b/g
const obsoleteFocusPattern = /\bfocus(?:-visible)?:ring-mc-accent\b/g

const violations: string[] = []

for (const file of files) {
  const source = readFileSync(file, "utf8")
  const lines = source.split("\n")
  const rel = relative(process.cwd(), file)

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const lineNumber = index + 1

    for (const match of line.matchAll(deprecatedClassPattern)) {
      const token = match[0].trim()
      violations.push(`${rel}:${lineNumber}  deprecated class ${token}; use semantic utilities or canonical primitives`)
    }

    for (const match of line.matchAll(rawStatusPalettePattern)) {
      violations.push(`${rel}:${lineNumber}  raw status palette ${match[0]}; use an mc-feedback semantic role`)
    }

    for (const match of line.matchAll(obsoleteFocusPattern)) {
      violations.push(`${rel}:${lineNumber}  obsolete focus utility ${match[0]}; use focus-visible:ring-mc-focus`)
    }
  }
}

if (violations.length > 0) {
  console.error(`${violations.length} design-system token violation(s):\n`)
  for (const violation of violations) console.error(`  ${violation}`)
  console.error("\nUse docs/design-system contracts for active React presentation.")
  process.exit(1)
}

console.log(`✓ No design-system token violations in ${files.length} files.`)
