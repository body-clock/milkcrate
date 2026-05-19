import React, { useCallback, useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { usePileContext } from "../contexts/pile_context"
import { useReducedMotionContext } from "@/components/storefront_motion_config"
import { springFlip } from "@/lib/motion_tokens"
import type { Listing } from "../types/inertia"

interface Props {
  listing: Listing
  resetKey?: string | number
  className?: string
  imageLoading?: "eager" | "lazy"
  disableFlip?: boolean
  framed?: boolean
  /** When true, suppresses the cursor-parallax tilt effect (used on compact viewports). */
  disableParallax?: boolean
}

const PARALLAX_MAX_ANGLE = 8 // degrees

export default function RecordCard({ listing, resetKey, className = "", imageLoading = "lazy", disableFlip = false, framed = false, disableParallax = false }: Props) {
  const [flipped, setFlipped] = useState(false)
  const pointerDown = useRef<{ x: number; y: number } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const tiltRef = useRef({ x: 0, y: 0 })
  const { inPile, addToPile, removeFromPile } = usePileContext()
  const reducedMotion = useReducedMotionContext()
  const canFlip = !disableFlip
  const canTilt = !disableParallax && !reducedMotion

  useEffect(() => {
    setFlipped(false)
    if (cardRef.current) {
      cardRef.current.style.transform = ""
    }
  }, [resetKey])

  // ── Apply tilt transform directly to DOM via ref ──────────

  const applyTilt = useCallback(() => {
    const el = cardRef.current
    if (!el) return
    const t = tiltRef.current
    if (canTilt && !flipped) {
      el.style.transform = `perspective(800px) rotateX(${t.y}deg) rotateY(${t.x}deg)`
    }
  }, [canTilt, flipped])

  // ── Parallax pointer handlers ───────────────────────────

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!canTilt || e.pointerType !== "mouse") return

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const el = cardRef.current
      if (!el) return

      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy

      tiltRef.current = {
        x: (dx / (rect.width / 2)) * PARALLAX_MAX_ANGLE,
        y: -(dy / (rect.height / 2)) * PARALLAX_MAX_ANGLE,
      }

      el.style.transform = `perspective(800px) rotateX(${tiltRef.current.y}deg) rotateY(${tiltRef.current.x}deg)`
    })
  }, [canTilt])

  const handlePointerEnter = useCallback((e: React.PointerEvent) => {
    if (!canTilt || e.pointerType !== "mouse") return
    handlePointerMove(e)
  }, [canTilt, handlePointerMove])

  const handlePointerLeave = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    tiltRef.current = { x: 0, y: 0 }
    if (cardRef.current) {
      cardRef.current.style.transform = `perspective(800px) rotateX(0deg) rotateY(0deg)`
    }
  }, [])

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  // ── Flip handlers ────────────────────────────────────────

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
      ref={cardRef}
      className={`w-full h-full flex-shrink-0 cursor-pointer ${className}`}
      style={{
        touchAction: "none",
        transformStyle: "preserve-3d",
        transform: "perspective(800px) rotateX(0deg) rotateY(0deg)",
        transition: "transform 0.1s ease-out",
        willChange: "transform",
      }}
      role={canFlip ? "button" : undefined}
      tabIndex={canFlip ? 0 : undefined}
      aria-label={canFlip ? `${flipped ? "Show cover for" : "Show details for"} ${listing.title ?? "record"}` : undefined}
      aria-pressed={canFlip ? flipped : undefined}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
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
              {listing.price ? `$${parseFloat(listing.price).toFixed(2)}` : "—"}
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
