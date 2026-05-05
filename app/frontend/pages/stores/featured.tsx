import { useState, useEffect, useMemo } from "react"
import AppLayout from "@/layouts/app_layout"
import CrateView from "@/components/crate_view"
import StoreFloor from "@/components/store_floor"
import type { FeaturedProps } from "@/types/inertia"

export default function Featured({ store, crates, storefront_sections }: FeaturedProps) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [startIndex, setStartIndex] = useState(0)

  const allCrates = useMemo(() => {
    if (!storefront_sections?.length) return crates
    return storefront_sections.flatMap((s) => ("crate" in s ? [s.crate] : s.crates))
  }, [storefront_sections, crates])

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

      {store.sync_status === "syncing" ? (
        <div className="py-16 text-center mc-dim text-sm">
          <p className="text-4xl mb-4">⏳</p>
          <p>Syncing inventory… check back in a moment.</p>
        </div>
      ) : crates.length === 0 ? (
        <div className="py-16 text-center mc-dim text-sm">
          <p>No vinyl found yet.</p>
        </div>
      ) : activeSlug === null ? (
        <StoreFloor sections={storefront_sections ?? []} onSelectCrate={handleSelectCrate} />
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
