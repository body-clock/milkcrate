import React, { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import CrateTabs from "./crate_tabs"
import RecordCard from "./record_card"
import { buildCrateWindow } from "../lib/crate_window"
import {
  RIFFLE_LANGUAGE,
  riffleActiveCardMotion,
  resolveRiffleDrag,
  resolveRiffleMove,
  type RiffleDirection,
} from "../lib/riffle_navigation"
import { useViewport } from "@/hooks/use_viewport"
import { usePileContext } from "@/contexts/pile_context"
import { SCALE_PRESS, springPress, transitionCrate, reducedMotionTransition } from "@/lib/motion_tokens"
import { useReducedMotionContext } from "./storefront_motion_config"
import type { Crate, Listing } from "../types/inertia"

interface Props {
  crates: Crate[]
  activeSlug: string
  startIndex?: number
  hideTabs?: boolean
  onSelectCrate: (slug: string, startIndex?: number) => void
  onBack?: () => void
}

const ROTATION_FACTOR = 8 / 120 // maps 120px drag to 8deg rotation
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

function RecordDetails({ listing, direction }: { listing: Listing; direction: RiffleDirection }) {
  const meta = [listing.format, listing.label, listing.year, listing.condition].filter(Boolean).join(" · ")
  const enterY = direction === "deeper" ? -16 : 16
  const exitY = direction === "deeper" ? 16 : -16
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


function preloadImage(url: string, priority: "high" | "low" = "high", signal?: AbortSignal) {
  if (priority === "high") {
    const img = new Image()
    img.decoding = "async"
    img.src = url
  } else {
    // Idle priority — use requestIdleCallback with setTimeout(0) fallback
    const schedule = typeof requestIdleCallback === "function"
      ? requestIdleCallback
      : (cb: IdleRequestCallback) => setTimeout(cb, 0)
    const deferred = () => {
      if (signal?.aborted) return
      const img = new Image()
      img.decoding = "async"
      img.src = url
    }
    schedule(deferred, { timeout: 2000 })
  }
}

function usePreload(records: { id: number; cover_image_url?: string | null; thumbnail_url?: string | null }[], index: number) {
  useEffect(() => {
    const abort = new AbortController()

    for (let offset = -3; offset <= 3; offset++) {
      if (offset === 0) continue

      const r = records[index + offset]
      if (!r) continue

      const absOffset = Math.abs(offset)

      if (absOffset <= 1) {
        // Adjacent slots: preload full-res cover (cache-warming for the decode gate)
        if (r.cover_image_url) preloadImage(r.cover_image_url, "high")
      } else {
        // Edge slots: preload thumbnail only (full-res at idle priority)
        if (r.thumbnail_url) {
          preloadImage(r.thumbnail_url, "high")
        }
        if (r.cover_image_url) {
          preloadImage(r.cover_image_url, "low", abort.signal)
        }
      }
    }

    return () => abort.abort()
  }, [records, index])
}

export default function CrateView({ crates, activeSlug, startIndex = 0, hideTabs = false, onSelectCrate, onBack }: Props) {
  const { isCompact } = useViewport()
  const activeCrate = crates.find((c) => c.slug === activeSlug) ?? crates[0]
  const records = activeCrate?.records ?? []
  const total = records.length
  const [index, setIndex] = useState(startIndex)
  const [showGestureHint, setShowGestureHint] = useState(true)
  const [edgeStatus, setEdgeStatus] = useState<string | null>(null)
  const direction = useRef<RiffleDirection>("deeper")
  const indexRef = useRef(index)
  const prefersReducedMotion = useReducedMotionContext()
  const dragRotationRef = useRef<HTMLDivElement>(null)

  // Keep indexRef in sync so navigate callback reads the latest index
  // even before React re-renders (critical for rapid keyboard navigation)
  indexRef.current = index

  useEffect(() => {
    setIndex(startIndex)
    setShowGestureHint(true)
    setEdgeStatus(null)
  }, [activeSlug, startIndex])

  const navigate = useCallback((riffleDirection: RiffleDirection) => {
    const move = resolveRiffleMove({
      currentIndex: indexRef.current,
      total,
      direction: riffleDirection,
    })

    if (!move.moved) {
      setEdgeStatus(RIFFLE_LANGUAGE.edgeStatus[riffleDirection])
      return
    }

    direction.current = riffleDirection
    indexRef.current = move.nextIndex
    setIndex(move.nextIndex)
    setShowGestureHint(false)
    setEdgeStatus(null)
  }, [total])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "ArrowDown") navigate("deeper")
    if (e.key === "ArrowUp") navigate("front")
  }, [navigate])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  const progress = total > 0 ? ((index + 1) / total) * 100 : 0
  const activeRecord = records[index]

  const crateHeader = (
    <div className={isCompact ? "mb-3" : "mb-4"}>
      {isCompact ? (
        <>
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
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 border-b border-mc-border pb-2 mb-3">
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
      )}
    </div>
  )

  usePreload(records, index)
  const visibleRecords = useMemo(
    () => buildCrateWindow(records, index, WINDOW_RADIUS),
    [records, index],
  )

  const handleDragEnd = useCallback((
    info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }
  ) => {
    const riffleDirection = resolveRiffleDrag({
      offsetX: info.offset.x,
      offsetY: info.offset.y,
      velocityY: info.velocity.y,
    })

    if (riffleDirection) navigate(riffleDirection)
  }, [navigate])

  if (!activeCrate || total === 0) {
    return (
      <div>
        {crateHeader}
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
          {/* Hint cards as plain divs with CSS transitions (compositor thread, no JS cost) */}
          {visibleRecords.filter((s) => !s.isActive).map((slot) => {
            const depth = Math.abs(slot.offset)
            const hintUrl = slot.record.thumbnail_url ?? slot.record.cover_image_url
            const baseX = slot.offset * 16
            const baseY = depth * 12
            const baseRotate = slot.offset * -4
            const scale = 1 - depth * 0.045

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
                    ? 'transform 0.01s ease-out, opacity 0.01s ease-out'
                    : 'transform 0.2s ease-out, opacity 0.2s ease-out',
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
                  <div className="w-full h-full flex items-center justify-center text-mc-text-dim text-5xl">♪</div>
                )}
                <div className="absolute inset-0 bg-mc-bg/35" />
              </div>
            )
          })}

          {/* Active card entry + exit animation via AnimatePresence */}
          <AnimatePresence
            initial={!prefersReducedMotion}
            custom={direction.current}
          >
            {visibleRecords.filter((s) => s.isActive).map((slot) => (
              <motion.div
                key={`active-${slot.record.id}`}
                custom={direction.current}
                variants={{
                  initial: (d: RiffleDirection) => (
                    riffleActiveCardMotion(d, prefersReducedMotion).initial
                  ),
                  animate: { opacity: 1, y: 0, rotate: 0, scale: 1 },
                  exit: (d: RiffleDirection) => (
                    riffleActiveCardMotion(d, prefersReducedMotion).exit
                  ),
                }}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={prefersReducedMotion ? reducedMotionTransition : transitionCrate}
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
                    rotate: 'var(--drag-rotate, 0deg)',
                  }}
                  drag
                  dragConstraints={{ left: 0, right: 0, top: -180, bottom: 180 }}
                  dragElastic={0.28}
                  dragMomentum={false}
                  dragSnapToOrigin
                  whileDrag={prefersReducedMotion ? undefined : { scale: 0.985 }}
                  onDrag={(_, info) => {
                    dragRotationRef.current?.style.setProperty('--drag-rotate', `${info.offset.x * ROTATION_FACTOR}deg`)
                  }}
                  onDragEnd={(_e, info) => {
                    dragRotationRef.current?.style.setProperty('--drag-rotate', '0deg')
                    handleDragEnd(info)
                  }}
                >
                  {/* Thumbnail backdrop — visible while full-res loads */}
                  {slot.record.thumbnail_url && (
                    <div className="absolute inset-0 rounded-lg overflow-hidden z-0 pointer-events-none">
                      <img
                        src={slot.record.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover saturate-75"
                        style={{ filter: 'blur(8px)' }}
                        draggable={false}
                        onError={(e) => {
                          // Hide backdrop on image load failure to avoid broken-image artifact
                          ;(e.currentTarget as HTMLElement).style.display = 'none'
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
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Progress bar */}
      <div className={`w-full max-w-xs sm:max-w-sm mx-auto ${isCompact ? "mt-1 mb-3" : "mb-4"}`}>
        <div className={`flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-mc-text-dim select-none ${isCompact ? "mb-1" : "mb-1.5"}`}>
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

      {/* Paginator */}
      <div className={`flex items-center justify-center ${isCompact ? "gap-3" : "gap-4 sm:gap-6"}`}>
        <motion.button
          type="button"
          onClick={() => navigate("front")}
          disabled={index <= 0}
          whileTap={{ scale: SCALE_PRESS }}
          transition={springPress}
          className={`flex items-center justify-center rounded-full bg-mc-bg-raised text-mc-text disabled:opacity-20 disabled:cursor-not-allowed hover:bg-mc-bg-card transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg ${isCompact ? "h-12 w-12 text-lg" : "w-14 h-14 text-xl"}`}
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
          className={`flex items-center justify-center rounded-full bg-mc-bg-raised text-mc-text disabled:opacity-20 disabled:cursor-not-allowed hover:bg-mc-bg-card transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg ${isCompact ? "h-12 w-12 text-lg" : "w-14 h-14 text-xl"}`}
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

      {isCompact && showGestureHint && (
        <p className="text-center text-[11px] text-mc-text-dim mt-2 select-none" aria-live="polite">
          {RIFFLE_LANGUAGE.guidance}
        </p>
      )}
    </>
  )

  return (
    <div className="flex flex-col">
      {crateHeader}

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
