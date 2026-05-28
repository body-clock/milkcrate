import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CrateTabs from "./crate_tabs";
import GhostFingerCue from "./ghost_finger_cue";
import RecordCard from "./record_card";
import RecordDetails from "./record_details";
import ScoreBreakdown from "./score_breakdown";
import BackButton from "./back_button";
import { buildCrateWindow } from "../lib/crate_window";
import {
  RIFFLE_LANGUAGE,
  riffleActiveCardMotion,
  type RiffleDirection,
} from "../lib/riffle_navigation";
import { useCrateNavigation } from "@/hooks/use_crate_navigation";
import { useViewport } from "@/hooks/use_viewport";
import {
  SCALE_PRESS,
  springPress,
  transitionCrate,
  transitionCrateDesktop,
  reducedMotionTransition,
} from "@/lib/motion_tokens";
import { useReducedMotionContext } from "./storefront_motion_config";
import { isLessonEligible } from "../lib/first_swipe_lesson";
import { usePreload } from "@/hooks/use_preload";
import type { Crate, Listing } from "../types/inertia";

interface Props {
  crates: Crate[];
  activeSlug: string;
  startIndex?: number;
  hideTabs?: boolean;
  compactHeaderOwnedByLayout?: boolean;
  onSelectCrate: (slug: string, startIndex?: number) => void;
  onBack?: () => void;
}

// ── Constants ─────────────────────────────────────────────────

const ROTATION_FACTOR = 8 / 120;
const WINDOW_RADIUS = 2;
const compositedLayerStyle: React.CSSProperties = {
  willChange: "transform, opacity",
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
  contain: "layout paint style",
};
const activeLayerStyle: React.CSSProperties = {
  willChange: "transform, opacity",
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
};

// ── Sub-components ───────────────────────────────────────────

interface CrateHeaderProps {
  isCompact: boolean;
  onBack?: () => void;
  crates: Crate[];
  activeSlug: string;
  activeCrate: Crate | undefined;
  total: number;
  hideTabs: boolean;
  compactHeaderOwnedByLayout: boolean;
  onSelectCrate: (slug: string, startIndex?: number) => void;
}

