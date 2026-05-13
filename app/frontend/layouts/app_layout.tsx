import React, { useState } from "react"
import { Link, usePage } from "@inertiajs/react"
import { useTheme } from "@/hooks/use_theme"
import { PileProvider, usePileContext } from "@/contexts/pile_context"
import PileSheet from "@/components/pile_sheet"
import StorefrontMotionConfig from "@/components/storefront_motion_config"
import { ViewportProvider } from "@/contexts/viewport_context"
import { useViewport } from "@/hooks/use_viewport"

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const page = usePage()
  const props = page.props as any
  const flash = props.flash as { notice?: string; alert?: string } | undefined
  const storeName = props.store?.name as string | undefined
  const discogsUsername = props.store?.discogs_username as string | undefined
  const { theme, toggle } = useTheme()
  const { isCompact } = useViewport()
  const { pile } = usePileContext()
  const [pileOpen, setPileOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded focus:bg-mc-accent focus:text-mc-on-accent focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>
      <header className="mc-header flex items-center justify-between px-4 py-2 sm:py-3 border-b mc-border sticky top-0 z-30 bg-mc-bg-raised/95 backdrop-blur-sm">
        <Link
          href="/"
          className="flex flex-col leading-none min-w-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
        >
          {storeName ? (
            <>
              <span className="text-base font-bold tracking-wide mc-text truncate">{storeName}</span>
              <span className="text-[10px] tracking-widest uppercase text-mc-text-dim">
                {isCompact ? "on MC" : "on Milkcrate"}
              </span>
            </>
          ) : (
            <span className="mc-wordmark text-lg sm:text-xl font-bold tracking-widest uppercase whitespace-nowrap">🥛 Milkcrate</span>
          )}
        </Link>
        <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
          {discogsUsername && (
            <a
              href={`https://www.discogs.com/seller/${discogsUsername}/profile`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-mc-text-dim hover:text-mc-text transition-colors select-none rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
              aria-label="View store on Discogs"
            >
              {isCompact ? "Store ↗" : "Discogs ↗"}
            </a>
          )}
          {pile.length > 0 && (
            <button
              type="button"
              onClick={() => setPileOpen(true)}
              className="text-xs text-mc-accent hover:opacity-80 transition-opacity select-none font-medium rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
              aria-label={`Open pile with ${pile.length} records`}
              aria-expanded={pileOpen}
              aria-controls="pile-sheet"
            >
              {pile.length} <span className="hidden sm:inline">in pile</span>
              <span className="sm:hidden">pile</span>
            </button>
          )}
          <button
            type="button"
            onClick={toggle}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-lg sm:text-xl text-mc-text-dim hover:text-mc-text hover:bg-mc-bg-raised transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
            aria-label="Toggle light/dark mode"
          >
            {theme === "dark" ? "☀︎" : "☾"}
          </button>
        </div>
      </header>

      {flash?.notice && (
        <div className="px-4 py-2 text-sm mc-notice" role="alert" aria-live="polite">
          {flash.notice}
        </div>
      )}

      <main className="flex-1" id="main-content">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          {children}
        </div>
      </main>

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
    <StorefrontMotionConfig>
      <ViewportProvider>
        <PileProvider>
          <AppLayoutInner>{children}</AppLayoutInner>
        </PileProvider>
      </ViewportProvider>
    </StorefrontMotionConfig>
  )
}
