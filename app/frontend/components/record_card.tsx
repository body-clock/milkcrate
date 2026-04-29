import React, { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { router } from "@inertiajs/react"
import type { Listing } from "../types/inertia"

interface Props {
  listing: Listing
  resetKey?: string | number
  className?: string
}

export default function RecordCard({ listing, resetKey, className = "" }: Props) {
  const [flipped, setFlipped] = useState(false)
  const pointerDown = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    setFlipped(false)
  }, [resetKey])

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDown.current = { x: e.clientX, y: e.clientY }
  }

  const movedSincePointerDown = (e: React.MouseEvent) => {
    if (!pointerDown.current) return false

    const deltaX = Math.abs(e.clientX - pointerDown.current.x)
    const deltaY = Math.abs(e.clientY - pointerDown.current.y)
    pointerDown.current = null

    return Math.hypot(deltaX, deltaY) > 8
  }

  const handleFlip = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a, button, form")) return
    if (movedSincePointerDown(e)) return
    setFlipped((f) => !f)
  }

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.post(`/listings/${listing.id}/add_to_session`)
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.delete(`/listings/${listing.id}/remove_from_session`)
  }

  const meta = [listing.label, listing.year, listing.condition].filter(Boolean).join(" · ")

  return (
    <div
      className={`w-full h-full flex-shrink-0 cursor-pointer ${className}`}
      style={{ perspective: 800, touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onClick={handleFlip}
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
          className="rounded-lg overflow-hidden shadow-xl"
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          {listing.cover_image_url ? (
            <img
              src={listing.cover_image_url}
              alt={listing.title ?? ""}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-mc-bg-raised text-mc-text-dim text-5xl">♪</div>
          )}
        </div>

        {/* Back */}
        <div
          className="rounded-lg overflow-hidden shadow-xl bg-mc-bg-card"
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="flex flex-col h-full p-4 gap-2">
            <div className="text-sm font-semibold leading-tight line-clamp-3">
              {listing.title}
            </div>
            <div className="text-xs text-mc-text leading-tight">
              {listing.artist}
            </div>
            {meta && (
              <div className="text-xs text-mc-text-dim">{meta}</div>
            )}
            {listing.genres.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {listing.genres.slice(0, 3).map((g) => (
                  <span key={g} className="text-[10px] px-1.5 py-0.5 rounded bg-mc-bg-raised text-mc-text-dim">
                    {g}
                  </span>
                ))}
              </div>
            )}
            <div className="text-sm font-medium mt-auto">
              {listing.price ? `$${parseFloat(listing.price).toFixed(2)}` : "—"}
            </div>
            <div className="flex gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
              {listing.in_pile ? (
                <button onClick={handleRemove} className="mc-btn text-xs">
                  ✓ In pile
                </button>
              ) : (
                <button onClick={handleAdd} className="mc-btn mc-btn-primary text-xs">
                  + Pile
                </button>
              )}
              <a href={listing.discogs_url} target="_blank" rel="noopener" className="mc-btn text-xs">
                Discogs ↗
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
