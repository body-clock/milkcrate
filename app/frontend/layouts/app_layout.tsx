import React, { useState } from "react"
import { Link, usePage } from "@inertiajs/react"
import { useTheme } from "@/hooks/use_theme"
import { PileProvider, usePileContext } from "@/contexts/pile_context"
import PileSheet from "@/components/pile_sheet"
import StorefrontMotionConfig from "@/components/storefront_motion_config"
import { ViewportProvider } from "@/contexts/viewport_context"
import { useViewport } from "@/hooks/use_viewport"
import BrandMark from "@/components/brand_mark"
import MilkcrateShell from "@/layouts/milkcrate_shell"
import type { Store } from "@/types/inertia"

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const page = usePage<{ notice?: string; alert?: string; store?: Pick<Store, "name" | "discogs_username"> }>()
  const notice = page.props.notice
  const alertMsg = page.props.alert
  const storeName = page.props.store?.name
  const discogsUsername = page.props.store?.discogs_username
  const csrfToken = document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content
  const { theme, toggle } = useTheme()
  const { isCompact } = useViewport()
  const { pile } = usePileContext()
  const [pileOpen, setPileOpen] = useState(false)

  const header = (
    <header className="mc-header flex items-center justify-between px-4 py-2 sm:py-3 border-b mc-border sticky top-0 z-30 bg-mc-bg-raised/95 backdrop-blur-sm">
      <div className="flex flex-col leading-none min-w-0">
        {storeName ? (
          <>
            <Link
              href={`/${discogsUsername}`}
              className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
            >
              <span className="mc-brand-title text-base font-bold mc-text truncate">{storeName}</span>
            </Link>
            <Link
              href="/"
              className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
            >
              <span className="text-[10px] tracking-widest uppercase text-mc-text-dim">
                {isCompact ? "on MC" : "on Milkcrate"}
              </span>
            </Link>
          </>
        ) : (
          <Link
            href="/"
            className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
          >
            <BrandMark size="small" />
          </Link>
        )}
      </div>
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
  )

  const footer = (
    <footer className="px-4 py-4 border-t mc-border text-center">
      <span className="text-[11px] text-mc-text-dim tracking-wide">
        Powered by <span className="font-semibold tracking-widest uppercase">Milkcrate</span>
      </span>
    </footer>
  )

  const flashMsg = notice || alertMsg
  const afterHeader = flashMsg ? (
    <div className="px-4 py-2 text-sm mc-notice" role="alert" aria-live="polite">
      {flashMsg}
    </div>
  ) : undefined

  return (
    <>
      <MilkcrateShell
        header={header}
        afterHeader={afterHeader}
        footer={footer}
        contentWidth="max-w-6xl"
        contentPadding="px-4 sm:px-6 lg:px-8 py-4 sm:py-8"
      >
        {children}
      </MilkcrateShell>
      <PileSheet open={pileOpen} onClose={() => setPileOpen(false)} />
    </>
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
