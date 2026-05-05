import { motion } from "framer-motion"
import type { Crate } from "../types/inertia"

interface Props {
  crate: Crate
  variant: "featured" | "genre"
  onSelectCrate: (slug: string, startIndex?: number) => void
}

export default function CrateCard({ crate, variant, onSelectCrate }: Props) {
  const isFeatured = variant === "featured"
  const heightClass = isFeatured ? "h-72 sm:h-80" : "h-56"
  const thumbCount = isFeatured ? 4 : 4
  const gridCols = "grid-cols-2"
  const nameClass = isFeatured ? "text-base font-semibold" : "text-sm font-semibold"

  if (crate.records.length === 0) {
    return (
      <div className={`flex flex-col ${heightClass} rounded-lg bg-mc-bg-card border border-mc-border overflow-hidden`}>
        <div className="px-3 pt-3 pb-2">
          <div className="mc-section-header">
            <span className={`mc-section-name ${nameClass}`}>{crate.name}</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center mc-dim text-xs px-3 pb-3">
          No records yet
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelectCrate(crate.slug)}
      className={`flex flex-col ${heightClass} w-full rounded-lg bg-mc-bg-card border border-mc-border overflow-hidden hover:border-mc-accent transition-colors cursor-pointer text-left`}
      aria-label={`Open ${crate.name}`}
    >
      <div className="px-3 pt-3 pb-2">
        <div className="mc-section-header">
          <span className={`mc-section-name ${nameClass}`}>{crate.name}</span>
          <span className="mc-section-count text-xs">{crate.count}</span>
        </div>
      </div>

      <div className={`grid ${gridCols} gap-2 px-3 pb-3 flex-1 min-h-0`}>
        {crate.records.slice(0, thumbCount).map((record, i) => {
          const src = record.cover_image_url ?? record.thumbnail_url
          return (
            <motion.button
              key={record.id}
              type="button"
              className="rounded bg-mc-bg-raised overflow-hidden border border-mc-border cursor-pointer w-full h-full"
              whileHover={{ scale: 1.05, zIndex: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              onClick={(e) => {
                e.stopPropagation()
                onSelectCrate(crate.slug, i)
              }}
              aria-label={`Open ${crate.name} at ${record.title ?? "record"}`}
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
                <div className="w-full h-full flex items-center justify-center mc-dim text-lg">♪</div>
              )}
            </motion.button>
          )
        })}
      </div>
    </button>
  )
}
