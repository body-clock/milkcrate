import test from "node:test"
import assert from "node:assert/strict"
import { buildCrateWindow } from "./crate_window"

type RecordStub = { id: number; title: string }

const records: RecordStub[] = [
  { id: 1, title: "one" },
  { id: 2, title: "two" },
  { id: 3, title: "three" },
  { id: 4, title: "four" },
  { id: 5, title: "five" },
]

test("buildCrateWindow centers the active record and includes nearby records", () => {
  const window = buildCrateWindow(records, 2, 2)

  assert.deepEqual(
    window.map((slot) => [slot.record.id, slot.offset, slot.isActive]),
    [
      [1, -2, false],
      [2, -1, false],
      [3, 0, true],
      [4, 1, false],
      [5, 2, false],
    ],
  )
})

test("buildCrateWindow clamps at the start of the crate", () => {
  const window = buildCrateWindow(records, 0, 2)

  assert.deepEqual(
    window.map((slot) => [slot.record.id, slot.offset, slot.isActive]),
    [
      [1, 0, true],
      [2, 1, false],
      [3, 2, false],
    ],
  )
})

test("buildCrateWindow clamps at the end of the crate", () => {
  const window = buildCrateWindow(records, 4, 2)

  assert.deepEqual(
    window.map((slot) => [slot.record.id, slot.offset, slot.isActive]),
    [
      [3, -2, false],
      [4, -1, false],
      [5, 0, true],
    ],
  )
})

test("buildCrateWindow handles an empty crate", () => {
  assert.deepEqual(buildCrateWindow([], 0, 2), [])
})
