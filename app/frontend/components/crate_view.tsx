import { useMemo } from "react";
import RecordDetails from "./record_details";
import CrateHeader from "./crate_view/crate_header";
import CardStack from "./crate_view/card_stack";
import CrateProgress from "./crate_view/crate_progress";
import { buildCrateWindow } from "../lib/crate_window";
import { useCrateNavigation } from "@/hooks/use_crate_navigation";
import { useViewport } from "@/hooks/use_viewport";
import { useReducedMotionContext } from "./storefront_motion_config";
import { usePreload } from "@/hooks/use_preload";
import type { Crate, Listing } from "../types/inertia";

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
  const { activeCrate, records, total } = useMemo(() => {
    const crate = crates.find((c) => c.slug === activeSlug) ?? crates[0];
    const recs = crate?.records ?? [];
    return { activeCrate: crate, records: recs, total: recs.length };
  }, [crates, activeSlug]);

  const {
    index,
    direction,
    navigate,
    edgeStatus,
    showGestureHint,
    progress,
    dragRotationRef,
    handleDragEnd,
  } = useCrateNavigation({ total, isCompact, initialIndex: startIndex, resetKey: activeSlug });

  usePreload(records, index);
  const visibleRecords = useMemo(
    () => buildCrateWindow<Listing>(records, index, WINDOW_RADIUS),
    [records, index],
  );

  const activeRecord = records[index];

  const layoutMode = compactHeaderOwnedByLayout
    ? hideTabs
      ? "minimal"
      : "compact"
    : hideTabs
      ? "no-tabs"
      : "full";

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
    return (
      <div>
        {header}
        <div className="py-16 text-center text-mc-text-dim text-sm">
          No records in this crate yet.
        </div>
      </div>
    );
  }

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
            <RecordDetails listing={activeRecord} direction={direction.current} />
          </div>
        )}
      </div>
    </div>
  );
}
