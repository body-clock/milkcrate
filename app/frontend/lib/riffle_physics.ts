import { RIFFLE_THRESHOLDS, type RiffleDirection } from "./riffle_navigation"

export const RIFFLE_PHYSICS_LIMITS = {
  maxPitch: 5,
  maxWobble: 2.5,
  maxCompression: 0.975,
  maxPressure: 0.24,
  maxAdjacentReveal: 14,
  maxAdjacentLift: 8,
  maxHintOpacityBoost: 0.16,
  wobbleDistance: 120,
} as const

export interface RiffleActivePhysicsInput {
  offsetX: number
  offsetY: number
  reducedMotion: boolean
}

export interface RiffleActivePhysics {
  direction: RiffleDirection | null
  progress: number
  pitch: number
  wobble: number
  scale: number
  pressure: number
}

export interface RiffleHintPhysicsInput {
  slotOffset: number
  active: RiffleActivePhysics
}

export interface RiffleHintPhysics {
  reveal: number
  lift: number
  opacityBoost: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function round(value: number) {
  return Math.round(value * 1000) / 1000
}

function neutralActivePhysics(): RiffleActivePhysics {
  return {
    direction: null,
    progress: 0,
    pitch: 0,
    wobble: 0,
    scale: 1,
    pressure: 0,
  }
}

export function riffleActivePhysics({
  offsetX,
  offsetY,
  reducedMotion,
}: RiffleActivePhysicsInput): RiffleActivePhysics {
  if (reducedMotion || offsetY === 0) return neutralActivePhysics()

  const direction: RiffleDirection = offsetY > 0 ? "deeper" : "front"
  const progress = round(clamp(Math.abs(offsetY) / RIFFLE_THRESHOLDS.committedDistance, 0, 1))
  const directionSign = direction === "deeper" ? 1 : -1
  const compressionRange = 1 - RIFFLE_PHYSICS_LIMITS.maxCompression

  return {
    direction,
    progress,
    pitch: round(directionSign * RIFFLE_PHYSICS_LIMITS.maxPitch * progress),
    wobble: round(clamp(offsetX / RIFFLE_PHYSICS_LIMITS.wobbleDistance, -1, 1) * RIFFLE_PHYSICS_LIMITS.maxWobble),
    scale: round(1 - compressionRange * progress),
    pressure: round(RIFFLE_PHYSICS_LIMITS.maxPressure * progress),
  }
}

export function riffleHintPhysics({ slotOffset, active }: RiffleHintPhysicsInput): RiffleHintPhysics {
  if (!active.direction || active.progress === 0) {
    return { reveal: 0, lift: 0, opacityBoost: 0 }
  }

  const targetOffset = active.direction === "deeper" ? 1 : -1
  if (slotOffset !== targetOffset) {
    return { reveal: 0, lift: 0, opacityBoost: 0 }
  }

  return {
    reveal: round(targetOffset * RIFFLE_PHYSICS_LIMITS.maxAdjacentReveal * active.progress),
    lift: round(-RIFFLE_PHYSICS_LIMITS.maxAdjacentLift * active.progress),
    opacityBoost: round(RIFFLE_PHYSICS_LIMITS.maxHintOpacityBoost * active.progress),
  }
}
