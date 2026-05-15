export type RiffleDirection = "front" | "deeper"
export type RiffleEdge = RiffleDirection

export interface RiffleDragInput {
  offsetX?: number
  offsetY: number
  velocityY: number
}

export interface RiffleMoveInput {
  currentIndex: number
  total: number
  direction: RiffleDirection
}

export interface RiffleMoveResult {
  direction: RiffleDirection
  delta: number
  nextIndex: number
  moved: boolean
  edge: RiffleEdge | null
}

type RiffleCardMotionState =
  | { opacity: number; y: number; rotate: number }
  | { opacity: number; y: number; scale: number }

export interface RiffleCardMotion {
  initial: RiffleCardMotionState
  exit: RiffleCardMotionState
}

export const RIFFLE_DELTAS: Record<RiffleDirection, -1 | 1> = {
  front: -1,
  deeper: 1,
}

export const RIFFLE_THRESHOLDS = {
  committedDistance: 72,
  velocityMinimumDistance: 10,
  committedVelocity: 300,
} as const

export const RIFFLE_LANGUAGE = {
  guidance: "Pull down to dig deeper. Push up to the front.",
  controls: {
    front: "Move toward the front of the crate",
    deeper: "Dig one record deeper in the crate",
  },
  count: (current: number, total: number) => `${current} of ${total}`,
  progress: (current: number, total: number) => `Record ${current} of ${total}, front to deeper`,
  progressStart: "front",
  progressEnd: "deeper",
  edgeStatus: {
    front: "Already at the front of the crate.",
    deeper: "Already at the deepest record in this crate.",
  },
} as const

function directionFromVertical(value: number): RiffleDirection {
  return value > 0 ? "deeper" : "front"
}

export function resolveRiffleDrag({
  offsetX = 0,
  offsetY,
  velocityY,
}: RiffleDragInput): RiffleDirection | null {
  const absX = Math.abs(offsetX)
  const absY = Math.abs(offsetY)

  if (absX > absY) return null

  if (absY >= RIFFLE_THRESHOLDS.committedDistance) {
    return directionFromVertical(offsetY)
  }

  if (
    absY >= RIFFLE_THRESHOLDS.velocityMinimumDistance &&
    Math.abs(velocityY) >= RIFFLE_THRESHOLDS.committedVelocity
  ) {
    return directionFromVertical(velocityY)
  }

  return null
}

export function resolveRiffleMove({
  currentIndex,
  total,
  direction,
}: RiffleMoveInput): RiffleMoveResult {
  const delta = RIFFLE_DELTAS[direction]
  const nextIndex = currentIndex + delta

  if (total <= 0 || nextIndex < 0 || nextIndex >= total) {
    return {
      direction,
      delta,
      nextIndex: currentIndex,
      moved: false,
      edge: direction,
    }
  }

  return {
    direction,
    delta,
    nextIndex,
    moved: true,
    edge: null,
  }
}

export function riffleActiveCardMotion(
  direction: RiffleDirection,
  reducedMotion: boolean,
): RiffleCardMotion {
  if (reducedMotion) {
    return direction === "deeper"
      ? {
          initial: { opacity: 0, y: -42, scale: 0.98 },
          exit: { opacity: 0, y: 54, scale: 0.96 },
        }
      : {
          initial: { opacity: 0, y: 42, scale: 0.98 },
          exit: { opacity: 0, y: -54, scale: 0.96 },
        }
  }

  return direction === "deeper"
    ? {
        initial: { opacity: 0, y: -78, rotate: -3 },
        exit: { opacity: 0, y: 66, rotate: 4 },
      }
    : {
        initial: { opacity: 0, y: 78, rotate: 3 },
        exit: { opacity: 0, y: -66, rotate: -4 },
      }
}
