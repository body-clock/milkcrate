import { useEffect, useMemo, useState } from "react";
import { type PanInfo } from "framer-motion";
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

export function useWallPageNavigation(
  records: Listing[],
  tilesPerPage: number,
  isCompact: boolean,
  prefersReducedMotion: boolean,
) {
  const [[pageIndex, direction], setPageState] = useState([0, 0]);

  const pages = useMemo(() => {
    if (records.length === 0) {return [];}
    return chunkRecords(records, isCompact ? tilesPerPage : records.length);
  }, [records, tilesPerPage, isCompact]);

  useEffect(() => {
    if (pages.length > 0 && pageIndex > pages.length - 1) {
      setPageState([pages.length - 1, -1]);
    }
  }, [pages.length, pageIndex]);

  const goToPage = (index: number) => {
    if (index === pageIndex) {return;}
    setPageState([index, index > pageIndex ? 1 : -1]);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const power = swipePower(info.offset.x, info.velocity.x);
    if (power > SWIPE_THRESHOLD && pageIndex > 0) {
      setPageState([pageIndex - 1, -1]);
    } else if (power < -SWIPE_THRESHOLD && pageIndex < pages.length - 1) {
      setPageState([pageIndex + 1, 1]);
    }
  };

  const transition = prefersReducedMotion ? { duration: 0 } : springTactile;
  const pageCount = pages.length;
  const currentPage = pages[pageIndex] ?? [];
  const showPagination = pageCount > 1;

  return { pageIndex, direction, currentPage, pageCount, showPagination, transition, goToPage, handleDragEnd };
}
