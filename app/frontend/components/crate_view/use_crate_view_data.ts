import { useMemo } from "react";

import { useCrateNavigation } from "@/hooks/use_crate_navigation";
import { usePreload } from "@/hooks/use_preload";
import { useViewport } from "@/hooks/use_viewport";

import { buildCrateWindow } from "../../lib/crate_window";
import type { RiffleDirection } from "../../lib/riffle_navigation";
import type { Crate, Listing } from "../../types/inertia";
import { useReducedMotionContext } from "../storefront_motion_config";
import type { CrateHeaderLayoutMode } from "./crate_header/types";
import { deriveCrateData, deriveLayoutMode } from "./helpers";

const WINDOW_RADIUS = 2;

interface UseCrateViewDataOpts {
  crates: Crate[];
  activeSlug: string;
  startIndex: number;
  hideTabs: boolean;
  compactHeaderOwnedByLayout: boolean;
}

interface UseCrateViewDataResult {
  isCompact: boolean;
  prefersReducedMotion: boolean;
  activeCrate: Crate | undefined;
  records: Listing[];
  total: number;
  index: number;
  direction: React.RefObject<RiffleDirection>;
  navigate: (riffleDirection: RiffleDirection) => void;
  edgeStatus: string | null;
  showGestureHint: boolean;
  progress: number;
  dragRotationRef: React.RefObject<HTMLDivElement | null>;
  handleDragEnd: (info: {
    offset: { x: number; y: number };
    velocity: { x: number; y: number };
  }) => void;
  activeSlug: string;
  visibleRecords: ReturnType<typeof buildCrateWindow<Listing>>;
  activeRecord: Listing | undefined;
  layoutMode: CrateHeaderLayoutMode;
}

function useCrateViewRecords(crates: Crate[], activeSlug: string) {
  return useMemo(() => deriveCrateData(crates, activeSlug), [crates, activeSlug]);
}

function useCrateViewWindow(records: Listing[], index: number) {
  usePreload(records, index);
  return useMemo(() => buildCrateWindow<Listing>(records, index, WINDOW_RADIUS), [records, index]);
}

export function useCrateViewData(opts: UseCrateViewDataOpts): UseCrateViewDataResult {
  const { crates, activeSlug, startIndex, hideTabs, compactHeaderOwnedByLayout } = opts;
  const { isCompact } = useViewport();
  const prefersReducedMotion = useReducedMotionContext();
  const { activeCrate, records, total } = useCrateViewRecords(crates, activeSlug);
  const nav = useCrateNavigation({ total, isCompact,
    initialIndex: startIndex, resetKey: activeSlug });
  const visibleRecords = useCrateViewWindow(records, nav.index);
  const activeRecord = records[nav.index];
  const layoutMode = deriveLayoutMode(compactHeaderOwnedByLayout, hideTabs);
  return { isCompact, prefersReducedMotion, activeCrate, records, total, activeSlug,
    ...nav, visibleRecords, activeRecord, layoutMode };
}
