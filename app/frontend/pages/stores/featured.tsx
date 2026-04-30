import React, { useState } from "react"
import AppLayout from "@/layouts/app_layout.tsx"
import Wall from "@/components/wall.tsx"
import CrateRow from "@/components/crate_row.tsx"
import CrateView from "@/components/crate_view.tsx"
import type { FeaturedProps } from "@/types/inertia"

export default function Featured({ store, crates }: FeaturedProps) {
  const [digCrate, setDigCrate] = useState<string | null>(null)

  const picksCrate = crates.find((c) => c.slug === "picks")
  const genreCrates = crates.filter((c) => c.slug !== "picks")

  const handleSelect = (_listingId: number, crateSlug: string) => {
    setDigCrate(crateSlug)
  }

  if (digCrate) {
    const crate = crates.find((c) => c.slug === digCrate)
    if (!crate) return null

    return (
      <AppLayout>
        <button onClick={() => setDigCrate(null)} className="text-xs mc-dim hover:text-mc-text mb-4">
          ← Back to {store.name}
        </button>
        <CrateView
          crates={[crate]}
          activeSlug={digCrate}
          onSelectCrate={() => {}}
          mode="crate"
          onToggleMode={() => {}}
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold mc-text">{store.name}</h1>
        {store.description && (
          <p className="text-sm mc-dim mt-1 max-w-prose">{store.description}</p>
        )}
        <p className="text-xs mc-dim mt-1">
          {store.total_listings ?? "?"} vinyl listings
        </p>
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
      ) : (
        <>
          {picksCrate && (
            <Wall picks={picksCrate.records} onSelect={handleSelect} />
          )}

          {genreCrates.map((crate) => (
            <CrateRow key={crate.slug} crate={crate} onSelect={handleSelect} />
          ))}

          <footer className="mt-12 pt-6 border-t border-mc-border text-center">
            <p className="text-xs text-mc-text-dim">
              Powered by{" "}
              <a href="https://milkcrate.fm" className="text-mc-accent hover:underline">
                Milk crate
              </a>
            </p>
          </footer>
        </>
      )}
    </AppLayout>
  )
}
