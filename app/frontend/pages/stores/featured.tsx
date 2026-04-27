import React from "react"
import AppLayout from "@/layouts/app_layout.tsx"

interface Store { id: number; name: string; discogs_username: string; total_listings: number | null; description: string | null; sync_status: string }
interface Listing { id: number; artist: string | null; title: string | null; label: string | null; year: number | null; condition: string | null; price: string; genres: string[]; styles: string[]; cover_image_url: string | null; in_pile: boolean }
interface Crate { slug: string; name: string; count: number; records: Listing[] }

interface FeaturedProps { store: Store; crates: Crate[]; active_crate_slug: string }

export default function Featured({ store, crates }: FeaturedProps) {
  return (
    <AppLayout>
      <h1 className="text-xl font-bold mc-text">{store.name}</h1>
      <p className="text-xs mc-dim mt-0.5">
        @{store.discogs_username} &middot; {store.total_listings || "?"} vinyl listings
        {store.description && <><br />{store.description}</>}
      </p>

      <div className="mt-6 space-y-4">
        {crates.map((crate) => (
          <section key={crate.slug} className="border border-gray-800 rounded-lg">
            <h2 className="px-4 py-2 border-b border-gray-800 text-sm font-semibold">
              {crate.name} &middot; <span className="text-gray-400">{crate.count} records</span>
            </h2>
            <div className="flex overflow-x-auto gap-3 p-4">
              {crate.records.slice(0, 12).map((r) => (
                <div key={r.id} className="flex-shrink-0 w-36">
                  <div className="w-36 h-36 bg-gray-800 rounded overflow-hidden mb-1">
                    {r.cover_image_url ? (
                      <img src={r.cover_image_url} alt={r.title ?? ""} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 text-2xl">♪</div>
                    )}
                  </div>
                  <p className="text-xs truncate font-medium">{r.title}</p>
                  <p className="text-xs text-gray-500 truncate">{r.artist}</p>
                  <p className="text-xs text-gray-600">{r.label} {r.year ? `· ${r.year}` : ""}</p>
                  <p className="text-xs">{r.price ? `$${parseFloat(r.price).toFixed(2)}` : "—"}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppLayout>
  )
}
