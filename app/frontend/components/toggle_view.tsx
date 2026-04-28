import React from "react"

interface ToggleViewProps {
  mode: "crate" | "store"
  onToggle: () => void
}

export default function ToggleView({ mode, onToggle }: ToggleViewProps) {
  return (
    <div
      onClick={onToggle}
      className="inline-flex items-center rounded-full cursor-pointer border border-mc-border p-0.5 select-none"
    >
      <span
        className={`px-2.5 py-0.5 text-xs rounded-full transition-colors ${
          mode === "crate" ? "bg-mc-accent text-mc-bg" : "text-mc-text-dim"
        }`}
      >
        Crate
      </span>
      <span
        className={`px-2.5 py-0.5 text-xs rounded-full transition-colors ${
          mode === "store" ? "bg-mc-accent text-mc-bg" : "text-mc-text-dim"
        }`}
      >
        Store
      </span>
    </div>
  )
}
