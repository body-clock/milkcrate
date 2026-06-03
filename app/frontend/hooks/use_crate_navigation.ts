import { useState, useCallback, useEffect, useRef } from "react";

import { isLessonLearned } from "@/lib/first_swipe_lesson";
import {
  resolveRiffleDrag,
  type RiffleDirection,
} from "@/lib/riffle_navigation";

import { handleRiffleNavigation } from "./crate_navigation_helpers";
import type { CrateNavDeps, ResetEffectDeps, NavigationState } from "./crate_navigation_types";

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

function useKeyboardNavigation(navigate: (direction: RiffleDirection) => void) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) { return; }
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) { return; }
      if (e.key === "ArrowDown") { navigate("deeper"); return; }
      if (e.key === "ArrowUp") { navigate("front"); }
    },
    [navigate],
  );
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

function useCrateNavigate(deps: CrateNavDeps) {
  return useCallback(
    (riffleDirection: RiffleDirection) =>
      handleRiffleNavigation(riffleDirection, deps),
    [deps],
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
