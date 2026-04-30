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
      <div className="mb-4">
        <h1 className="text-xl font-bold mc-text">{store.name}</h1>
        <p className="text-xs mc-dim mt-0.5">
          @{store.discogs_username} &middot; {store.total_listings ?? "?"} vinyl listings
        </p>
        {store.description && (
          <p className="text-sm mc-dim mt-2 max-w-prose">{store.description}</p>
        )}
      </div>

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
          storeId={store.id}
          onSelectCrate={handleSelectCrate}
          onBack={() => setActiveSlug(null)}
        />
      )}
    </AppLayout>
  )
}
