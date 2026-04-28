import React, { useState } from "react"
import AppLayout from "@/layouts/app_layout.tsx"
import CrateView from "@/components/crate_view.tsx"
import StoreView from "@/components/store_view.tsx"
import type { FeaturedProps } from "@/types/inertia"

export default function Featured({ store, crates, active_crate_slug }: FeaturedProps) {
  const [mode, setMode] = useState<"crate" | "store">("crate")
  const [activeSlug, setActiveSlug] = useState(active_crate_slug)

  const handleOpenCrate = (slug: string) => {
    setActiveSlug(slug)
    setMode("crate")
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
      ) : mode === "crate" ? (
        <CrateView
          crates={crates}
          activeSlug={activeSlug}
          onSelectCrate={setActiveSlug}
          onToggleMode={() => setMode("store")}
        />
      ) : (
        <StoreView
          crates={crates}
          onOpenCrate={handleOpenCrate}
          onToggleMode={() => setMode("crate")}
        />
      )}
    </AppLayout>
  )
}
