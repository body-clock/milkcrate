import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import AppLayout from "@/layouts/app_layout"
import CrateView from "@/components/crate_view"
import StoreFloor from "@/components/store_floor"
import type { FeaturedProps } from "@/types/inertia"

export default function Featured({ store, crates, storefront_sections }: FeaturedProps) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [startIndex, setStartIndex] = useState(0)

  const allCrates = useMemo(() => {
    if (crates.length > 0) return crates
    if (!storefront_sections?.length) return []
    return storefront_sections.flatMap((s) => ("crate" in s ? [s.crate] : s.crates))
  }, [crates, storefront_sections])

  const handleSelectCrate = (slug: string, index = 0) => {
    setStartIndex(index)
    setActiveSlug(slug)
    // Push on first entry; replace on subsequent switches so back
    // always returns to the store floor regardless of browsing depth.
    if (activeSlug === null) {
      history.pushState({ crateSlug: slug, startIndex: index }, "")
    } else {
      history.replaceState({ crateSlug: slug, startIndex: index }, "")
    }
  }

  useEffect(() => {
    const handlePop = (e: PopStateEvent) => {
      const slug = e.state?.crateSlug ?? null
      setActiveSlug(slug)
      setStartIndex(e.state?.startIndex ?? 0)
    }
    window.addEventListener("popstate", handlePop)
    return () => window.removeEventListener("popstate", handlePop)
  }, [])

  return (
    <AppLayout>
      {activeSlug === null && (store.description || store.total_listings) && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-6"
        >
          {store.description && (
            <p className="text-sm mc-text leading-relaxed max-w-prose">
              {store.description}
            </p>
          )}
          {store.total_listings && (
            <p className="text-xs mc-dim mt-1.5">
              {store.total_listings.toLocaleString()} vinyl listings
            </p>
          )}
        </motion.div>
      )}

      {store.sync_status === "failed" && (
        <div
          role="alert"
          className="mb-6 rounded border border-mc-accent/30 bg-mc-notice px-4 py-3"
        >
          <p className="text-sm mc-text font-medium">
            Sync failed
            {store.last_sync_error_at
              ? ` on ${new Date(store.last_sync_error_at).toLocaleString()}`
              : ""}
          </p>
          <p className="text-xs text-mc-text-dim mt-1">
            Inventory may be stale. Try running the sync again from the Rails console.
          </p>
        </div>
      )}

      {store.sync_status === "syncing" ? (
        <div
          role="status"
          aria-live="polite"
          className="py-16 text-center"
        >
          <svg
            className="motion-safe:animate-spin h-8 w-8 mx-auto mb-4 text-mc-accent"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-sm mc-dim">
            Syncing inventory… check back in a moment.
          </p>
        </div>
      ) : crates.length === 0 ? (
        <div className="py-16 text-center">
          <span className="text-4xl mb-4 block" aria-hidden="true">
            🎵
          </span>
          <p className="text-sm mc-dim">
            No vinyl found yet. Once the store syncs, curated crates will appear here.
          </p>
        </div>
      ) : activeSlug === null ? (
        <StoreFloor
          sections={storefront_sections ?? []}
          onSelectCrate={handleSelectCrate}
        />
      ) : (
        <CrateView
          crates={allCrates}
          activeSlug={activeSlug}
          startIndex={startIndex}
          onSelectCrate={handleSelectCrate}
          onBack={() => history.back()}
        />
      )}
    </AppLayout>
  )
}
