import React, { useState } from "react"
import { Link, usePage } from "@inertiajs/react"
import { useTheme } from "@/hooks/use_theme"
import { DigSessionProvider, useDigSessionContext } from "@/contexts/dig_session_context"
import PileSheet from "@/components/pile_sheet"

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const page = usePage()
  const props = page.props as any
  const flash = props.flash as { notice?: string; alert?: string } | undefined
  const storeName = props.store?.name as string | undefined
  const { theme, toggle } = useTheme()
  const { pile } = useDigSessionContext()
  const [pileOpen, setPileOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col">
      <header className="mc-header flex items-center justify-between px-4 py-3 border-b mc-border">
        <Link href="/" className="flex flex-col leading-none">
          {storeName ? (
            <>
              <span className="text-base font-bold tracking-wide mc-text">{storeName}</span>
              <span className="text-[10px] tracking-widest uppercase text-mc-text-dim">on Milkcrate</span>
            </>
          ) : (
            <span className="mc-wordmark text-xl font-bold tracking-widest uppercase">🥛 Milkcrate</span>
          )}
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

      <footer className="px-4 py-4 border-t mc-border text-center">
        <span className="text-[11px] text-mc-text-dim tracking-wide">
          Powered by <span className="font-semibold tracking-widest uppercase">🥛 Milkcrate</span>
        </span>
      </footer>

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
