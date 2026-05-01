import React, { useState } from "react"
import AppLayout from "@/layouts/app_layout"
import CrateView from "@/components/crate_view"
import StoreFloor from "@/components/store_floor"
import type { FeaturedProps } from "@/types/inertia"

export default function Featured({ store, crates }: FeaturedProps) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [startIndex, setStartIndex] = useState(0)

  const handleSelectCrate = (slug: string, index = 0) => {
    setStartIndex(index)
    setActiveSlug(slug)
  }

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
        <StoreFloor crates={crates} onSelectCrate={handleSelectCrate} />
      ) : (
        <CrateView
          crates={crates}
          activeSlug={activeSlug}
          startIndex={startIndex}
          onSelectCrate={handleSelectCrate}
          onBack={() => setActiveSlug(null)}
        />
      )}
    </AppLayout>
  )
}
