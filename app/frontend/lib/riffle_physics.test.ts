import test from "node:test"
import assert from "node:assert/strict"
import {
  RIFFLE_PHYSICS_LIMITS,
  riffleActivePhysics,
  riffleHintPhysics,
} from "./riffle_physics"

test("idle drag returns neutral active physics", () => {
  assert.deepEqual(riffleActivePhysics({ offsetX: 0, offsetY: 0, reducedMotion: false }), {
    direction: null,
    progress: 0,
    pitch: 0,
    wobble: 0,
    scale: 1,
    pressure: 0,
  })
})

test("downward drag resolves deeper visual pressure and clamps at full progress", () => {
  const physics = riffleActivePhysics({ offsetX: 4, offsetY: 144, reducedMotion: false })

  assert.equal(physics.direction, "deeper")
  assert.equal(physics.progress, 1)
  assert.equal(physics.pitch, RIFFLE_PHYSICS_LIMITS.maxPitch)
  assert.equal(physics.scale, RIFFLE_PHYSICS_LIMITS.maxCompression)
  assert.equal(physics.pressure, RIFFLE_PHYSICS_LIMITS.maxPressure)
})

test("upward drag resolves front visual pressure and clamps at full progress", () => {
  const physics = riffleActivePhysics({ offsetX: -4, offsetY: -144, reducedMotion: false })

  assert.equal(physics.direction, "front")
  assert.equal(physics.progress, 1)
  assert.equal(physics.pitch, -RIFFLE_PHYSICS_LIMITS.maxPitch)
  assert.equal(physics.scale, RIFFLE_PHYSICS_LIMITS.maxCompression)
  assert.equal(physics.pressure, RIFFLE_PHYSICS_LIMITS.maxPressure)
})

test("horizontal wobble stays bounded and does not override vertical direction", () => {
  const physics = riffleActivePhysics({ offsetX: 800, offsetY: -36, reducedMotion: false })

  assert.equal(physics.direction, "front")
  assert.equal(physics.wobble, RIFFLE_PHYSICS_LIMITS.maxWobble)
})

test("reduced motion collapses active physics to neutral values", () => {
  assert.deepEqual(riffleActivePhysics({ offsetX: 800, offsetY: 144, reducedMotion: true }), {
    direction: null,
    progress: 0,
    pitch: 0,
    wobble: 0,
    scale: 1,
    pressure: 0,
  })
})

test("hint physics only reveals the adjacent deeper slot for deeper drags", () => {
  const active = riffleActivePhysics({ offsetX: 0, offsetY: 72, reducedMotion: false })

  assert.deepEqual(riffleHintPhysics({ slotOffset: 1, active }), {
    reveal: RIFFLE_PHYSICS_LIMITS.maxAdjacentReveal,
    lift: -RIFFLE_PHYSICS_LIMITS.maxAdjacentLift,
    opacityBoost: RIFFLE_PHYSICS_LIMITS.maxHintOpacityBoost,
  })
  assert.deepEqual(riffleHintPhysics({ slotOffset: 2, active }), {
    reveal: 0,
    lift: 0,
    opacityBoost: 0,
  })
  assert.deepEqual(riffleHintPhysics({ slotOffset: -1, active }), {
    reveal: 0,
    lift: 0,
    opacityBoost: 0,
  })
})

test("hint physics only reveals the adjacent front slot for front drags", () => {
  const active = riffleActivePhysics({ offsetX: 0, offsetY: -36, reducedMotion: false })
  const expectedReveal = RIFFLE_PHYSICS_LIMITS.maxAdjacentReveal * 0.5
  const expectedLift = RIFFLE_PHYSICS_LIMITS.maxAdjacentLift * -0.5
  const expectedOpacity = RIFFLE_PHYSICS_LIMITS.maxHintOpacityBoost * 0.5

  assert.deepEqual(riffleHintPhysics({ slotOffset: -1, active }), {
    reveal: -expectedReveal,
    lift: expectedLift,
    opacityBoost: expectedOpacity,
  })
  assert.deepEqual(riffleHintPhysics({ slotOffset: 1, active }), {
    reveal: 0,
    lift: 0,
    opacityBoost: 0,
  })
})

test("reduced motion keeps hint physics neutral", () => {
  const active = riffleActivePhysics({ offsetX: 0, offsetY: 72, reducedMotion: true })

  assert.deepEqual(riffleHintPhysics({ slotOffset: 1, active }), {
    reveal: 0,
    lift: 0,
    opacityBoost: 0,
  })
})
