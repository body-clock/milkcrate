/* eslint-disable eslint/max-lines */

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

interface NavigateCtx {
  total: number;
  isCompact: boolean;
  indexRef: React.RefObject<number>;
  direction: React.RefObject<RiffleDirection>;
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

// eslint-disable-next-line max-lines-per-function
function useKeyboardNavigation(navigate: (direction: RiffleDirection) => void) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) {
        return;
      }
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
        return;
      }
      if (e.key === "ArrowDown") {
        navigate("deeper");
      }
      if (e.key === "ArrowUp") {
        navigate("front");
      }
    },
    [navigate],
  );
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

// eslint-disable-next-line eslint/max-params
function applyNavigationMove(
  nextIndex: number,
  riffleDirection: RiffleDirection,
  direction: React.MutableRefObject<RiffleDirection>,
  indexRef: React.MutableRefObject<number>,
  isCompact: boolean,
  setIndex: React.Dispatch<React.SetStateAction<number>>,
  setShowGestureHint: React.Dispatch<React.SetStateAction<boolean>>,
  setEdgeStatus: React.Dispatch<React.SetStateAction<string | null>>,
) {
  // eslint-disable-next-line eslint/no-param-reassign
  direction.current = riffleDirection;
  // eslint-disable-next-line eslint/no-param-reassign
  indexRef.current = nextIndex;
  setIndex(nextIndex);
  setShowGestureHint(false);
  setEdgeStatus(null);
  if (isCompact) {
    markLessonLearned();
  }
}

function handleRiffleNavigation(riffleDirection: RiffleDirection, opts: { total: number; isCompact: boolean; indexRef: React.MutableRefObject<number>; direction: React.MutableRefObject<RiffleDirection>; setIndex: React.Dispatch<React.SetStateAction<number>>; setShowGestureHint: React.Dispatch<React.SetStateAction<boolean>>; setEdgeStatus: React.Dispatch<React.SetStateAction<string | null>> }) {
  const move = resolveRiffleMove({ currentIndex: opts.indexRef.current, total: opts.total, direction: riffleDirection });
  if (!move.moved) { opts.setEdgeStatus(RIFFLE_LANGUAGE.edgeStatus[riffleDirection]); return; }
  applyNavigationMove(move.nextIndex, riffleDirection, opts.direction, opts.indexRef, opts.isCompact, opts.setIndex, opts.setShowGestureHint, opts.setEdgeStatus);
}

function useNavigate(
  { total, isCompact, indexRef, direction }: NavigateCtx,
  setIndex: React.Dispatch<React.SetStateAction<number>>,
  setShowGestureHint: React.Dispatch<React.SetStateAction<boolean>>,
  setEdgeStatus: React.Dispatch<React.SetStateAction<string | null>>,
) {
  return useCallback(
    (riffleDirection: RiffleDirection) => handleRiffleNavigation(riffleDirection, { total, isCompact, indexRef, direction, setIndex, setShowGestureHint, setEdgeStatus }),
    [total, isCompact, indexRef, direction, setIndex, setShowGestureHint, setEdgeStatus],
  );
}

function computeProgress(index: number, total: number): number {
  return total > 0 ? ((index + 1) / total) * PROGRESS_PCT_BASE : 0;
}

// eslint-disable-next-line eslint/max-params
function useResetEffect(
  initialIndex: number,
  resetKey: string,
  setIndex: React.Dispatch<React.SetStateAction<number>>,
  setShowGestureHint: React.Dispatch<React.SetStateAction<boolean>>,
  setEdgeStatus: React.Dispatch<React.SetStateAction<string | null>>,
) {
  useEffect(() => {
    setIndex(initialIndex);
    setShowGestureHint(!isLessonLearned());
    setEdgeStatus(null);
  }, [initialIndex, resetKey, setIndex, setShowGestureHint, setEdgeStatus]);
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

  useResetEffect(initialIndex, resetKey, setIndex, setShowGestureHint, setEdgeStatus);

  const ctx: NavigateCtx = { total, isCompact, indexRef, direction };
  const navigate = useNavigate(ctx, setIndex, setShowGestureHint, setEdgeStatus);
  const handleDragEnd = useDragNavigation(navigate);
  useKeyboardNavigation(navigate);
  const progress = computeProgress(index, total);

  return {
    index, direction, navigate, handleDragEnd,
    edgeStatus, showGestureHint, progress, dragRotationRef,
  };
}
