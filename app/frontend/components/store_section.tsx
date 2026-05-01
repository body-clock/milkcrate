import React from "react"
import { motion } from "framer-motion"
import type { Crate } from "../types/inertia"

interface Props {
  crate: Crate
  featured?: boolean
  onSelect: (slug: string, startIndex?: number) => void
}

export default function StoreSection({ crate, featured = false, onSelect }: Props) {
  const cardSize = featured
    ? "w-[44vw] h-[44vw] sm:w-44 sm:h-44"
    : "w-[30vw] h-[30vw] sm:w-28 sm:h-28"

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => onSelect(crate.slug)}
        className="w-full text-left cursor-pointer"
        aria-label={`Open ${crate.name}`}
      >
        <div className="mc-section-header">
          <span className="mc-section-name">{crate.name}</span>
          <span className="mc-section-count">{crate.count} records</span>
        </div>
      </button>
      <div className="-mx-4 flex gap-2 overflow-x-auto pl-4 pt-2 pb-3" style={{ scrollbarWidth: "none" }}>
        {crate.records.slice(0, 10).map((record, i) => {
          const src = record.cover_image_url ?? record.thumbnail_url
          return (
            <motion.button
              key={record.id}
              type="button"
              className={`flex-shrink-0 ${cardSize} flex flex-col cursor-pointer`}
              whileHover={{ scale: 1.04, zIndex: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              onClick={() => onSelect(crate.slug, i)}
              aria-label={`Open ${crate.name} at ${record.title ?? "record"}`}
            >
              <div className="w-full flex-1 rounded bg-mc-bg-raised overflow-hidden border border-mc-border">
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
              </div>
              {featured && (
                <div className="mt-1 px-0.5 text-left">
                  <p className="text-[10px] mc-text font-medium truncate leading-tight">{record.artist}</p>
                  <p className="text-[10px] text-mc-text-dim truncate leading-tight">{record.title}</p>
                </div>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
