import React, { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { motion, AnimatePresence, useMotionValue, useReducedMotion, useTransform } from "framer-motion"
import CrateTabs from "./crate_tabs"
import RecordCard from "./record_card"
import ToggleView from "./toggle_view"
import { buildCrateWindow } from "../lib/crate_window"
import type { Crate } from "../types/inertia"

interface Props {
  crates: Crate[]
  activeSlug: string
  onSelectCrate: (slug: string) => void
  mode: "crate" | "store"
  onToggleMode: () => void
}

const ease = { duration: 0.2, ease: "easeOut" as const }
const reducedEase = { duration: 0.16, ease: "easeOut" as const }
const DRAG_THRESHOLD = 72
const WINDOW_RADIUS = 2

function usePreload(records: { id: number; cover_image_url?: string | null }[], index: number) {
  useEffect(() => {
    for (let offset = 1; offset <= 3; offset++) {
      const r = records[index + offset]
      if (r?.cover_image_url) {
        const img = new Image()
        img.src = r.cover_image_url
      }
    }
  }, [records, index])
}

export default function CrateView({ crates, activeSlug, onSelectCrate, mode, onToggleMode }: Props) {
  const activeCrate = crates.find((c) => c.slug === activeSlug) ?? crates[0]
  const records = activeCrate?.records ?? []
  const total = records.length
  const [index, setIndex] = useState(0)
  const direction = useRef(0)
  const prefersReducedMotion = useReducedMotion()
  const dragX = useMotionValue(0)
  const dragY = useMotionValue(0)
  const activeRotate = useTransform(dragX, [-120, 0, 120], [-8, 0, 8])

  useEffect(() => { setIndex(0) }, [activeSlug])

  const navigate = useCallback((delta: number) => {
    const next = index + delta
    if (next < 0 || next >= total) return
    direction.current = delta
    setIndex(next)
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

  usePreload(records, index)
  const visibleRecords = useMemo(
    () => buildCrateWindow(records, index, WINDOW_RADIUS),
    [records, index],
  )

  const handleDragEnd = useCallback((_: any, info: { offset: { x: number; y: number } }) => {
    const dominantOffset = Math.abs(info.offset.x) > Math.abs(info.offset.y)
      ? info.offset.x
      : info.offset.y

    dragX.set(0)
    dragY.set(0)

    if (dominantOffset > DRAG_THRESHOLD) navigate(1)
    else if (dominantOffset < -DRAG_THRESHOLD) navigate(-1)
  }, [dragX, dragY, navigate])

  if (!activeCrate || total === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <CrateTabs crates={crates} activeSlug={activeSlug} onSelect={onSelectCrate} />
          <ToggleView mode={mode} onToggle={onToggleMode} />
        </div>
        <div className="py-16 text-center mc-dim text-sm">No records in this crate yet.</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Top bar: crate tabs + store toggle */}
      <div className="flex items-center justify-between mb-4">
        <CrateTabs crates={crates} activeSlug={activeSlug} onSelect={onSelectCrate} />
        <div className="ml-2 shrink-0">
          <ToggleView mode={mode} onToggle={onToggleMode} />
        </div>
      </div>

      {/* Front-riffle crate stack */}
      <div className="flex items-center justify-center min-h-[390px] md:min-h-[470px] py-5 sm:py-7 select-none overflow-hidden">
        <div
          className="relative"
          style={{
            width: "min(82vw, 320px)",
            height: "min(82vw, 320px)",
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
                    initial={prefersReducedMotion ? false : { opacity: 0, y: baseY + 24 }}
                    animate={{
                      opacity: 0.38,
                      x: baseX,
                      y: baseY,
                      rotate: baseRotate,
                      scale,
                    }}
                    exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: baseY + 18 }}
                    transition={prefersReducedMotion ? { duration: 0 } : ease}
                    style={{ zIndex: 10 - depth }}
                  >
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt=""
                        className="w-full h-full object-cover saturate-75"
                        loading="lazy"
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
                        ? { opacity: 0, y: d >= 0 ? -20 : 20 }
                        : d >= 0
                          ? { opacity: 0, y: -78, rotate: -3 }
                          : { opacity: 0, y: 78, rotate: 3 }
                    ),
                    animate: { opacity: 1, y: 0, rotate: 0 },
                    exit: (d: number) => (
                      prefersReducedMotion
                        ? { opacity: 0, y: d >= 0 ? 20 : -20 }
                        : d >= 0
                          ? { opacity: 0, y: 66, rotate: 4 }
                          : { opacity: 0, y: -66, rotate: -4 }
                    ),
                  }}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={prefersReducedMotion ? reducedEase : ease}
                  className="absolute inset-0"
                  style={{ zIndex: 30 }}
                >
                  <motion.div
                    className="w-full h-full rounded-lg overflow-hidden border border-mc-border shadow-2xl"
                    style={{
                      x: dragX,
                      y: dragY,
                      rotate: activeRotate,
                      touchAction: "none",
                    }}
                    drag
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    dragElastic={0.28}
                    dragMomentum={false}
                    whileDrag={prefersReducedMotion ? undefined : { scale: 0.985 }}
                    onDragEnd={handleDragEnd}
                  >
                    <RecordCard
                      listing={slot.record}
                      resetKey={`${activeSlug}-${slot.record.id}`}
                      className="rounded-lg"
                    />
                  </motion.div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Crate position */}
      <div className="w-full max-w-xs sm:max-w-sm mx-auto mb-4">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-mc-text-dim mb-1.5 select-none">
          <span>front of crate</span>
          <span>back</span>
        </div>
        <div className="h-1.5 bg-mc-bg-raised rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-mc-accent rounded-full"
            animate={{ width: `${progress}%` }}
            transition={prefersReducedMotion ? { duration: 0 } : ease}
          />
        </div>
      </div>

      {/* Paginator */}
      <div className="flex items-center justify-center gap-4 sm:gap-6">
        <motion.button
          onClick={() => navigate(-1)}
          disabled={index <= 0}
          whileTap={{ scale: 0.92 }}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-mc-bg-raised text-mc-text text-xl disabled:opacity-20 disabled:cursor-not-allowed hover:bg-mc-bg-card transition-colors select-none"
        >
          ↑
        </motion.button>

        <span className="text-sm text-mc-text-dim tabular-nums w-20 text-center select-none">
          {index + 1} of {total}
        </span>

        <motion.button
          onClick={() => navigate(1)}
          disabled={index >= total - 1}
          whileTap={{ scale: 0.92 }}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-mc-bg-raised text-mc-text text-xl disabled:opacity-20 disabled:cursor-not-allowed hover:bg-mc-bg-card transition-colors select-none"
        >
          ↓
        </motion.button>
      </div>

      <p className="text-center text-[10px] text-mc-text-dim mt-4 select-none">
        pull forward for next &middot; push back for previous &middot; tap for details
      </p>
    </div>
  )
}
