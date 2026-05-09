import test from "node:test"
import assert from "node:assert/strict"
import {
  springTactile,
  springPress,
  springFlip,
  springDrawer,
  SCALE_PRESS,
  SCALE_HOVER,
  LIFT_HOVER,
  TILT_HOVER,
  DURATION_HOVER,
  DURATION_PRESS,
  transitionHover,
  transitionDrawer,
  transitionFlip,
  reducedMotionTransition,
  REDUCED_MOTION_SCALE,
  REDUCED_MOTION_LIFT,
  REDUCED_MOTION_TILT,
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
  assert.equal(SCALE_PRESS, 0.97)
})

test("SCALE_HOVER matches the documented hover scale", () => {
  assert.equal(SCALE_HOVER, 1.05)
})

test("lift and tilt magnitudes are positive numbers", () => {
  assert.equal(LIFT_HOVER, 3)
  assert.equal(TILT_HOVER, 1.5)
})

test("duration tokens are positive numbers", () => {
  assert.ok(DURATION_HOVER > 0)
  assert.ok(DURATION_PRESS > 0)
})

test("transition presets alias their corresponding springs", () => {
  assert.equal(transitionHover, springTactile)
  assert.equal(transitionDrawer, springDrawer)
  assert.equal(transitionFlip, springFlip)
})

test("reducedMotionTransition is an instant transition", () => {
  assert.deepEqual(reducedMotionTransition, { duration: 0 })
})

test("reduced-motion constants collapse to identity", () => {
  assert.equal(REDUCED_MOTION_SCALE, 1)
  assert.equal(REDUCED_MOTION_LIFT, 0)
  assert.equal(REDUCED_MOTION_TILT, 0)
})
