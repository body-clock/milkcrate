import React, { useState } from "react"
import { Link, usePage } from "@inertiajs/react"
import { useTheme } from "@/hooks/use_theme"
import { DigSessionProvider, useDigSessionContext } from "@/contexts/dig_session_context"
import PileSheet from "@/components/pile_sheet"

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const page = usePage()
  const flash = (page.props as any).flash as { notice?: string; alert?: string } | undefined
  const { theme, toggle } = useTheme()
  const { pile } = useDigSessionContext()
  const [pileOpen, setPileOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col">
      <header className="mc-header flex items-center justify-between px-4 py-3 border-b mc-border">
        <Link href="/" className="mc-wordmark text-xl font-bold tracking-widest uppercase">
          🥛 Milkcrate
        </Link>
        <div className="flex items-center gap-4">
          {pile.length > 0 && (
            <button
              type="button"
              onClick={() => setPileOpen(true)}
              className="text-xs text-mc-accent hover:opacity-80 transition-opacity select-none"
              aria-label={`Open pile with ${pile.length} records`}
              aria-expanded={pileOpen}
            >
              {pile.length} in pile
            </button>
          )}
          <button
            type="button"
            onClick={toggle}
            className="text-xs text-mc-text-dim hover:text-mc-text transition-colors select-none"
            aria-label="Toggle light/dark mode"
          >
            {theme === "dark" ? "☀︎" : "☾"}
          </button>
        </div>
      </header>

      {flash?.notice && (
        <div className="px-4 py-2 text-sm mc-notice" role="alert">
          {flash.notice}
        </div>
      )}

      <main className="flex-1 px-4 py-6">{children}</main>

      <PileSheet open={pileOpen} onClose={() => setPileOpen(false)} />
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DigSessionProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </DigSessionProvider>
  )
}
