import React from "react"
import { motion } from "framer-motion"
import type { Crate } from "../types/inertia"

interface Props {
  crate: Crate
  onSelect: (slug: string, startIndex?: number) => void
}

export default function StoreSection({ crate, onSelect }: Props) {
  return (
    <div className="w-full group">
      <button
        onClick={() => onSelect(crate.slug)}
        className="w-full text-left cursor-pointer"
      >
        <div className="mc-section-header">
          <span className="mc-section-name">{crate.name}</span>
          <span className="mc-section-count">{crate.count} records</span>
          <span className="mc-section-count group-hover:text-mc-accent">See more</span>
        </div>
      </button>
      <div className="flex gap-2 overflow-x-auto px-2 pt-2 pb-3" style={{ scrollbarWidth: "none" }}>
        {crate.records.slice(0, 10).map((record, i) => {
          const src = record.cover_image_url ?? record.thumbnail_url
          return (
            <motion.div
              key={record.id}
              className="flex-shrink-0 w-[38vw] h-[38vw] sm:w-36 sm:h-36 rounded bg-mc-bg-raised overflow-hidden border border-mc-border cursor-pointer"
              whileHover={{ scale: 1.04, zIndex: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              onClick={() => onSelect(crate.slug, i)}
            >
              {src ? (
                <img
                  src={src}
                  alt={record.title ?? ""}
                  className="w-full h-full object-cover"
                  draggable={false}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center mc-dim text-2xl">♪</div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
