import assert from "node:assert/strict";
import test from "node:test";

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
} from "./motion_tokens";

// ── Motion token contract values ────────────────────────────────────────
const SPRING_STIFFNESS_TACTILE = 300;
const SPRING_DAMPING_TACTILE = 26;
const SPRING_STIFFNESS_PRESS = 400;
const SPRING_DAMPING_PRESS = 28;
const SPRING_STIFFNESS_FLIP = 260;
const SPRING_DAMPING_FLIP = 24;
const SPRING_DAMPING_DRAWER = 32;

const EXPECTED_SCALE_PRESS_VALUE = 0.985;
const EXPECTED_SCALE_HOVER_VALUE = 1.025;
const EXPECTED_SCALE_INNER_HOVER_VALUE = 1.015;
const EXPECTED_LIFT_HOVER_VALUE = 2;
const EXPECTED_TILT_HOVER_VALUE = 1.5;

test("springTactile is a spring config with the documented values", () => {
  assert.deepEqual(springTactile, {
    type: "spring",
    stiffness: SPRING_STIFFNESS_TACTILE,
    damping: SPRING_DAMPING_TACTILE,
  });
});

test("springPress is a snappier spring config", () => {
  assert.deepEqual(springPress, {
    type: "spring",
    stiffness: SPRING_STIFFNESS_PRESS,
    damping: SPRING_DAMPING_PRESS,
  });
});

test("springFlip is a heavier spring for card-turn animations", () => {
  assert.deepEqual(springFlip, {
    type: "spring",
    stiffness: SPRING_STIFFNESS_FLIP,
    damping: SPRING_DAMPING_FLIP,
  });
});

test("springDrawer is a damped spring for panel slides", () => {
  assert.deepEqual(springDrawer, {
    type: "spring",
    stiffness: SPRING_STIFFNESS_TACTILE,
    damping: SPRING_DAMPING_DRAWER,
  });
});

test("SCALE_PRESS matches the documented press-down scale", () => {
  assert.equal(SCALE_PRESS, EXPECTED_SCALE_PRESS_VALUE);
});

test("SCALE_HOVER matches the documented hover scale", () => {
  assert.equal(SCALE_HOVER, EXPECTED_SCALE_HOVER_VALUE);
});

test("interaction magnitudes are the documented CSS mirror authority", () => {
  assert.deepEqual(
    {
      press: SCALE_PRESS,
      hover: SCALE_HOVER,
      innerHover: SCALE_INNER_HOVER,
      lift: LIFT_HOVER,
      tilt: TILT_HOVER,
    },
    {
      press: EXPECTED_SCALE_PRESS_VALUE,
      hover: EXPECTED_SCALE_HOVER_VALUE,
      innerHover: EXPECTED_SCALE_INNER_HOVER_VALUE,
      lift: EXPECTED_LIFT_HOVER_VALUE,
      tilt: EXPECTED_TILT_HOVER_VALUE,
    },
  );
});

test("transitionCrate is a spring-based crate-navigation preset", () => {
  assert.equal(typeof transitionCrate, "object");
  assert.equal(transitionCrate.type, "spring");
  assert.ok(transitionCrate.stiffness > 0);
  assert.ok(transitionCrate.damping > 0);
});

test("reducedMotionTransition is an instant transition", () => {
  assert.deepEqual(reducedMotionTransition, { duration: 0 });
});
