import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"
import test from "node:test"
import { LIFT_HOVER, SCALE_HOVER, SCALE_PRESS, TILT_HOVER, springTactile } from "./motion_tokens"

const cssPath = join(process.cwd(), "app/assets/tailwind/application.css")
const css = readFileSync(cssPath, "utf8")

function block(source: string, selector: string): string {
  const start = source.indexOf(`${selector} {`)
  assert.notEqual(start, -1, `expected CSS block ${selector}`)

  const end = source.indexOf("}", start)
  assert.notEqual(end, -1, `expected closing brace for ${selector}`)

  return source.slice(start, end)
}

test("theme-safe feedback and focus roles are mapped for dark and light themes", () => {
  assert.match(css, /@theme inline\s*{/)

  const theme = block(css, "@theme inline")
  const dark = block(css, ":root")
  const light = block(css, '[data-theme="light"]')
  const roles = [
    "focus",
    "feedback-neutral",
    "feedback-neutral-bg",
    "feedback-neutral-border",
    "feedback-success",
    "feedback-success-bg",
    "feedback-success-border",
    "feedback-warning",
    "feedback-warning-bg",
    "feedback-warning-border",
    "feedback-danger",
    "feedback-danger-bg",
    "feedback-danger-border",
    "feedback-progress",
    "feedback-progress-bg",
    "feedback-progress-border",
  ]

  for (const role of roles) {
    assert.match(theme, new RegExp(`--color-mc-${role}:\\s*var\\(--mc-${role}\\);`))
    assert.match(dark, new RegExp(`--mc-${role}:\\s*[^;]+;`))
    assert.match(light, new RegExp(`--mc-${role}:\\s*[^;]+;`))
  }
})

test("CSS interaction mirrors agree with the TypeScript motion authority", () => {
  const dark = block(css, ":root")
  const expected = [
    ["--mc-spring-stiffness", springTactile.stiffness],
    ["--mc-spring-damping", springTactile.damping],
    ["--mc-scale-press", SCALE_PRESS],
    ["--mc-scale-hover", SCALE_HOVER],
    ["--mc-tilt-hover", `${TILT_HOVER}deg`],
    ["--mc-lift-hover", `${LIFT_HOVER}px`],
  ] as const

  for (const [property, value] of expected) {
    assert.match(dark, new RegExp(`${property}:\\s*${String(value).replace(".", "\\.")};`))
  }
})

test("motion lint rejects a CSS mirror that disagrees with the TypeScript authority", () => {
  const directory = mkdtempSync(join(tmpdir(), "milkcrate-motion-"))
  const alteredCssPath = join(directory, "application.css")

  try {
    const alteredCss = css.replace(/--mc-scale-hover:\s*[^;]+;/, "--mc-scale-hover: 9;")
    assert.notEqual(alteredCss, css)
    writeFileSync(alteredCssPath, alteredCss)

    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/lint-motion-tokens.ts", "app/frontend", "--css", alteredCssPath],
      { cwd: process.cwd(), encoding: "utf8" },
    )

    assert.equal(result.status, 1)
    assert.match(result.stderr, /--mc-scale-hover/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
