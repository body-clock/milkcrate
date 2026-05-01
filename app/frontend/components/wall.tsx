import React, { useState } from "react"
import { motion } from "framer-motion"
import type { Listing } from "../types/inertia"

interface Props {
  picks: Listing[]
}

function WallCard({ record }: { record: Listing }) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div
      className="flex-shrink-0 cursor-pointer"
      style={{ perspective: 800, width: "min(44vw, 180px)", height: "min(44vw, 180px)" }}
      onClick={() => setFlipped((f) => !f)}
    >
      <motion.div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
        }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
      >
        {/* Front */}
        <div
          className="rounded-lg overflow-hidden"
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          {record.cover_image_url ? (
            <img src={record.cover_image_url} alt={record.title ?? ""} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-mc-bg-raised text-mc-text-dim text-4xl">♪</div>
          )}
        </div>

        {/* Back */}
        <div
          className="rounded-lg overflow-hidden bg-mc-bg-card p-3 flex flex-col justify-between"
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div>
            <p className="text-xs font-semibold mc-text line-clamp-2">{record.title}</p>
            <p className="text-[10px] text-mc-text-dim mt-1">{record.artist}</p>
          </div>
          <div>
            <p className="text-[10px] text-mc-text-dim">{record.label} {record.year ? `· ${record.year}` : ""}</p>
            <p className="text-xs font-medium mt-1">{record.price ? `$${parseFloat(record.price).toFixed(2)}` : "—"}</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function Wall({ picks }: Props) {
  if (picks.length === 0) return null

  return (
    <section className="mb-8">
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-sm font-semibold mc-text">Staff Picks</span>
        <span className="text-[10px] text-mc-text-dim">{picks.length} records</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {picks.slice(0, 8).map((record) => (
          <WallCard key={record.id} record={record} />
        ))}
      </div>
    </section>
  )
}
