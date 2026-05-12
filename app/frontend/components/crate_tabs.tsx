import React, { useRef } from "react"
import type { Crate } from "../types/inertia"

interface Props {
  crates: Crate[]
  activeSlug: string
  onSelect: (slug: string) => void
}

export default function CrateTabs({ crates, activeSlug, onSelect }: Props) {
  const tabsRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex = currentIndex
    if (e.key === "ArrowRight") nextIndex = (currentIndex + 1) % crates.length
    else if (e.key === "ArrowLeft") nextIndex = (currentIndex - 1 + crates.length) % crates.length
    else return

    e.preventDefault()
    const tab = tabsRef.current?.querySelectorAll<HTMLButtonElement>("[role='tab']")[nextIndex]
    tab?.focus()
    onSelect(crates[nextIndex].slug)
  }

  return (
    <div ref={tabsRef} role="tablist" aria-label="Crates" className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
      {crates.map((crate, i) => {
        const selected = crate.slug === activeSlug
        return (
          <button
            key={crate.slug}
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(crate.slug)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={`whitespace-nowrap px-2.5 py-1 rounded text-xs sm:text-sm cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-1 focus-visible:ring-offset-mc-bg ${
              selected
                ? "bg-mc-accent text-mc-on-accent font-semibold"
                : "bg-mc-bg-raised text-mc-text-dim hover:bg-mc-bg-card hover:text-mc-text"
            }`}
          >
            {crate.name}
          </button>
        )
      })}
    </div>
  )
}