function CrateHeader({
  isCompact,
  onBack,
  crates,
  activeSlug,
  activeCrate,
  total,
  hideTabs,
  compactHeaderOwnedByLayout,
  onSelectCrate,
}: CrateHeaderProps) {
  if (isCompact) {
    if (compactHeaderOwnedByLayout && hideTabs) return null;

    return (
      <div className="mb-3">
        <>
          {!compactHeaderOwnedByLayout && (
            <div className="flex items-center gap-3">
              {onBack && <BackButton variant="icon" onClick={onBack} label="store" />}
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-base font-semibold leading-tight">
                  {activeCrate?.name}
                </h1>
                <div className="text-[11px] uppercase tracking-[0.12em] text-mc-text-dim">
                  {total === 1 ? "1 record" : `${total} records`}
                </div>
              </div>
            </div>
          )}
          {!hideTabs && (
            <div className={`${compactHeaderOwnedByLayout ? "" : "mt-2 "} -mx-1`}>
              <CrateTabs crates={crates} activeSlug={activeSlug} onSelect={onSelectCrate} compact />
            </div>
          )}
        </>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <>
        <div className="flex items-center gap-3 border-b border-mc-border pb-2 mb-3">
          {onBack && <BackButton variant="text" onClick={onBack} label="store" />}
          {onBack && !hideTabs && <div className="w-px self-stretch bg-mc-border" />}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold leading-tight">{activeCrate?.name}</h1>
            <div className="text-[11px] uppercase tracking-[0.12em] text-mc-text-dim">
              {total === 1 ? "1 record" : `${total} records`}
            </div>
          </div>
        </div>
        {!hideTabs && (
          <CrateTabs crates={crates} activeSlug={activeSlug} onSelect={onSelectCrate} />
        )}
      </>
    </div>
  );
}

interface CardStackProps {
  isCompact: boolean;
  visibleRecords: ReturnType<typeof buildCrateWindow<Listing>>;
  activeSlug: string;
  prefersReducedMotion: boolean;
  direction: React.RefObject<RiffleDirection>;
  showGestureHint: boolean;
  total: number;
  dragRotationRef: React.RefObject<HTMLDivElement | null>;
  handleDragEnd: (info: {
    offset: { x: number; y: number };
    velocity: { x: number; y: number };
  }) => void;
}

function HintCardStack({
  visibleRecords,
  prefersReducedMotion,
}: Pick<CardStackProps, "visibleRecords" | "prefersReducedMotion">) {
  return (
    <>
      {visibleRecords
        .filter((s) => !s.isActive)
        .map((slot) => {
          const depth = Math.abs(slot.offset);
          const hintUrl = slot.record.thumbnail_url ?? slot.record.cover_image_url;
          const baseX = slot.offset * 16;
          const baseY = depth * 12;
          const baseRotate = slot.offset * -4;
          const scale = 1 - depth * 0.045;

          return (
            <div
              key={`hint-${slot.record.id}`}
              aria-hidden="true"
              data-riffle-slot={slot.offset}
              className="absolute inset-0 rounded-lg overflow-hidden border border-mc-border bg-mc-bg-raised shadow-lg pointer-events-none"
              style={{
                ...compositedLayerStyle,
                zIndex: 10 - depth,
                opacity: 0.38,
                transform: `translate(${baseX}px, ${baseY}px) rotate(${baseRotate}deg) scale(${scale})`,
                transition: prefersReducedMotion
                  ? "transform 0.01s ease-out, opacity 0.01s ease-out"
                  : "transform 0.2s ease-out, opacity 0.2s ease-out",
              }}
            >
              {hintUrl ? (
                <img
                  src={hintUrl}
                  alt=""
                  className="w-full h-full object-cover saturate-75"
                  draggable={false}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-mc-text-dim text-5xl">
                  ♪
                </div>
              )}
              <div className="absolute inset-0 bg-mc-bg/35" />
            </div>
          );
        })}
    </>
  );
}

function ActiveRecordCard({
  slot,
  isCompact,
  activeSlug,
  prefersReducedMotion,
  direction,
  dragRotationRef,
  handleDragEnd,
}: Pick<
  CardStackProps,
  "isCompact" | "activeSlug" | "prefersReducedMotion" | "direction" | "dragRotationRef" | "handleDragEnd"
> & {
  slot: ReturnType<typeof buildCrateWindow<Listing>>[number];
}) {
  return (
    <motion.div
      key={`active-${slot.record.id}`}
      custom={direction.current}
      variants={{
        initial: (d: RiffleDirection) => riffleActiveCardMotion(d, prefersReducedMotion).initial,
        animate: { opacity: 1, y: 0, rotate: 0, scale: 1 },
        exit: (d: RiffleDirection) => riffleActiveCardMotion(d, prefersReducedMotion).exit,
      }}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={
        prefersReducedMotion
          ? reducedMotionTransition
          : isCompact
            ? transitionCrate
            : transitionCrateDesktop
      }
      className="absolute inset-0"
      style={{ ...activeLayerStyle, zIndex: 30 }}
    >
      <motion.div
        ref={dragRotationRef}
        data-testid="crate-drag-surface"
        className="w-full h-full"
        style={{
          touchAction: "none",
          willChange: "transform",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          rotate: "var(--drag-rotate, 0deg)",
        }}
        drag
        dragConstraints={{ left: 0, right: 0, top: -180, bottom: 180 }}
        dragElastic={0.28}
        dragMomentum={false}
        dragSnapToOrigin
        whileDrag={prefersReducedMotion ? undefined : { scale: 0.985 }}
        onDrag={(_, info) => {
          dragRotationRef.current?.style.setProperty(
            "--drag-rotate",
            `${info.offset.x * ROTATION_FACTOR}deg`,
          );
        }}
        onDragEnd={(_e, info) => {
          dragRotationRef.current?.style.setProperty("--drag-rotate", "0deg");
          handleDragEnd(info);
        }}
      >
        {slot.record.thumbnail_url && (
          <div className="absolute inset-0 rounded-lg overflow-hidden z-0 pointer-events-none">
            <img
              src={slot.record.thumbnail_url}
              alt=""
              className="w-full h-full object-cover saturate-75"
              style={{ filter: "blur(8px)" }}
              draggable={false}
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
          </div>
        )}
        <RecordCard
          listing={slot.record}
          resetKey={`${activeSlug}-${slot.record.id}`}
          className="relative z-10 rounded-lg"
          imageLoading="eager"
          disableFlip={!isCompact}
          framed
        />
      </motion.div>
    </motion.div>
  );
}

function GestureHintOverlay({
  isCompact,
  showGestureHint,
  total,
  prefersReducedMotion,
}: Pick<CardStackProps, "isCompact" | "showGestureHint" | "total" | "prefersReducedMotion">) {
  if (!isCompact) return null;
  if (!showGestureHint) return null;
  if (!isLessonEligible({ isCompact, isPopulated: total > 0 })) return null;

  return <GhostFingerCue reducedMotion={prefersReducedMotion} />;
}

function CardStack(props: CardStackProps) {
  const {
    isCompact,
    visibleRecords,
    activeSlug,
    prefersReducedMotion,
    direction,
    showGestureHint,
    total,
    dragRotationRef,
    handleDragEnd,
  } = props;

  return (
    <>
      <div
        data-testid="crate-stack"
        data-viewport={isCompact ? "compact" : "wide"}
        className={`relative z-10 flex items-center justify-center select-none ${
          isCompact
            ? "min-h-[min(72svh,360px)] pt-3 pb-8"
            : "min-h-[390px] md:min-h-[470px] py-5 sm:py-7"
        }`}
        style={{ touchAction: "none", overscrollBehavior: "contain" }}
      >
        <div
          className="relative"
          style={{
            width: isCompact ? "min(80vw, 340px, 54svh)" : "min(82vw, 400px)",
            height: isCompact ? "min(80vw, 340px, 54svh)" : "min(82vw, 400px)",
          }}
        >
          <HintCardStack visibleRecords={visibleRecords} prefersReducedMotion={prefersReducedMotion} />

          <AnimatePresence initial={!prefersReducedMotion} custom={direction.current}>
            {visibleRecords
              .filter((s) => s.isActive)
              .map((slot) => (
                <ActiveRecordCard
                  key={`active-${slot.record.id}`}
                  slot={slot}
                  isCompact={isCompact}
                  activeSlug={activeSlug}
                  prefersReducedMotion={prefersReducedMotion}
                  direction={direction}
                  dragRotationRef={dragRotationRef}
                  handleDragEnd={handleDragEnd}
                />
              ))}
          </AnimatePresence>

          <GestureHintOverlay
            isCompact={isCompact}
            showGestureHint={showGestureHint}
            total={total}
            prefersReducedMotion={prefersReducedMotion}
          />
        </div>
      </div>
    </>
  );
}

interface CrateProgressProps {
  index: number;
  total: number;
  progress: number;
  edgeStatus: string | null;
  isCompact: boolean;
  prefersReducedMotion: boolean;
  navigate: (dir: RiffleDirection) => void;
}

function CrateProgress({
  index,
  total,
  progress,
  edgeStatus,
  isCompact,
  prefersReducedMotion,
  navigate,
}: CrateProgressProps) {
  return (
    <>
      <div className={`w-full max-w-xs sm:max-w-sm mx-auto ${isCompact ? "mt-1 mb-3" : "mb-4"}`}>
        <div
          className={`flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-mc-text-dim select-none ${isCompact ? "mb-1" : "mb-1.5"}`}
        >
          <span>{RIFFLE_LANGUAGE.progressStart}</span>
          <span>{RIFFLE_LANGUAGE.progressEnd}</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={index + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label={RIFFLE_LANGUAGE.progress(index + 1, total)}
          className="h-1.5 bg-mc-bg-raised rounded-full overflow-hidden"
        >
          <motion.div
            className="h-full bg-mc-accent rounded-full"
            animate={{ width: `${progress}%` }}
            transition={prefersReducedMotion ? reducedMotionTransition : transitionCrate}
          />
        </div>
      </div>

      <div className={`flex items-center justify-center ${isCompact ? "gap-3" : "gap-4 sm:gap-6"}`}>
        <motion.button
          type="button"
          onClick={() => navigate("front")}
          disabled={index <= 0}
          whileTap={{ scale: SCALE_PRESS }}
          transition={springPress}
          className={`flex items-center justify-center rounded-full bg-mc-bg-raised text-mc-text disabled:opacity-20 disabled:cursor-not-allowed hover:bg-mc-bg-card transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg ${isCompact ? "h-12 w-12 text-lg" : "w-14 h-14 text-xl"}`}
          aria-label={RIFFLE_LANGUAGE.controls.front}
        >
          ↑
        </motion.button>

        <span
          className={`${isCompact ? "w-16 text-xs" : "w-20 text-sm"} text-mc-text-dim tabular-nums text-center select-none`}
          aria-label={RIFFLE_LANGUAGE.progress(index + 1, total)}
          aria-live="polite"
          aria-atomic="true"
        >
          {RIFFLE_LANGUAGE.count(index + 1, total)}
        </span>

        <motion.button
          type="button"
          onClick={() => navigate("deeper")}
          disabled={index >= total - 1}
          whileTap={{ scale: SCALE_PRESS }}
          transition={springPress}
          className={`flex items-center justify-center rounded-full bg-mc-bg-raised text-mc-text disabled:opacity-20 disabled:cursor-not-allowed hover:bg-mc-bg-card transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg ${isCompact ? "h-12 w-12 text-lg" : "w-14 h-14 text-xl"}`}
          aria-label={RIFFLE_LANGUAGE.controls.deeper}
        >
          ↓
        </motion.button>
      </div>

      {edgeStatus && (
        <p className="mt-2 text-center text-[11px] text-mc-text-dim" aria-live="polite">
          {edgeStatus}
        </p>
      )}
    </>
  );
}

// ── Main component ────────────────────────────────────────────

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

  const header = (
    <CrateHeader
      isCompact={isCompact}
      onBack={onBack}
      crates={crates}
      activeSlug={activeSlug}
      activeCrate={activeCrate}
      total={total}
      hideTabs={hideTabs}
      compactHeaderOwnedByLayout={compactHeaderOwnedByLayout}
      onSelectCrate={onSelectCrate}
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
            <ScoreBreakdown listing={activeRecord} />
          </div>
        )}
      </div>
    </div>
  );
}
