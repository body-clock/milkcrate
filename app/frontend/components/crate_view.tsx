import React, { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { motion, AnimatePresence, useMotionValue, useReducedMotion, useTransform } from "framer-motion"
import CrateTabs from "./crate_tabs"
import RecordCard from "./record_card"
import { buildCrateWindow } from "../lib/crate_window"
import { useViewport } from "@/hooks/use_viewport"
import { usePileContext } from "@/contexts/pile_context"
import { SCALE_PRESS, springPress } from "@/lib/motion_tokens"
import type { Crate, Listing } from "../types/inertia"

interface Props {
  crates: Crate[]
  activeSlug: string
  startIndex?: number
  hideTabs?: boolean
  onSelectCrate: (slug: string, startIndex?: number) => void
  onBack?: () => void
}

const ease = { duration: 0.2, ease: "easeOut" as const }
const reducedEase = { duration: 0.16, ease: "easeOut" as const }
const reducedCardEase = { duration: 0.24, ease: "easeOut" as const }
const DRAG_THRESHOLD = 72
const WINDOW_RADIUS = 2
const compositedLayerStyle: React.CSSProperties = {
  willChange: "transform, opacity",
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
  contain: "layout paint style",
}
const activeLayerStyle: React.CSSProperties = {
  willChange: "transform, opacity",
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
}

function RecordDetails({ listing, direction }: { listing: Listing; direction: number }) {
  const meta = [listing.format, listing.label, listing.year, listing.condition].filter(Boolean).join(" · ")
  const enterY = direction >= 0 ? -16 : 16
  const exitY = direction >= 0 ? 16 : -16
  const { inPile, addToPile, removeFromPile } = usePileContext()

  const currencySymbol = listing.currency === "GBP" ? "£" : listing.currency === "EUR" ? "€" : "$"

  const allTags = [
    ...listing.genres.slice(0, 4).map((g) => ({ label: g, dim: false })),
    ...listing.styles.slice(0, 4).map((s) => ({ label: s, dim: true })),
  ]

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={listing.id}
        custom={direction}
        initial={{ opacity: 0, y: enterY }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: exitY }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="flex flex-col gap-4"
      >
        {/* Header: info + price/actions in two-column row */}
        <div className="grid grid-cols-[1fr_auto] gap-x-6 items-start">
          <div>
            <div className="text-xl font-semibold leading-tight">{listing.title}</div>
            <div className="text-sm text-mc-text-dim mt-1">{listing.artist}</div>
            {meta && <div className="text-xs text-mc-text-dim mt-2">{meta}</div>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-2xl font-medium whitespace-nowrap">
              {listing.display_price ?? (listing.price ? `${currencySymbol}${parseFloat(listing.price).toFixed(2)}` : "—")}
            </span>
            <div className="flex gap-2">
              {inPile(listing.id) ? (
                <button onClick={() => removeFromPile(listing.id)} className="mc-btn">✓ In pile</button>
              ) : (
                <button onClick={() => addToPile(listing)} className="mc-btn mc-btn-primary">+ Pile</button>
              )}
              <a href={listing.discogs_url} target="_blank" rel="noopener" className="mc-btn">Discogs ↗</a>
            </div>
          </div>
        </div>

        {/* Combined genre + style pills */}
        {allTags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {allTags.map((tag) => (
              <span
                key={tag.label}
                className={`text-[11px] px-2 py-0.5 rounded bg-mc-bg-raised ${
                  tag.dim ? "text-mc-text-dim/70" : "text-mc-text-dim"
                }`}
              >
                {tag.label}
              </span>
            ))}
          </div>
        )}

        {listing.notes && (
          <p className="text-xs text-mc-text-dim leading-relaxed line-clamp-4">{listing.notes}</p>
        )}
      </motion.div>
    </AnimatePresence>
  )
}


function usePreload(records: { id: number; cover_image_url?: string | null }[], index: number) {
  useEffect(() => {
    for (let offset = -3; offset <= 3; offset++) {
      if (offset === 0) continue

      const r = records[index + offset]
      if (r?.cover_image_url) {
        const img = new Image()
        img.decoding = "async"
        img.src = r.cover_image_url
      }
    }
  }, [records, index])
}

