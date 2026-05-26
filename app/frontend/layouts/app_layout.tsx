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
import { ShopperProvider, useShopperContext } from "@/contexts/shopper_context"
import { DiscogsDisconnectForm } from "@/components/discogs_connection_controls"
import FeedbackMessage from "@/components/ui/feedback_message"
import type { Store } from "@/types/inertia"

export interface CompactStoreLocation {
  name: string
  count: number
  onBack: () => void
}

interface AppLayoutProps {
  children: React.ReactNode
  compactLocation?: CompactStoreLocation
}

export function AppLayoutContent({ children, compactLocation }: AppLayoutProps) {
  const page = usePage<{ notice?: string; alert?: string; store?: Pick<Store, "name" | "discogs_username">; shopper?: { discogs_username: string } | null }>()
  const notice = page.props.notice
  const alertMsg = page.props.alert
  const storeName = page.props.store?.name
  const discogsUsername = page.props.store?.discogs_username
  const { theme, toggle } = useTheme()
  const { isCompact } = useViewport()
  const { pile } = usePileContext()
  const { shopper } = useShopperContext()
  const [pileOpen, setPileOpen] = useState(false)
  const handleClosePile = React.useCallback(() => setPileOpen(false), [])
  const compactCrateLocation = isCompact ? compactLocation : undefined
  const contextFocusRef = React.useRef<HTMLElement>(null)

  const header = (
    <header ref={contextFocusRef} tabIndex={-1} className="mc-header flex items-center justify-between px-4 py-2 sm:py-3 border-b border-mc-border sticky top-0 z-30 bg-mc-bg-raised/95 backdrop-blur-sm">
      <div className="flex min-w-0 items-center leading-none">
        {compactCrateLocation ? (
          <>
            <button
              type="button"
              onClick={compactCrateLocation.onBack}
              className="mr-3 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-mc-border bg-mc-bg-raised text-lg leading-none text-mc-text-dim transition-[color,border-color,transform] hover:border-mc-accent hover:text-mc-accent active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
              aria-label="Back to store"
            >
              <span aria-hidden="true" className="-translate-y-px">←</span>
            </button>
            <div className="min-w-0">
              <span className="mc-brand-title block truncate text-base font-bold text-mc-text">{compactCrateLocation.name}</span>
              <span className="block text-[10px] tracking-widest uppercase text-mc-text-dim">
                {compactCrateLocation.count === 1 ? "1 record" : `${compactCrateLocation.count} records`}
              </span>
            </div>
          </>
        ) : storeName ? (
          <div className="flex min-w-0 flex-col">
            <Link
              href={`/${discogsUsername}`}
              className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
            >
              <span className="mc-brand-title block truncate text-base font-bold text-mc-text">{storeName}</span>
            </Link>
            <Link
              href="/"
              className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
            >
              <span className="text-[10px] tracking-widest uppercase text-mc-text-dim">
                {isCompact ? "on MC" : "on Milkcrate"}
              </span>
            </Link>
          </div>
        ) : (
          <Link
            href="/"
            className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
          >
            <BrandMark size="small" />
          </Link>
        )}
      </div>
      <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
        {pile.length > 0 && (
          <button
            type="button"
            onClick={() => setPileOpen(true)}
            className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-xs font-semibold text-mc-accent hover:bg-mc-accent/10 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
            aria-label={`Pile (${pile.length})`}
            aria-expanded={pileOpen}
            aria-controls="pile-sheet"
          >
            Pile ({pile.length})
          </button>
        )}
        {!isCompact && (
          <button
            type="button"
            onClick={toggle}
            className="w-10 h-10 flex items-center justify-center rounded-full text-xl text-mc-text-dim hover:text-mc-text hover:bg-mc-bg-raised transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
            aria-label="Toggle light/dark mode"
          >
            {theme === "dark" ? "☀︎" : "☾"}
          </button>
        )}
      </div>
    </header>
  )

  const footer = (
    <footer className="flex flex-col items-center gap-3 px-4 py-4 border-t border-mc-border text-center">
      {shopper && (
        <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-mc-text-dim">
          <span>Connected to Discogs as @{shopper.discogs_username}</span>
          <DiscogsDisconnectForm />
        </div>
      )}
      <span className="text-[11px] text-mc-text-dim tracking-wide">
        Powered by <span className="font-medium">Milkcrate.</span>
      </span>
    </footer>
  )

  const flashMsg = notice || alertMsg
  const afterHeader = flashMsg ? (
    <FeedbackMessage
      tone={notice ? "success" : "danger"}
      live={notice ? "polite" : "assertive"}
      className="rounded-none border-x-0 px-4 py-2"
    >
      {flashMsg}
    </FeedbackMessage>
  ) : undefined

  return (
    <>
      <div inert={pileOpen} data-testid="storefront-background">
        <MilkcrateShell
          header={header}
          afterHeader={afterHeader}
          footer={footer}
          contentWidth="max-w-6xl"
          contentPadding="px-4 sm:px-6 lg:px-8 py-4 sm:py-8"
        >
          {children}
        </MilkcrateShell>
      </div>
      <PileSheet open={pileOpen} onClose={handleClosePile} returnFocusRef={contextFocusRef} />
    </>
  )
}

export default function AppLayout({ children, compactLocation }: AppLayoutProps) {
  return (
    <StorefrontMotionConfig>
      <ViewportProvider>
        <PileProvider>
          <ShopperProvider>
            <AppLayoutContent compactLocation={compactLocation}>{children}</AppLayoutContent>
          </ShopperProvider>
        </PileProvider>
      </ViewportProvider>
    </StorefrontMotionConfig>
  )
}
