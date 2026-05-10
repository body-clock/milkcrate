import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import AppLayout from "@/layouts/app_layout"
import CrateView from "@/components/crate_view"
import StoreFloor from "@/components/store_floor"
import { springTactile } from "@/lib/motion_tokens"
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
    history.pushState({ crateSlug: slug, startIndex: index }, "")
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
      {(store.description || store.total_listings) && (
        <div className="mb-4">
          {store.description && (
            <p className="text-sm mc-dim max-w-prose">{store.description}</p>
          )}
          {store.total_listings && (
            <p className="text-xs mc-dim mt-1">{store.total_listings} vinyl listings</p>
          )}
        </div>
      )}

      {store.sync_status === "failed" && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/8 px-4 py-3 text-sm text-red-100">
          Sync failed{store.last_sync_error_at ? ` on ${new Date(store.last_sync_error_at).toLocaleString()}` : ""}. Inventory may be stale.
        </div>
      )}

      {store.sync_status === "syncing" ? (
        <div className="py-16 text-center mc-dim text-sm">
          <p className="text-4xl mb-4">⏳</p>
          <p>Syncing inventory… check back in a moment.</p>
        </div>
      ) : crates.length === 0 ? (
        <div className="py-16 text-center mc-dim text-sm">
          <p>No vinyl found yet.</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeSlug === null ? (
            <motion.div
              key="store-floor"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={springTactile}
            >
              <StoreFloor sections={storefront_sections ?? []} onSelectCrate={handleSelectCrate} />
            </motion.div>
          ) : (
            <motion.div
              key={`crate-${activeSlug}`}
              layoutId={`crate-${activeSlug}`}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={springTactile}
            >
              <CrateView
                crates={allCrates}
                activeSlug={activeSlug}
                startIndex={startIndex}
                onSelectCrate={handleSelectCrate}
                onBack={() => history.back()}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </AppLayout>
  )
}
