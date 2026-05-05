import { motion } from "framer-motion"
import type { Crate } from "../types/inertia"

interface Props {
  crate: Crate
  variant: "featured" | "genre"
  onSelectCrate: (slug: string, startIndex?: number) => void
}

export default function CrateCard({ crate, variant, onSelectCrate }: Props) {
  const isFeatured = variant === "featured"
  const nameClass = isFeatured ? "text-base font-semibold" : "text-sm font-semibold"

  const cardClasses = `group flex flex-col w-full rounded-lg bg-mc-bg-card border border-mc-border overflow-hidden hover:border-mc-accent transition-colors cursor-pointer text-left`

  if (crate.records.length === 0) {
    return (
      <div className={cardClasses}>
        <div className="px-3 pt-3 pb-2">
          <div className="mc-section-header">
            <span className={`mc-section-name ${nameClass}`}>{crate.name}</span>
          </div>
        </div>
        <div className="aspect-square flex items-center justify-center mc-dim text-xs px-3 pb-3">
          No records yet
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelectCrate(crate.slug)}
      className={cardClasses}
      aria-label={`Open ${crate.name}`}
    >
      <div className="px-3 pt-3 pb-1.5">
        <div className="flex items-center justify-between gap-2 border-b border-mc-border pb-1">
          <span className={`mc-section-name ${nameClass} truncate flex-1`}>{crate.name}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] text-mc-accent font-bold uppercase tracking-widest sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              DIG →
            </span>
            <span className="mc-section-count text-xs">{crate.count}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 px-3 pb-3 pt-1.5">
        {crate.records.slice(0, 4).map((record, i) => {
          const src = record.cover_image_url ?? record.thumbnail_url
          return (
            <motion.button
              key={record.id}
              type="button"
              className="aspect-square rounded-sm bg-mc-bg-raised overflow-hidden border border-mc-border/50 cursor-pointer"
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
                  alt=""
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
