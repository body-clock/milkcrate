import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { usePileContext } from "../contexts/pile_context"
import { useViewport } from "@/hooks/use_viewport"
import { springDrawer } from "@/lib/motion_tokens"
import { useSwipeable } from "@/hooks/use_swipeable"

interface Props {
  open: boolean
  onClose: () => void
}

export default function PileSheet({ open, onClose }: Props) {
  const { pile, removeFromPile, clearPile } = usePileContext()
  const { isCompact } = useViewport()
  const [confirmClear, setConfirmClear] = React.useState(false)

  const swipeHandlers = useSwipeable({
    direction: "down",
    onSwipe: () => onClose(),
  })
  const dialogRef = React.useRef<HTMLDivElement>(null)
  const previousFocusRef = React.useRef<HTMLElement | null>(null)

  const total = pile.reduce((sum, l) => sum + (parseFloat(l.price) || 0), 0)

  React.useEffect(() => {
    if (!open) return

    previousFocusRef.current = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setConfirmClear(false)
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      previousFocusRef.current?.focus?.()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pile-sheet-title"
            tabIndex={-1}
            className={
              isCompact
                ? "fixed top-0 right-0 bottom-0 z-50 bg-mc-bg border-l border-mc-border w-96 flex flex-col"
                : "fixed bottom-0 left-0 right-0 z-50 bg-mc-bg border-t border-mc-border rounded-t-2xl max-h-[85vh] flex flex-col"
            }
            initial={!isCompact ? { x: "100%" } : { y: "100%" }}
            animate={!isCompact ? { x: 0 } : { y: 0 }}
            exit={!isCompact ? { x: "100%" } : { y: "100%" }}
            transition={springDrawer}
          >
            {isCompact && (
              <div
                className="w-12 h-1.5 bg-mc-border rounded-full mx-auto my-3 flex-shrink-0"
                {...swipeHandlers.handlers}
              />
            )}
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-mc-border flex-shrink-0">

              <div className="flex items-center gap-3">
                <span id="pile-sheet-title" className="text-sm font-semibold">
                  Your pile {pile.length > 0 && <span className="text-mc-text-dim font-normal">· {pile.length} records</span>}
                </span>
                {pile.length > 0 && (
                  confirmClear ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-mc-text-dim">Sure?</span>
                      <button
                        onClick={() => { clearPile(); setConfirmClear(false) }}
                        className="text-xs text-mc-accent hover:opacity-80 transition-opacity"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmClear(false)}
                        className="text-xs text-mc-text-dim hover:text-mc-text transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmClear(true)}
                      className="text-xs text-mc-text-dim hover:text-mc-text transition-colors"
                      aria-label={`Clear ${pile.length} records from pile`}
                    >
                      Clear
                    </button>
                  )
                )}
              </div>
              <button
                onClick={() => { setConfirmClear(false); onClose() }}
                className="text-mc-text-dim hover:text-mc-text transition-colors text-lg leading-none"
                aria-label="Close pile"
              >
                ×
              </button>
            </div>

            {/* Records list */}
            <div className="flex-1 overflow-y-auto">
              {pile.length === 0 ? (
                <div className="py-16 text-center text-sm text-mc-text-dim">
                  No records in your pile yet.
                </div>
              ) : (
                <ul>
                  {pile.map((listing) => {
                    const src = listing.cover_image_url ?? listing.thumbnail_url
                    return (
                      <li key={listing.id} className="flex items-center gap-3 px-4 py-3 border-b border-mc-border">
                        <a
                          href={listing.discogs_url}
                          target="_blank"
                          rel="noopener"
                          className="flex items-center gap-3 flex-1 min-w-0 group"
                        >
                          <div className="w-12 h-12 flex-shrink-0 rounded bg-mc-bg-raised overflow-hidden border border-mc-border">
                            {src ? (
                              <img src={src} alt={listing.title ?? ""} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-mc-text-dim">♪</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate group-hover:text-mc-accent transition-colors">{listing.title}</div>
                            <div className="text-xs text-mc-text-dim truncate">{listing.artist}</div>
                          </div>
                          <span className="text-xs font-medium flex-shrink-0">
                            {listing.price ? `$${parseFloat(listing.price).toFixed(2)}` : "—"}
                          </span>
                        </a>
                        <button
                          onClick={() => removeFromPile(listing.id)}
                          className="text-mc-text-dim hover:text-mc-text transition-colors text-sm leading-none flex-shrink-0 ml-2"
                          aria-label={`Remove ${listing.title ?? "record"} from pile`}
                        >
                          ×
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            {pile.length > 0 && (
              <div className="flex-shrink-0 px-4 py-4 border-t border-mc-border flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-mc-text-dim uppercase tracking-wider">Total</span>
                  <span className="text-sm font-semibold">${total.toFixed(2)}</span>
                </div>
                <button
                  disabled
                  className="w-full mc-btn mc-btn-primary py-2.5 text-sm opacity-40 cursor-not-allowed"
                  title="Coming soon — requires Discogs login"
                >
                  Add all to Discogs cart
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
