import { motion } from "framer-motion"
import { useIsDesktop } from "@/hooks/use_is_desktop"
import type { Crate } from "../types/inertia"

interface Props {
  crates: Crate[]
  onSelectCrate: (slug: string, startIndex?: number) => void
}

function FeaturedCard({ crate, onSelectCrate }: { crate: Crate; onSelectCrate: (slug: string, startIndex?: number) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelectCrate(crate.slug)}
      className="flex flex-col h-48 rounded-lg bg-mc-bg-card border border-mc-border overflow-hidden hover:border-mc-accent transition-colors cursor-pointer"
      aria-label={`Open ${crate.name}`}
    >
      <div className="px-3 pt-3 pb-2">
        <div className="mc-section-header">
          <span className="mc-section-name text-sm">{crate.name}</span>
          <span className="mc-section-count text-xs">{crate.count}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 px-2 pb-2 flex-1 min-h-0">
        {crate.records.slice(0, 4).map((record, i) => {
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
                <img src={src} alt={record.title ?? ""} className="w-full h-full object-cover" draggable={false} loading="lazy" />
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

export default function FeaturedCratesRow({ crates, onSelectCrate }: Props) {
  const isDesktop = useIsDesktop()

  if (crates.length === 0) return null

  return (
    <div className={isDesktop ? "mb-6 grid grid-cols-2 gap-4" : "mb-4 -mx-4 px-4 flex gap-2 overflow-x-auto"} style={!isDesktop ? { scrollbarWidth: "none" } : undefined}>
      {crates.map((crate) => (
        <div key={crate.slug} className={!isDesktop ? "flex-shrink-0 w-[45vw] sm:w-48" : ""}>
          <FeaturedCard crate={crate} onSelectCrate={onSelectCrate} />
        </div>
      ))}
    </div>
  )
}
