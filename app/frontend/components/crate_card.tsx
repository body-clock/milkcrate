import { motion } from "framer-motion"
import { useTactileHover } from "@/hooks/use_tactile_hover"
import { springTactile, springPress, SCALE_HOVER, SCALE_PRESS } from "@/lib/motion_tokens"
import type { Crate } from "../types/inertia"

interface Props {
  crate: Crate
  variant: "featured" | "genre"
  onSelectCrate: (slug: string, startIndex?: number) => void
}

export default function CrateCard({ crate, variant, onSelectCrate }: Props) {
  const isFeatured = variant === "featured"
  const nameClass = isFeatured ? "text-base font-semibold" : "text-sm font-semibold"
  const { isHovered, isPressed, handlers } = useTactileHover()

  if (crate.records.length === 0) {
    return (
      <div className="flex flex-col w-full rounded-lg bg-mc-bg-card border border-mc-border overflow-hidden text-left">
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
    <motion.button
      type="button"
      onClick={() => onSelectCrate(crate.slug)}
      className="flex flex-col w-full rounded-lg bg-mc-bg-card border border-mc-border overflow-hidden cursor-pointer text-left"
      animate={{
        borderColor: isHovered ? "var(--mc-accent)" : "var(--mc-border)",
        scale: isPressed ? SCALE_PRESS : isHovered ? SCALE_HOVER : 1,
        y: isHovered ? -3 : 0,
        rotate: isHovered ? 0 : -0.5,
      }}
      transition={isPressed ? springPress : springTactile}
      aria-label={`Open ${crate.name}`}
      {...handlers}
    >
      {/* Header row — lid lift on hover */}
      <motion.div
        className="px-3 pt-3 pb-1.5"
        style={{ transformOrigin: "top" }}
        animate={{ y: isHovered ? -2 : 0 }}
        transition={springTactile}
      >
        <div className="flex items-center justify-between gap-2 border-b border-mc-border pb-1">
          <span className={`mc-section-name ${nameClass} truncate flex-1`}>{crate.name}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* DIG → label — slides in on hover */}
            <motion.span
              className="text-[10px] text-mc-accent font-bold uppercase tracking-widest"
              animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -4 }}
              transition={springTactile}
            >
              DIG →
            </motion.span>
            <span className="mc-section-count text-xs">{crate.count}</span>
          </div>
        </div>
      </motion.div>

      {/* Thumbnail grid — scale together as a group */}
      <motion.div
        className="grid grid-cols-2 gap-1.5 px-3 pb-3 pt-1.5"
        animate={{ scale: isHovered ? SCALE_HOVER : 1 }}
        transition={springTactile}
      >
        {crate.records.slice(0, 4).map((record, i) => {
          const src = record.cover_image_url ?? record.thumbnail_url
          return (
            <button
              key={record.id}
              type="button"
              className="aspect-square rounded-sm bg-mc-bg-raised overflow-hidden border border-mc-border/50 cursor-pointer"
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
            </button>
          )
        })}
      </motion.div>
    </motion.button>
  )
}
