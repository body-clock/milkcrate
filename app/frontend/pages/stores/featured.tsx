import React, { useState } from "react"
import AppLayout from "@/layouts/app_layout.tsx"
import Wall from "@/components/wall.tsx"
import CrateView from "@/components/crate_view.tsx"
import type { FeaturedProps } from "@/types/inertia"

export default function Featured({ store, crates }: FeaturedProps) {
  const [digCrate, setDigCrate] = useState<string | null>(null)

  const picksCrate = crates.find((c) => c.slug === "picks")
  const genreCrates = crates.filter((c) => c.slug !== "picks")

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
          {picksCrate && <Wall picks={picksCrate.records} />}

          <section className="mb-6">
            <h2 className="text-sm font-semibold mc-text mb-3">Browse by section</h2>
            <div className="flex flex-wrap gap-2">
              {genreCrates.map((crate) => (
                <button
                  key={crate.slug}
                  onClick={() => setDigCrate(crate.slug)}
                  className="text-sm px-3 py-1.5 rounded border border-mc-border text-mc-text-dim hover:border-mc-accent hover:text-mc-text transition-colors"
                >
                  {crate.name}
                  <span className="text-xs ml-1.5 text-mc-text-dim">{crate.count}</span>
                </button>
              ))}
            </div>
          </section>

          <footer className="mt-12 pt-6 border-t border-mc-border text-center">
            <p className="text-xs text-mc-text-dim">
              Powered by{" "}
              <a href="https://milkcrate.fm" className="text-mc-accent hover:underline">
                Milkcrate
              </a>
            </p>
          </footer>
        </>
      )}
    </AppLayout>
  )
}
