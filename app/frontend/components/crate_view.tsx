import { useMemo } from "react";

import { useCrateNavigation } from "@/hooks/use_crate_navigation";
import { usePreload } from "@/hooks/use_preload";
import { useViewport } from "@/hooks/use_viewport";

import { buildCrateWindow } from "../lib/crate_window";
import type { RiffleDirection } from "../lib/riffle_navigation";
import type { Crate, Listing } from "../types/inertia";
import CardStack from "./crate_view/card_stack";
import CrateHeader from "./crate_view/crate_header";
import type { CrateHeaderLayoutMode } from "./crate_view/crate_header/types";
import CrateProgress from "./crate_view/crate_progress";
import RecordDetails from "./record_details";
import { useReducedMotionContext } from "./storefront_motion_config";

const WINDOW_RADIUS = 2;

interface Props {
  crates: Crate[];
  activeSlug: string;
  startIndex?: number;
  hideTabs?: boolean;
  compactHeaderOwnedByLayout?: boolean;
  onSelectCrate: (slug: string, startIndex?: number) => void;
  onBack?: () => void;
}

interface CrateData {
  activeCrate: Crate | undefined;
  records: Listing[];
  total: number;
}

function deriveCrateData(crates: Crate[], activeSlug: string): CrateData {
  const crate = crates.find((c) => c.slug === activeSlug) ?? crates[0];
  const recs = crate?.records ?? [];
  return { activeCrate: crate, records: recs, total: recs.length };
}

function deriveLayoutMode(
  compactHeaderOwnedByLayout: boolean,
  hideTabs: boolean,
): CrateHeaderLayoutMode {
  if (compactHeaderOwnedByLayout) {
    return hideTabs ? "minimal" : "compact";
  }
  return hideTabs ? "no-tabs" : "full";
}

function CrateEmptyState({ header }: { header: React.ReactNode }) {
  return (
    <div>
      {header}
      <div className="py-16 text-center text-mc-text-dim text-sm">
        No records in this crate yet.
      </div>
    </div>
  );
}

type CrateNavResult = ReturnType<typeof useCrateNavigation>;

interface CrateViewContentProps {
  header: React.ReactNode;
  isCompact: boolean;
  visibleRecords: ReturnType<typeof buildCrateWindow<Listing>>;
  activeSlug: string;
  prefersReducedMotion: boolean;
  direction: React.RefObject<RiffleDirection>;
  showGestureHint: boolean;
  total: number;
  dragRotationRef: React.RefObject<HTMLDivElement | null>;
  handleDragEnd: CrateNavResult["handleDragEnd"];
  index: number;
  progress: number;
  edgeStatus: string | null;
  navigate: (dir: RiffleDirection) => void;
  activeRecord: Listing | undefined;
}

function CrateViewContent({
  header,
  isCompact,
  visibleRecords,
  activeSlug,
  prefersReducedMotion,
  direction,
  showGestureHint,
  total,
  dragRotationRef,
  handleDragEnd,
  index,
  progress,
  edgeStatus,
  navigate,
  activeRecord,
}: CrateViewContentProps) {
  return (
    <div className="flex flex-col">
      {header}

      <div className="md:mx-auto md:w-full md:grid md:grid-cols-[420px_1fr] md:gap-12 md:items-start">
        <div className="flex flex-col">
          <CardStack
            isCompact={isCompact}
            visibleRecords={visibleRecords}
            activeSlug={activeSlug}
            prefersReducedMotion={prefersReducedMotion}
            direction={direction}
            showGestureHint={showGestureHint}
            total={total}
            dragRotationRef={dragRotationRef}
            handleDragEnd={handleDragEnd}
          />
          <CrateProgress
            index={index}
            total={total}
            progress={progress}
            edgeStatus={edgeStatus}
            isCompact={isCompact}
            prefersReducedMotion={prefersReducedMotion}
            navigate={navigate}
          />
        </div>

        {activeRecord && (
          <div className="hidden md:flex md:flex-col md:pt-7">
            <RecordDetails
              listing={activeRecord}
              direction={direction.current}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Orchestrates the crate browsing view: header, card stack with drag
 * navigation, progress indicator, and desktop sidebar details.
 */
export default function CrateView({
  crates,
  activeSlug,
  startIndex = 0,
  hideTabs = false,
  compactHeaderOwnedByLayout = false,
  onSelectCrate,
  onBack,
}: Props) {
  const { isCompact } = useViewport();
  const prefersReducedMotion = useReducedMotionContext();

  const { activeCrate, records, total } = useMemo(
    () => deriveCrateData(crates, activeSlug),
    [crates, activeSlug],
  );

  const {
    index,
    direction,
    navigate,
    edgeStatus,
    showGestureHint,
    progress,
    dragRotationRef,
    handleDragEnd,
  } = useCrateNavigation({
    total,
    isCompact,
    initialIndex: startIndex,
    resetKey: activeSlug,
  });

  usePreload(records, index);
  const visibleRecords = useMemo(
    () => buildCrateWindow<Listing>(records, index, WINDOW_RADIUS),
    [records, index],
  );

  const activeRecord = records[index];
  const layoutMode = deriveLayoutMode(compactHeaderOwnedByLayout, hideTabs);

  const header = (
    <CrateHeader
      isCompact={isCompact}
      onBack={onBack}
      tabs={{ crates, activeSlug, onSelectCrate }}
      activeCrate={activeCrate}
      total={total}
      layoutMode={layoutMode}
    />
  );

  if (!activeCrate || total === 0) {
    return <CrateEmptyState header={header} />;
  }

  return (
    <CrateViewContent
      header={header}
      isCompact={isCompact}
      visibleRecords={visibleRecords}
      activeSlug={activeSlug}
      prefersReducedMotion={prefersReducedMotion}
      direction={direction}
      showGestureHint={showGestureHint}
      total={total}
      dragRotationRef={dragRotationRef}
      handleDragEnd={handleDragEnd}
      index={index}
      progress={progress}
      edgeStatus={edgeStatus}
      navigate={navigate}
      activeRecord={activeRecord}
    />
  );
}
