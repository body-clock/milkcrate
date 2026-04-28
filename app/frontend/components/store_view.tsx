import React from "react"
import type { Crate } from "../types/inertia"

interface Props {
  crates: Crate[]
  onOpenCrate: (slug: string) => void
  onToggleMode: () => void
}

export default function StoreView({ crates, onOpenCrate, onToggleMode }: Props) {
  const picks = crates.find((c) => c.slug === "picks")
  const genreCrates = crates.filter((c) => c.slug !== "picks")

  const genreEmoji = (name: string) => {
    const lower = name.toLowerCase()
    if (lower.includes("jazz")) return "🎷"
    if (lower.includes("electronic")) return "⚡"
    if (lower.includes("rock")) return "🎸"
    if (lower.includes("funk") || lower.includes("soul")) return "🎵"
    if (lower.includes("hip hop") || lower.includes("rap")) return "🎤"
    if (lower.includes("pop")) return "🎼"
    if (lower.includes("classical")) return "🎻"
    if (lower.includes("reggae")) return "🌴"
    if (lower.includes("latin")) return "💃"
    if (lower.includes("folk") || lower.includes("country")) return "🪕"
    if (lower.includes("blues")) return "🎹"
    return "💿"
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">Store Overview</h2>
        <button
          onClick={onToggleMode}
          className="text-xs border border-purple-500 rounded px-2 py-1 cursor-pointer hover:bg-purple-900 transition-colors"
        >
          📦 Crate view
        </button>
      </div>

      {picks && picks.records.length > 0 && (
        <div className="border border-gray-800 rounded mb-4">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
            <span className="font-medium text-sm">✨ {picks.name}</span>
            <span className="text-xs text-gray-500">{picks.count} records</span>
          </div>
          <div className="flex gap-1 overflow-x-auto px-3 py-2">
            {picks.records.slice(0, 10).map((record) => (
              <div key={record.id} className="flex-shrink-0 w-12 h-12 rounded bg-gray-800 overflow-hidden">
                {record.thumbnail_url ? (
                  <img src={record.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">♪</div>
                )}
              </div>
            ))}
          </div>
          <div className="px-3 pb-2">
            <button onClick={() => onOpenCrate("picks")} className="text-xs text-purple-400 cursor-pointer hover:text-purple-300">
              Open crate →
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {genreCrates.map((crate) => (
          <button
            key={crate.slug}
            onClick={() => onOpenCrate(crate.slug)}
            className="border border-gray-800 rounded p-3 text-center cursor-pointer hover:border-gray-600 transition-colors"
          >
            <div className="text-lg">{genreEmoji(crate.name)}</div>
            <div className="text-sm mt-1">{crate.name}</div>
            <div className="text-xs text-gray-500">{crate.count} records</div>
          </button>
        ))}
      </div>
    </div>
  )
}
