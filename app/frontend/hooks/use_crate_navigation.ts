import { useState, useCallback, useEffect, useRef } from "react";

import { markLessonLearned, isLessonLearned } from "@/lib/first_swipe_lesson";
import {
  RIFFLE_LANGUAGE,
  resolveRiffleMove,
  resolveRiffleDrag,
  type RiffleDirection,
} from "@/lib/riffle_navigation";

interface UseCrateNavigationOptions {
  total: number;
  isCompact: boolean;
  initialIndex: number;
  resetKey: string;
}

interface UseCrateNavigationResult {
  index: number;
  direction: React.RefObject<RiffleDirection>;
  navigate: (riffleDirection: RiffleDirection) => void;
  handleDragEnd: (info: {
    offset: { x: number; y: number };
    velocity: { x: number; y: number };
  }) => void;
  edgeStatus: string | null;
  showGestureHint: boolean;
  progress: number;
  dragRotationRef: React.RefObject<HTMLDivElement | null>;
}

interface DragEndInfo {
  offset: { x: number; y: number };
  velocity: { x: number; y: number };
}

interface CrateNavDeps {
  total: number;
  isCompact: boolean;
  indexRef: React.MutableRefObject<number>;
  direction: React.MutableRefObject<RiffleDirection>;
  setIndex: React.Dispatch<React.SetStateAction<number>>;
  setShowGestureHint: React.Dispatch<React.SetStateAction<boolean>>;
  setEdgeStatus: React.Dispatch<React.SetStateAction<string | null>>;
}

interface ResetEffectDeps {
  initialIndex: number;
  resetKey: string;
  setIndex: React.Dispatch<React.SetStateAction<number>>;
  setShowGestureHint: React.Dispatch<React.SetStateAction<boolean>>;
  setEdgeStatus: React.Dispatch<React.SetStateAction<string | null>>;
}

interface NavigationState {
  index: number;
  setIndex: React.Dispatch<React.SetStateAction<number>>;
  showGestureHint: boolean;
  setShowGestureHint: React.Dispatch<React.SetStateAction<boolean>>;
  edgeStatus: string | null;
  setEdgeStatus: React.Dispatch<React.SetStateAction<string | null>>;
  direction: React.MutableRefObject<RiffleDirection>;
  indexRef: React.MutableRefObject<number>;
  dragRotationRef: React.RefObject<HTMLDivElement | null>;
}

const PROGRESS_PCT_BASE = 100;

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

function createKeyDownHandler(navigate: (d: RiffleDirection) => void) {
  return (e: KeyboardEvent) => {
    if (isEditableTarget(e.target)) {
      return;
    }
    if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
      return;
    }
    if (e.key === "ArrowDown") {
      navigate("deeper");
      return;
    }
    if (e.key === "ArrowUp") {
      navigate("front");
    }
  };
}

function useDragNavigation(navigate: (direction: RiffleDirection) => void) {
  return useCallback(
    (info: DragEndInfo) => {
      const riffleDirection = resolveRiffleDrag({
        offsetX: info.offset.x,
        offsetY: info.offset.y,
        velocityY: info.velocity.y,
      });
      if (!riffleDirection) {
        return;
      }
      navigate(riffleDirection);
    },
    [navigate],
  );
}

function useKeyboardNavigation(navigate: (direction: RiffleDirection) => void) {
  const handler = useCallback(createKeyDownHandler(navigate), [navigate]);
  useEffect(() => {
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handler]);
}

function computeProgress(index: number, total: number): number {
  return total > 0 ? ((index + 1) / total) * PROGRESS_PCT_BASE : 0;
}

function useResetEffect(deps: ResetEffectDeps) {
  const { initialIndex, resetKey, setIndex, setShowGestureHint, setEdgeStatus } = deps;
  useEffect(() => {
    setIndex(initialIndex);
    setShowGestureHint(!isLessonLearned());
    setEdgeStatus(null);
  }, [initialIndex, resetKey, setIndex, setShowGestureHint, setEdgeStatus]);
}

/**
 * Performs a riffle navigation move.
 * Ref mutations happen via opts (2 levels deep from param → no-param-reassign pass).
 */
function handleRiffleNavigation(
  riffleDirection: RiffleDirection,
  opts: CrateNavDeps,
) {
  const move = resolveRiffleMove({
    currentIndex: opts.indexRef.current,
    total: opts.total,
    direction: riffleDirection,
  });
  if (!move.moved) {
    opts.setEdgeStatus(RIFFLE_LANGUAGE.edgeStatus[riffleDirection]);
    return;
  }
  opts.direction.current = riffleDirection;
  opts.indexRef.current = move.nextIndex;
  opts.setIndex(move.nextIndex);
  opts.setShowGestureHint(false);
  opts.setEdgeStatus(null);
  if (opts.isCompact) {
    markLessonLearned();
  }
}

function useCrateNavigate(deps: CrateNavDeps) {
  const {
    total, isCompact, indexRef, direction,
    setIndex, setShowGestureHint, setEdgeStatus,
  } = deps;
  return useCallback(
    (riffleDirection: RiffleDirection) =>
      handleRiffleNavigation(riffleDirection, deps),
    [total, isCompact, indexRef, direction, setIndex, setShowGestureHint, setEdgeStatus],
  );
}

function useNavigationState(initialIndex: number): NavigationState {
  const [index, setIndex] = useState(initialIndex);
  const [showGestureHint, setShowGestureHint] = useState(() => !isLessonLearned());
  const [edgeStatus, setEdgeStatus] = useState<string | null>(null);
  const direction = useRef<RiffleDirection>("deeper");
  const indexRef = useRef(index);
  const dragRotationRef = useRef<HTMLDivElement>(null);
  indexRef.current = index;
  return {
    index,
    setIndex,
    showGestureHint,
    setShowGestureHint,
    edgeStatus,
    setEdgeStatus,
    direction,
    indexRef,
    dragRotationRef,
  };
}

export function useCrateNavigation({
  total, isCompact, initialIndex, resetKey,
}: UseCrateNavigationOptions): UseCrateNavigationResult {
  const {
    index, setIndex, showGestureHint, setShowGestureHint,
    edgeStatus, setEdgeStatus, direction, indexRef, dragRotationRef,
  } = useNavigationState(initialIndex);

  useResetEffect({ initialIndex, resetKey, setIndex, setShowGestureHint, setEdgeStatus });

  const navigate = useCrateNavigate({
    total, isCompact, indexRef, direction,
    setIndex, setShowGestureHint, setEdgeStatus,
  });

  const handleDragEnd = useDragNavigation(navigate);
  useKeyboardNavigation(navigate);
  const progress = computeProgress(index, total);

  return {
    index, direction, navigate, handleDragEnd,
    edgeStatus, showGestureHint, progress, dragRotationRef,
  };
}
