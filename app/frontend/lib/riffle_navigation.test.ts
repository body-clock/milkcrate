import assert from "node:assert/strict";
import test from "node:test";

import {
  RIFFLE_DELTAS,
  RIFFLE_LANGUAGE,
  riffleActiveCardMotion,
  resolveRiffleDrag,
  resolveRiffleMove,
} from "./riffle_navigation";

// ── Drag thresholds matching riffle_navigation internals ────────────────
const COMMIT_DISTANCE = 72;
const MIN_COMMIT_DISTANCE = 24;
const VELOCITY_COMMIT = 320;
const TINY_FLICK_DISTANCE = 9;
const HIGH_VELOCITY = 600;
const MIN_HORIZONTAL_DISTANCE = 140;
const MAX_HORIZONTAL_VELOCITY = 800;
const IDLE_VELOCITY = 0;

// ── Crate configuration used across navigation tests ───────────────────
const CRATE_SIZE = 3;

test("downward drag past the distance threshold resolves deeper", () => {
  assert.equal(resolveRiffleDrag({ offsetY: COMMIT_DISTANCE, velocityY: IDLE_VELOCITY }), "deeper");
  assert.equal(RIFFLE_DELTAS.deeper, 1);
});

test("upward drag past the distance threshold resolves front", () => {
  assert.equal(resolveRiffleDrag({ offsetY: -COMMIT_DISTANCE, velocityY: IDLE_VELOCITY }), "front");
  assert.equal(RIFFLE_DELTAS.front, -1);
});

test("velocity assists committed drags after a minimum distance", () => {
  assert.equal(
    resolveRiffleDrag({ offsetY: MIN_COMMIT_DISTANCE, velocityY: VELOCITY_COMMIT }),
    "deeper",
  );
  assert.equal(
    resolveRiffleDrag({ offsetY: -MIN_COMMIT_DISTANCE, velocityY: -VELOCITY_COMMIT }),
    "front",
  );
});

test("tiny flicks do not commit even with high velocity", () => {
  assert.equal(resolveRiffleDrag({ offsetY: TINY_FLICK_DISTANCE, velocityY: HIGH_VELOCITY }), null);
  assert.equal(
    resolveRiffleDrag({ offsetY: -TINY_FLICK_DISTANCE, velocityY: -HIGH_VELOCITY }),
    null,
  );
});

test("mostly horizontal movement does not commit navigation", () => {
  assert.equal(
    resolveRiffleDrag({
      offsetX: MIN_HORIZONTAL_DISTANCE,
      offsetY: MIN_COMMIT_DISTANCE,
      velocityY: MAX_HORIZONTAL_VELOCITY,
    }),
    null,
  );
  assert.equal(
    resolveRiffleDrag({
      offsetX: -MIN_HORIZONTAL_DISTANCE,
      offsetY: -MIN_COMMIT_DISTANCE,
      velocityY: -MAX_HORIZONTAL_VELOCITY,
    }),
    null,
  );
});

test("front at index zero stays put and reports a blocked edge", () => {
  assert.deepEqual(resolveRiffleMove({ currentIndex: 0, total: CRATE_SIZE, direction: "front" }), {
    direction: "front",
    delta: -1,
    nextIndex: 0,
    moved: false,
    edge: "front",
  });
});

test("deeper at the last index stays put and reports a blocked edge", () => {
  assert.deepEqual(resolveRiffleMove({ currentIndex: 2, total: CRATE_SIZE, direction: "deeper" }), {
    direction: "deeper",
    delta: 1,
    nextIndex: 2,
    moved: false,
    edge: "deeper",
  });
});

test("successful navigation advances exactly one record", () => {
  assert.deepEqual(resolveRiffleMove({ currentIndex: 0, total: CRATE_SIZE, direction: "deeper" }), {
    direction: "deeper",
    delta: 1,
    nextIndex: 1,
    moved: true,
    edge: null,
  });
  assert.deepEqual(resolveRiffleMove({ currentIndex: 1, total: CRATE_SIZE, direction: "front" }), {
    direction: "front",
    delta: -1,
    nextIndex: 0,
    moved: true,
    edge: null,
  });
});

test("shared language uses front and deeper vocabulary", () => {
  const CURRENT_POSITION = 2;

  assert.equal(RIFFLE_LANGUAGE.guidance, "Pull down to dig deeper. Push up to the front.");
  assert.equal(RIFFLE_LANGUAGE.count(CURRENT_POSITION, CRATE_SIZE), "2 of 3");
  assert.equal(
    RIFFLE_LANGUAGE.progress(CURRENT_POSITION, CRATE_SIZE),
    "Record 2 of 3, front to deeper",
  );
  assert.match(RIFFLE_LANGUAGE.controls.deeper, /deeper/);
  assert.match(RIFFLE_LANGUAGE.controls.front, /front/);
  assert.match(RIFFLE_LANGUAGE.edgeStatus.deeper, /deepest/);
  assert.match(RIFFLE_LANGUAGE.edgeStatus.front, /front/);
});

test("active card motion follows the swipe direction", () => {
  assert.deepEqual(riffleActiveCardMotion("deeper", false).initial, {
    opacity: 0,
    y: -78,
    rotate: -3,
  });
  assert.deepEqual(riffleActiveCardMotion("deeper", false).exit, { opacity: 0, y: 66, rotate: 4 });
  assert.deepEqual(riffleActiveCardMotion("front", false).initial, {
    opacity: 0,
    y: 78,
    rotate: 3,
  });
  assert.deepEqual(riffleActiveCardMotion("front", false).exit, { opacity: 0, y: -66, rotate: -4 });
});

test("active card reduced-motion offsets preserve swipe direction", () => {
  assert.deepEqual(riffleActiveCardMotion("deeper", true).initial, {
    opacity: 0,
    y: -42,
    scale: 0.98,
  });
  assert.deepEqual(riffleActiveCardMotion("deeper", true).exit, { opacity: 0, y: 54, scale: 0.96 });
  assert.deepEqual(riffleActiveCardMotion("front", true).initial, {
    opacity: 0,
    y: 42,
    scale: 0.98,
  });
  assert.deepEqual(riffleActiveCardMotion("front", true).exit, { opacity: 0, y: -54, scale: 0.96 });
});
