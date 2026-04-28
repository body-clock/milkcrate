import React, { useState, useCallback, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import CrateTabs from "./crate_tabs"
import RecordCard from "./record_card"
import type { Crate } from "../types/inertia"

interface Props {
  crates: Crate[]
  activeSlug: string
  onSelectCrate: (slug: string) => void
  onToggleMode: () => void
}

const ease = { duration: 0.2, ease: "easeOut" }
const DRAG_THRESHOLD = 80

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

export default function CrateView({ crates, activeSlug, onSelectCrate, onToggleMode }: Props) {
  const activeCrate = crates.find((c) => c.slug === activeSlug) ?? crates[0]
  const records = activeCrate?.records ?? []
  const total = records.length
  const [index, setIndex] = useState(0)
  const direction = useRef(0)

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

  const handleDragEnd = useCallback((_: any, info: { offset: { y: number } }) => {
    if (info.offset.y > DRAG_THRESHOLD) navigate(1)
    else if (info.offset.y < -DRAG_THRESHOLD) navigate(-1)
  }, [navigate])

  if (!activeCrate || total === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <CrateTabs crates={crates} activeSlug={activeSlug} onSelect={onSelectCrate} />
          <button onClick={onToggleMode} className="text-xs border border-mc-border rounded px-2 py-1 cursor-pointer hover:border-mc-accent transition-colors">🏪 Store</button>
        </div>
        <div className="py-16 text-center mc-dim text-sm">No records in this crate yet.</div>
      </div>
    )
  }

  const progress = total > 0 ? ((index + 1) / total) * 100 : 0

  usePreload(records, index)

  return (
    <div className="flex flex-col">
      {/* Top bar: crate tabs + store toggle */}
      <div className="flex items-center justify-between mb-4">
        <CrateTabs crates={crates} activeSlug={activeSlug} onSelect={onSelectCrate} />
        <button onClick={onToggleMode} className="shrink-0 text-xs border border-mc-border rounded px-2 py-1 cursor-pointer hover:border-mc-accent transition-colors ml-2">
          🏪 Store
        </button>
      </div>

      {/* Record display — single card, no depth */}
      <div className="flex items-center justify-center min-h-[360px] md:min-h-[440px] py-4 sm:py-6 select-none">
        <div style={{ width: "min(85vw, 300px)", height: "min(85vw, 300px)" }}>
          <AnimatePresence mode="wait" custom={direction.current}>
            <motion.div
              key={records[index].id}
              custom={direction.current}
              variants={{
                initial: (d: number) => d >= 0 ? { opacity: 0, y: -80 } : { opacity: 0, y: 80 },
                animate: { opacity: 1, y: 0 },
                exit: (d: number) => d >= 0 ? { opacity: 0, y: 60 } : { opacity: 0 },
              }}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="rounded-lg overflow-hidden border border-mc-border"
              style={{
                width: "100%",
                height: "100%",
                touchAction: "none",
              }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.3}
              whileDrag={{ scale: 0.97, y: 0 }}
              onDragEnd={handleDragEnd}
            >
              <RecordCard listing={records[index]} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs sm:max-w-sm mx-auto mb-4">
        <div className="h-1.5 bg-mc-bg-raised rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-mc-accent rounded-full"
            animate={{ width: `${progress}%` }}
            transition={ease}
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
        pull down to flip forward &middot; push up to go back &middot; ↓↑ keys &middot; tap to flip
      </p>
    </div>
  )
}
