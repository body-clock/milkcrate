import { type PanInfo } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import { springTactile } from "@/lib/motion_tokens";

import type { Listing } from "../types/inertia";

const SWIPE_THRESHOLD = 8000;

function swipePower(offset: number, velocity: number) {
  return Math.abs(offset) * velocity;
}

function chunkRecords(records: Listing[], chunkSize: number): Listing[][] {
  const result: Listing[][] = [];
  for (let i = 0; i < records.length; i += chunkSize) {
    result.push(records.slice(i, i + chunkSize));
  }
  return result;
}

function clampPageIndex(pages: Listing[][], pageIndex: number): number {
  if (pages.length === 0 || pageIndex <= pages.length - 1) {
    return pageIndex;
  }
  return pages.length - 1;
}

function computeSwipeDirection(power: number, pageIndex: number, pageCount: number): number | null {
  if (power > SWIPE_THRESHOLD && pageIndex > 0) {
    return -1;
  }
  if (power < -SWIPE_THRESHOLD && pageIndex < pageCount - 1) {
    return 1;
  }
  return null;
}

function useGoToPage(
  pageIndex: number,
  setPageState: React.Dispatch<React.SetStateAction<[number, number]>>,
): (index: number) => void {
  return (index: number) => {
    if (index === pageIndex) {
      return;
    }
    setPageState([index, index > pageIndex ? 1 : -1]);
  };
}

function useDragEndHandler(
  pageIndex: number,
  pageCount: number,
  setPageState: React.Dispatch<React.SetStateAction<[number, number]>>,
): (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void {
  return (_, info) => {
    const power = swipePower(info.offset.x, info.velocity.x);
    const dir = computeSwipeDirection(power, pageIndex, pageCount);
    if (dir !== null) {
      setPageState([pageIndex + dir, dir]);
    }
  };
}

function useChunkedPages(
  records: Listing[],
  isCompact: boolean,
  tilesPerPage: number,
): Listing[][] {
  return useMemo(() => {
    if (records.length === 0) {
      return [];
    }
    return chunkRecords(records, isCompact ? tilesPerPage : records.length);
  }, [records, tilesPerPage, isCompact]);
}

function useClampPageIndex(
  pages: Listing[][],
  pageIndex: number,
  setPageState: React.Dispatch<React.SetStateAction<[number, number]>>,
): void {
  useEffect(() => {
    const clamped = clampPageIndex(pages, pageIndex);
    if (clamped !== pageIndex) {
      setPageState([clamped, -1]);
    }
  }, [pages, pages.length, pageIndex, setPageState]);
}

function usePageControls(
  pageIndex: number,
  pageCount: number,
  setPageState: React.Dispatch<React.SetStateAction<[number, number]>>,
) {
  const goToPage = useGoToPage(pageIndex, setPageState);
  const handleDragEnd = useDragEndHandler(pageIndex, pageCount, setPageState);
  return { goToPage, handleDragEnd };
}

function useDerivedPageState(
  pages: Listing[][],
  pageIndex: number,
  prefersReducedMotion: boolean,
) {
  const transition = prefersReducedMotion ? { duration: 0 } : springTactile;
  const currentPage = pages[pageIndex] ?? [];
  const showPagination = pages.length > 1;
  return { transition, currentPage, showPagination };
}

export function useWallPageNavigation(
  records: Listing[],
  tilesPerPage: number,
  isCompact: boolean,
  prefersReducedMotion: boolean,
) {
  const [[pageIndex, direction], setPageState] = useState([0, 0]);
  const pages = useChunkedPages(records, isCompact, tilesPerPage);
  useClampPageIndex(pages, pageIndex, setPageState);
  const { goToPage, handleDragEnd } = usePageControls(pageIndex, pages.length, setPageState);
  const { transition, currentPage, showPagination } = useDerivedPageState(
    pages, pageIndex, prefersReducedMotion,
  );

  return {
    pageIndex, direction, currentPage,
    pageCount: pages.length, showPagination, transition, goToPage, handleDragEnd,
  };
}
