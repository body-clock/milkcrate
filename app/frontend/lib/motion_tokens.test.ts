import test from "node:test"
import assert from "node:assert/strict"
import {
  springTactile,
  springPress,
  springFlip,
  springDrawer,
  SCALE_PRESS,
  SCALE_HOVER,
  SCALE_INNER_HOVER,
  LIFT_HOVER,
  TILT_HOVER,
  transitionCrate,
  reducedMotionTransition,
} from "./motion_tokens"

test("springTactile is a spring config with the documented values", () => {
  assert.deepEqual(springTactile, { type: "spring", stiffness: 300, damping: 26 })
})

test("springPress is a snappier spring config", () => {
  assert.deepEqual(springPress, { type: "spring", stiffness: 400, damping: 28 })
})

test("springFlip is a heavier spring for card-turn animations", () => {
  assert.deepEqual(springFlip, { type: "spring", stiffness: 260, damping: 24 })
})

test("springDrawer is a damped spring for panel slides", () => {
  assert.deepEqual(springDrawer, { type: "spring", stiffness: 300, damping: 32 })
})

test("SCALE_PRESS matches the documented press-down scale", () => {
  assert.equal(SCALE_PRESS, 0.985)
})

test("SCALE_HOVER matches the documented hover scale", () => {
  assert.equal(SCALE_HOVER, 1.025)
})

test("interaction magnitudes are the documented CSS mirror authority", () => {
  assert.deepEqual(
    {
      press: SCALE_PRESS,
      hover: SCALE_HOVER,
      innerHover: SCALE_INNER_HOVER,
      lift: LIFT_HOVER,
      tilt: TILT_HOVER,
    },
    { press: 0.985, hover: 1.025, innerHover: 1.015, lift: 2, tilt: 1.5 },
  )
})

test("transitionCrate is a spring-based crate-navigation preset", () => {
  assert.equal(typeof transitionCrate, "object")
  assert.equal(transitionCrate.type, "spring")
  assert.ok(transitionCrate.stiffness > 0)
  assert.ok(transitionCrate.damping > 0)
})

test("reducedMotionTransition is an instant transition", () => {
  assert.deepEqual(reducedMotionTransition, { duration: 0 })
})
