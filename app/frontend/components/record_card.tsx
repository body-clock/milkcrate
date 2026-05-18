import React, { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { usePileContext } from "../contexts/pile_context"
import { springFlip } from "@/lib/motion_tokens"
import { formatPrice } from "@/lib/format_price"
import type { Listing } from "../types/inertia"

interface Props {
  listing: Listing
  resetKey?: string | number
  className?: string
  imageLoading?: "eager" | "lazy"
  disableFlip?: boolean
  framed?: boolean
}

export default function RecordCard({ listing, resetKey, className = "", imageLoading = "lazy", disableFlip = false, framed = false }: Props) {
  const [flipped, setFlipped] = useState(false)
  const pointerDown = useRef<{ x: number; y: number } | null>(null)
  const { inPile, addToPile, removeFromPile } = usePileContext()
  const canFlip = !disableFlip

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
    if (!canFlip) return
    if ((e.target as HTMLElement).closest("a, button, form")) return
    if (movedSincePointerDown(e)) return
    setFlipped((f) => !f)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!canFlip) return
    if ((e.target as HTMLElement).closest("a, button, form")) return

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      setFlipped((f) => !f)
    }
  }

  const meta = [listing.label, listing.year, listing.condition].filter(Boolean).join(" · ")

  return (
    <div
      className={`w-full h-full flex-shrink-0 cursor-pointer ${className}`}
      style={{ perspective: 800, touchAction: "none" }}
      role={canFlip ? "button" : undefined}
      tabIndex={canFlip ? 0 : undefined}
      aria-label={canFlip ? `${flipped ? "Show cover for" : "Show details for"} ${listing.title ?? "record"}` : undefined}
      aria-pressed={canFlip ? flipped : undefined}
      onPointerDown={handlePointerDown}
      onDragStart={(e) => e.preventDefault()}
      onClick={handleFlip}
      onKeyDown={handleKeyDown}
    >
      <motion.div
        className={framed ? "rounded-lg" : undefined}
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          willChange: "transform",
          boxShadow: framed
            ? "0 0 0 1px var(--mc-border), 0 25px 50px -12px rgb(0 0 0 / 0.35)"
            : undefined,
        }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={springFlip}
      >
        {/* Front */}
        <div
          className="rounded-lg overflow-hidden shadow-xl"
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            contain: "paint",
          }}
        >
          {listing.cover_image_url ? (
            <img
              src={listing.cover_image_url}
              alt={listing.title ?? ""}
              className="w-full h-full object-cover"
              draggable={false}
              loading={imageLoading}
              decoding="async"
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
            contain: "paint",
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
              {formatPrice(listing)}
            </div>
            <div className="flex gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
              {inPile(listing.id) ? (
                <button onClick={() => removeFromPile(listing.id)} className="mc-btn text-xs">
                  ✓ In pile
                </button>
              ) : (
                <button onClick={() => addToPile(listing)} className="mc-btn mc-btn-primary text-xs">
                  + Pile
                </button>
              )}
              <a href={listing.discogs_url} target="_blank" rel="noopener noreferrer" className="mc-btn text-xs">
                Discogs ↗
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
