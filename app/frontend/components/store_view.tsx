import React from "react"
import ToggleView from "./toggle_view"
import type { Crate } from "../types/inertia"

interface Props {
  crates: Crate[]
  onOpenCrate: (slug: string) => void
  mode: "crate" | "store"
  onToggleMode: () => void
}

export default function StoreView({ crates, onOpenCrate, mode, onToggleMode }: Props) {
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
        <ToggleView mode={mode} onToggle={onToggleMode} />
      </div>

      {picks && picks.records.length > 0 && (
        <div className="border border-mc-border rounded mb-4">
          <div className="flex items-center justify-between px-3 py-2 border-b border-mc-border">
            <span className="font-medium text-sm">✨ {picks.name}</span>
            <span className="text-xs text-mc-text-dim">{picks.count} records</span>
          </div>
          <div className="flex gap-1 overflow-x-auto px-3 py-2">
            {picks.records.slice(0, 10).map((record) => (
              <div key={record.id} className="flex-shrink-0 w-12 h-12 rounded bg-mc-bg-raised overflow-hidden">
                {record.thumbnail_url ? (
                  <img src={record.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-mc-text-dim text-sm">♪</div>
                )}
              </div>
            ))}
          </div>
          <div className="px-3 pb-2">
            <button onClick={() => onOpenCrate("picks")} className="text-xs text-mc-accent cursor-pointer hover:text-mc-accent">
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
            className="border border-mc-border rounded p-3 text-center cursor-pointer hover:border-mc-accent transition-colors"
          >
            <div className="text-lg">{genreEmoji(crate.name)}</div>
            <div className="text-sm mt-1">{crate.name}</div>
            <div className="text-xs text-mc-text-dim">{crate.count} records</div>
          </button>
        ))}
      </div>
    </div>
  )
}