export default function CrateView({ crates, activeSlug, startIndex = 0, hideTabs = false, onSelectCrate, onBack }: Props) {
  const { isCompact } = useViewport()
  const activeCrate = crates.find((c) => c.slug === activeSlug) ?? crates[0]
  const records = activeCrate?.records ?? []
  const total = records.length
  const [index, setIndex] = useState(startIndex)
  const [showGestureHint, setShowGestureHint] = useState(true)
  const direction = useRef(0)
  const prefersReducedMotion = useReducedMotion()
  const dragX = useMotionValue(0)
  const activeRotate = useTransform(dragX, [-120, 0, 120], [-8, 0, 8])

  useEffect(() => {
    setIndex(startIndex)
    setShowGestureHint(true)
  }, [activeSlug, startIndex])

  const navigate = useCallback((delta: number) => {
    const next = index + delta
    if (next < 0 || next >= total) return
    direction.current = delta
    setIndex(next)
    setShowGestureHint(false)
  }, [index, total])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "ArrowDown") navigate(1)
    if (e.key === "ArrowUp") navigate(-1)
  }, [navigate])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  const progress = total > 0 ? ((index + 1) / total) * 100 : 0
  const activeRecord = records[index]

  const compactHeader = isCompact ? (
    <div className="mb-3">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-mc-border bg-mc-bg-raised text-lg leading-none text-mc-text-dim transition-[color,border-color,transform] hover:border-mc-accent hover:text-mc-accent active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
            aria-label="Back to store"
          >
            <span aria-hidden="true" className="-translate-y-px">←</span>
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold leading-tight">{activeCrate?.name}</h1>
          <div className="text-[11px] uppercase tracking-[0.12em] text-mc-text-dim">
            {total === 1 ? "1 record" : `${total} records`}
          </div>
        </div>
      </div>
      {!hideTabs && (
        <div className="mt-2 -mx-1">
          <CrateTabs crates={crates} activeSlug={activeSlug} onSelect={onSelectCrate} compact />
        </div>
      )}
    </div>
  ) : null

  usePreload(records, index)
  const visibleRecords = useMemo(
    () => buildCrateWindow(records, index, WINDOW_RADIUS),
    [records, index],
  )

  const handleDragEnd = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number; y: number } }) => {
    const dominantOffset = Math.abs(info.offset.x) > Math.abs(info.offset.y)
      ? info.offset.x
      : info.offset.y

    if (dominantOffset > DRAG_THRESHOLD) navigate(1)
    else if (dominantOffset < -DRAG_THRESHOLD) navigate(-1)

    dragX.set(0)
  }, [dragX, navigate])

  const desktopToolbar = onBack || !hideTabs ? (
    <div className="flex items-center gap-3 mb-4 border-b border-mc-border py-2">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-mc-text-dim bg-mc-bg-raised border border-mc-border rounded-lg hover:border-mc-accent hover:text-mc-accent transition-colors whitespace-nowrap py-1.5 px-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
          aria-label="Back to store"
        >
          ← Store
        </button>
      )}
      {onBack && !hideTabs && <div className="w-px self-stretch bg-mc-border" />}
      {!hideTabs && (
        <div className="min-w-0 flex-1">
          <CrateTabs crates={crates} activeSlug={activeSlug} onSelect={onSelectCrate} />
        </div>
      )}
    </div>
  ) : null

  if (!activeCrate || total === 0) {
    return (
      <div>
        {isCompact ? compactHeader : desktopToolbar}
        <div className="py-16 text-center mc-dim text-sm">No records in this crate yet.</div>
      </div>
    )
  }

  const cardStack = (
    <>
      {/* Front-riffle crate stack */}
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
          <AnimatePresence initial={!prefersReducedMotion} custom={direction.current}>
            {visibleRecords.map((slot) => {
              const depth = Math.abs(slot.offset)
              const coverUrl = slot.record.cover_image_url ?? slot.record.thumbnail_url
              const baseX = slot.offset * 16
              const baseY = depth * 12
              const baseRotate = slot.offset * -4
              const scale = 1 - depth * 0.045

              if (!slot.isActive) {
                return (
                  <motion.div
                    key={`hint-${slot.record.id}`}
                    aria-hidden="true"
                    className="absolute inset-0 rounded-lg overflow-hidden border border-mc-border bg-mc-bg-raised shadow-lg pointer-events-none"
                    initial={prefersReducedMotion ? { opacity: 0, y: baseY + 10 } : { opacity: 0, y: baseY + 24 }}
                    animate={{
                      opacity: 0.38,
                      x: baseX,
                      y: baseY,
                      rotate: baseRotate,
                      scale,
                    }}
                    exit={prefersReducedMotion ? { opacity: 0, y: baseY + 10 } : { opacity: 0, y: baseY + 18 }}
                    transition={prefersReducedMotion ? reducedEase : ease}
                    style={{ ...compositedLayerStyle, zIndex: 10 - depth }}
                  >
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt=""
                        className="w-full h-full object-cover saturate-75"
                        draggable={false}
                        loading="eager"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-mc-text-dim text-5xl">♪</div>
                    )}
                    <div className="absolute inset-0 bg-mc-bg/35" />
                  </motion.div>
                )
              }

              return (
                <motion.div
                  key={`active-${slot.record.id}`}
                  custom={direction.current}
                  variants={{
                    initial: (d: number) => (
                      prefersReducedMotion
                        ? { opacity: 0, y: d >= 0 ? -42 : 42, scale: 0.98 }
                        : d >= 0
                          ? { opacity: 0, y: -78, rotate: -3 }
                          : { opacity: 0, y: 78, rotate: 3 }
                    ),
                    animate: { opacity: 1, y: 0, rotate: 0, scale: 1 },
                    exit: (d: number) => (
                      prefersReducedMotion
                        ? { opacity: 0, y: d >= 0 ? 54 : -54, scale: 0.96 }
                        : d >= 0
                          ? { opacity: 0, y: 66, rotate: 4 }
                          : { opacity: 0, y: -66, rotate: -4 }
                    ),
                  }}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={prefersReducedMotion ? reducedCardEase : ease}
                  className="absolute inset-0"
                  style={{ ...activeLayerStyle, zIndex: 30 }}
                >
                  <motion.div
                    className="w-full h-full"
                    style={{
                      rotate: activeRotate,
                      touchAction: "none",
                      willChange: "transform",
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                    }}
                    drag
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    dragElastic={0.28}
                    dragMomentum={false}
                    whileDrag={prefersReducedMotion ? undefined : { scale: 0.985 }}
                    onDrag={(_, info) => dragX.set(info.offset.x)}
                    onDragEnd={handleDragEnd}
                  >
                    <RecordCard
                      listing={slot.record}
                      resetKey={`${activeSlug}-${slot.record.id}`}
                      className="rounded-lg"
                      imageLoading="eager"
                      disableFlip={!isCompact}
                      framed
                    />
                  </motion.div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Progress bar */}
      <div className={`w-full max-w-xs sm:max-w-sm mx-auto ${isCompact ? "mt-1 mb-3" : "mb-4"}`}>
        <div className={`flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-mc-text-dim select-none ${isCompact ? "mb-1" : "mb-1.5"}`}>
          <span>front of crate</span>
          <span>back</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={index + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label={`Record ${index + 1} of ${total}`}
          className="h-1.5 bg-mc-bg-raised rounded-full overflow-hidden"
        >
          <motion.div
            className="h-full bg-mc-accent rounded-full"
            animate={{ width: `${progress}%` }}
            transition={prefersReducedMotion ? reducedEase : ease}
          />
        </div>
      </div>

      {/* Paginator */}
      <div className={`flex items-center justify-center ${isCompact ? "gap-3" : "gap-4 sm:gap-6"}`}>
        <motion.button
          type="button"
          onClick={() => navigate(-1)}
          disabled={index <= 0}
          whileTap={{ scale: SCALE_PRESS }}
          transition={springPress}
          className={`flex items-center justify-center rounded-full bg-mc-bg-raised text-mc-text disabled:opacity-20 disabled:cursor-not-allowed hover:bg-mc-bg-card transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg ${isCompact ? "h-12 w-12 text-lg" : "w-14 h-14 text-xl"}`}
          aria-label="Previous record"
        >
          ↑
        </motion.button>

        <span className={`${isCompact ? "w-16 text-xs" : "w-20 text-sm"} text-mc-text-dim tabular-nums text-center select-none`} aria-live="polite" aria-atomic="true">
          {index + 1} of {total}
        </span>

        <motion.button
          type="button"
          onClick={() => navigate(1)}
          disabled={index >= total - 1}
          whileTap={{ scale: SCALE_PRESS }}
          transition={springPress}
          className={`flex items-center justify-center rounded-full bg-mc-bg-raised text-mc-text disabled:opacity-20 disabled:cursor-not-allowed hover:bg-mc-bg-card transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg ${isCompact ? "h-12 w-12 text-lg" : "w-14 h-14 text-xl"}`}
          aria-label="Next record"
        >
          ↓
        </motion.button>
      </div>

      {isCompact && showGestureHint && (
        <p className="text-center text-[11px] text-mc-text-dim mt-2 select-none" aria-live="polite">
          Swipe or use arrows to browse · tap for details
        </p>
      )}
    </>
  )

  return (
    <div className="flex flex-col">
      {isCompact ? compactHeader : desktopToolbar}

      {/* Mobile: single column. Desktop: centered two-column */}
      <div className="md:mx-auto md:w-full md:grid md:grid-cols-[420px_1fr] md:gap-12 md:items-start">
        <div className="flex flex-col">
          {cardStack}
        </div>

        {/* Desktop details panel */}
        {activeRecord && (
          <div className="hidden md:flex md:flex-col md:pt-7">
            <RecordDetails listing={activeRecord} direction={direction.current} />
          </div>
        )}
      </div>
    </div>
  )
}
