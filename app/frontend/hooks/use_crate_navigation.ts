import { useState, useCallback, useEffect, useRef } from "react";
import {
  RIFFLE_LANGUAGE,
  resolveRiffleMove,
  resolveRiffleDrag,
  type RiffleDirection,
} from "@/lib/riffle_navigation";
import { markLessonLearned, isLessonLearned } from "@/lib/first_swipe_lesson";

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
  if (!(target instanceof HTMLElement)) {return false;}
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
      if (!riffleDirection) {return;}
      navigate(riffleDirection);
    },
    [navigate],
  );
}

function useKeyboardNavigation(navigate: (direction: RiffleDirection) => void) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) {return;}
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) {return;}
      if (e.key === "ArrowDown") {navigate("deeper");}
      if (e.key === "ArrowUp") {navigate("front");}
    },
    [navigate],
  );
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

function useNavigate(
  { total, isCompact, indexRef, direction }: NavigateCtx,
  setIndex: React.Dispatch<React.SetStateAction<number>>,
  setShowGestureHint: React.Dispatch<React.SetStateAction<boolean>>,
  setEdgeStatus: React.Dispatch<React.SetStateAction<string | null>>,
) {
  return useCallback(
    (riffleDirection: RiffleDirection) => {
      const move = resolveRiffleMove({
        currentIndex: indexRef.current,
        total,
        direction: riffleDirection,
      });
      if (!move.moved) {
        setEdgeStatus(RIFFLE_LANGUAGE.edgeStatus[riffleDirection]);
        return;
      }
      direction.current = riffleDirection;
      indexRef.current = move.nextIndex;
      setIndex(move.nextIndex);
      setShowGestureHint(false);
      setEdgeStatus(null);
      if (isCompact) {markLessonLearned();}
    },
    [total, isCompact, indexRef, direction, setIndex, setShowGestureHint, setEdgeStatus],
  );
}

export function useCrateNavigation({
  total,
  isCompact,
  initialIndex,
  resetKey,
}: UseCrateNavigationOptions): UseCrateNavigationResult {
  const [index, setIndex] = useState(initialIndex);
  const [showGestureHint, setShowGestureHint] = useState(() => !isLessonLearned());
  const [edgeStatus, setEdgeStatus] = useState<string | null>(null);
  const direction = useRef<RiffleDirection>("deeper");
  const indexRef = useRef(index);
  const dragRotationRef = useRef<HTMLDivElement>(null);
  indexRef.current = index;

  useEffect(() => {
    setIndex(initialIndex);
    setShowGestureHint(!isLessonLearned());
    setEdgeStatus(null);
  }, [initialIndex, resetKey]);

  const ctx: NavigateCtx = { total, isCompact, indexRef, direction };
  const navigate = useNavigate(ctx, setIndex, setShowGestureHint, setEdgeStatus);
  const handleDragEnd = useDragNavigation(navigate);
  useKeyboardNavigation(navigate);
  const progress = total > 0 ? ((index + 1) / total) * PROGRESS_PCT_BASE : 0;

  return { index, direction, navigate, handleDragEnd, edgeStatus, showGestureHint, progress, dragRotationRef };
}
