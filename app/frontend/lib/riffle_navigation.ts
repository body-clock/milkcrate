export type RiffleDirection = "front" | "deeper";
export type RiffleEdge = RiffleDirection;

export interface RiffleDragInput {
  offsetX?: number;
  offsetY: number;
  velocityY: number;
}

export interface RiffleMoveInput {
  currentIndex: number;
  total: number;
  direction: RiffleDirection;
}

export interface RiffleMoveResult {
  direction: RiffleDirection;
  delta: number;
  nextIndex: number;
  moved: boolean;
  edge: RiffleEdge | null;
}

type RiffleCardMotionState =
  | { opacity: number; y: number; rotate: number }
  | { opacity: number; y: number; scale: number };

export interface RiffleCardMotion {
  initial: RiffleCardMotionState;
  exit: RiffleCardMotionState;
}

export const RIFFLE_DELTAS: Record<RiffleDirection, -1 | 1> = {
  front: -1,
  deeper: 1,
};

const RIFFLE_THRESHOLDS = {
  committedDistance: 72,
  velocityMinimumDistance: 10,
  committedVelocity: 300,
} as const;

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
} as const;

function directionFromVertical(value: number): RiffleDirection {
  return value > 0 ? "deeper" : "front";
}

function velocityExceedsThreshold(absY: number, velocityY: number): boolean {
  return (
    absY >= RIFFLE_THRESHOLDS.velocityMinimumDistance &&
    Math.abs(velocityY) >= RIFFLE_THRESHOLDS.committedVelocity
  );
}

export function resolveRiffleDrag({
  offsetX = 0,
  offsetY,
  velocityY,
}: RiffleDragInput): RiffleDirection | null {
  const absX = Math.abs(offsetX);
  const absY = Math.abs(offsetY);

  if (absX > absY) {
    return null;
  }

  if (absY >= RIFFLE_THRESHOLDS.committedDistance) {
    return directionFromVertical(offsetY);
  }

  if (velocityExceedsThreshold(absY, velocityY)) {
    return directionFromVertical(velocityY);
  }

  return null;
}

export function resolveRiffleMove({
  currentIndex,
  total,
  direction,
}: RiffleMoveInput): RiffleMoveResult {
  const delta = RIFFLE_DELTAS[direction];
  const nextIndex = currentIndex + delta;
  const moved = total > 0 && nextIndex >= 0 && nextIndex < total;

  return {
    direction,
    delta,
    nextIndex: moved ? nextIndex : currentIndex,
    moved,
    edge: moved ? null : direction,
  };
}

const MOTION_NORMAL_DEEPER: RiffleCardMotionState = { opacity: 0, y: -78, rotate: -3 };
const MOTION_NORMAL_EXIT_DEEPER: RiffleCardMotionState = { opacity: 0, y: 66, rotate: 4 };
const MOTION_NORMAL_FRONT: RiffleCardMotionState = { opacity: 0, y: 78, rotate: 3 };
const MOTION_NORMAL_EXIT_FRONT: RiffleCardMotionState = { opacity: 0, y: -66, rotate: -4 };
const MOTION_REDUCED_DEEPER: RiffleCardMotionState = { opacity: 0, y: -42, scale: 0.98 };
const MOTION_REDUCED_EXIT_DEEPER: RiffleCardMotionState = { opacity: 0, y: 54, scale: 0.96 };
const MOTION_REDUCED_FRONT: RiffleCardMotionState = { opacity: 0, y: 42, scale: 0.98 };
const MOTION_REDUCED_EXIT_FRONT: RiffleCardMotionState = { opacity: 0, y: -54, scale: 0.96 };

export function riffleActiveCardMotion(
  direction: RiffleDirection,
  reducedMotion: boolean,
): RiffleCardMotion {
  if (reducedMotion) {
    return direction === "deeper"
      ? { initial: MOTION_REDUCED_DEEPER, exit: MOTION_REDUCED_EXIT_DEEPER }
      : { initial: MOTION_REDUCED_FRONT, exit: MOTION_REDUCED_EXIT_FRONT };
  }

  return direction === "deeper"
    ? { initial: MOTION_NORMAL_DEEPER, exit: MOTION_NORMAL_EXIT_DEEPER }
    : { initial: MOTION_NORMAL_FRONT, exit: MOTION_NORMAL_EXIT_FRONT };
}
