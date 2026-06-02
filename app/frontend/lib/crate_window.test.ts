import test from "node:test"
import assert from "node:assert/strict"
import { buildCrateWindow } from "./crate_window"

type RecordStub = { id: number; title: string }

const RADIUS = 2
const ACTIVE_CENTER = 2
const ACTIVE_START = 0
const ACTIVE_END = 4

const R1: RecordStub = { id: 1, title: "one" }
const R2: RecordStub = { id: 2, title: "two" }
const R3: RecordStub = { id: 3, title: "three" }
const R4: RecordStub = { id: 4, title: "four" }
const R5: RecordStub = { id: 5, title: "five" }

const records: RecordStub[] = [R1, R2, R3, R4, R5]

function slot(record: RecordStub, offset: number, isActive: boolean): [number, number, boolean] {
  return [record.id, offset, isActive]
}

test("buildCrateWindow centers the active record and includes nearby records", () => {
  const window = buildCrateWindow(records, ACTIVE_CENTER, RADIUS)

  assert.deepEqual(
    window.map((s) => [s.record.id, s.offset, s.isActive]),
    [
      slot(R1, -RADIUS, false),
      slot(R2, -1, false),
      slot(R3, 0, true),
      slot(R4, 1, false),
      slot(R5, RADIUS, false),
    ],
  )
})

test("buildCrateWindow clamps at the start of the crate", () => {
  const window = buildCrateWindow(records, ACTIVE_START, RADIUS)

  assert.deepEqual(
    window.map((s) => [s.record.id, s.offset, s.isActive]),
    [slot(R1, 0, true), slot(R2, 1, false), slot(R3, RADIUS, false)],
  )
})

test("buildCrateWindow clamps at the end of the crate", () => {
  const window = buildCrateWindow(records, ACTIVE_END, RADIUS)

  assert.deepEqual(
    window.map((s) => [s.record.id, s.offset, s.isActive]),
    [slot(R3, -RADIUS, false), slot(R4, -1, false), slot(R5, 0, true)],
  )
})

test("buildCrateWindow handles an empty crate", () => {
  assert.deepEqual(buildCrateWindow([], ACTIVE_START, RADIUS), [])
})
