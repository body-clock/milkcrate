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
      <header className="mc-header flex items-center justify-between px-4 py-2 sm:py-3 border-b mc-border sticky top-0 z-30 bg-mc-bg/95 backdrop-blur-sm">
        <Link href="/" className="flex flex-col leading-none min-w-0">
          {storeName ? (
            <>
              <span className="text-base font-bold tracking-wide mc-text truncate">{storeName}</span>
              <span className="text-[9px] sm:text-[10px] tracking-widest uppercase text-mc-text-dim">
                {isCompact ? "on MC" : "on Milkcrate"}
              </span>
            </>
          ) : (
            <span className="mc-wordmark text-lg sm:text-xl font-bold tracking-widest uppercase whitespace-nowrap">🥛 Milkcrate</span>
          )}
        </Link>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {discogsUsername && (
            <a
              href={`https://www.discogs.com/seller/${discogsUsername}/profile`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-mc-text-dim hover:text-mc-text transition-colors select-none"
              aria-label="View store on Discogs"
            >
              {isCompact ? "Store ↗" : "Discogs ↗"}
            </a>
          )}
          {pile.length > 0 && (
            <button
              type="button"
              onClick={() => setPileOpen(true)}
              className="text-xs text-mc-accent hover:opacity-80 transition-opacity select-none font-medium"
              aria-label={`Open pile with ${pile.length} records`}
              aria-expanded={pileOpen}
            >
              {pile.length} <span className="hidden sm:inline">in pile</span>
              <span className="sm:hidden">pile</span>
            </button>
          )}
          <button
            type="button"
            onClick={toggle}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-lg sm:text-xl text-mc-text-dim hover:text-mc-text hover:bg-mc-bg-raised transition-colors select-none"
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

      <main className="flex-1 px-4 py-4 sm:py-6">{children}</main>

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
