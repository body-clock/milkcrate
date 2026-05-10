import React, { useCallback, useState } from "react"
import { Link, usePage, router } from "@inertiajs/react"
import { motion } from "framer-motion"
import { useTheme } from "@/hooks/use_theme"
import { PileProvider, usePileContext } from "@/contexts/pile_context"
import PileSheet from "@/components/pile_sheet"
import StorefrontMotionConfig from "@/components/storefront_motion_config"
import { ViewportProvider } from "@/contexts/viewport_context"
import { useViewport } from "@/hooks/use_viewport"
import { useScrollAwareHeader } from "@/hooks/use_scroll_aware_header"
import MobileTabBar, { type TabId } from "@/components/mobile_tab_bar"
import { springDrawer } from "@/lib/motion_tokens"

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const page = usePage()
  const props = page.props as any
  const flash = props.flash as { notice?: string; alert?: string } | undefined
  const storeName = props.store?.name as string | undefined
  const discogsUsername = props.store?.discogs_username as string | undefined
  const { theme, toggle } = useTheme()
  const { isCompact, isComfy, isWide } = useViewport()
  const { pile } = usePileContext()
  const [pileOpen, setPileOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>("browse")
  const { containerRef, headerY } = useScrollAwareHeader()

  const handleTabSelect = useCallback(
    (tab: TabId) => {
      if (tab === "pile") {
        setPileOpen((prev) => !prev)
        return
      }

      if (tab === activeTab) {
        // Re-tap: scroll to top or re-trigger genres scroll
        if (tab === "browse") {
          window.scrollTo({ top: 0, behavior: "smooth" })
        } else if (tab === "genres") {
          document.querySelector('[data-section="genre_grid"]')?.scrollIntoView({ behavior: "smooth" })
        }
        return
      }

      setActiveTab(tab)

      // Detect if we're in CrateView (page component has an active crate)
      const isInCrate = !!props.active_crate_slug

      if (tab === "browse" && isInCrate) {
        // Navigate back to the store floor
        router.visit(window.location.pathname)
        return
      }

      if (tab === "genres") {
        if (isInCrate) {
          // Navigate to floor, then scroll to genres after mount
          router.visit(window.location.pathname, {
            onFinish: () => {
              setTimeout(() => {
                document.querySelector('[data-section="genre_grid"]')?.scrollIntoView({ behavior: "smooth" })
              }, 100)
            },
          })
        } else {
          document.querySelector('[data-section="genre_grid"]')?.scrollIntoView({ behavior: "smooth" })
        }
        return
      }

      if (tab === "browse") {
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    },
    [activeTab, props.active_crate_slug],
  )

  // Reset active tab to browse when pile closes (pile tab is transient).
  const handlePileClose = useCallback(() => {
    setPileOpen(false)
    if (activeTab === "pile") {
      setActiveTab("browse")
    }
  }, [activeTab])

  return (
    <div className="min-h-screen flex flex-col">
      {isCompact ? (
        <motion.header
          className="mc-header flex items-center justify-between px-4 py-2 border-b mc-border fixed top-0 left-0 right-0 z-30 bg-mc-bg/95 backdrop-blur-sm"
          style={{ y: headerY }}
          transition={springDrawer}
        >
          <Link href="/" className="flex flex-col leading-none min-w-0">
            {storeName ? (
              <>
                <span className="text-base font-bold tracking-wide mc-text truncate">{storeName}</span>
                <span className="text-[9px] tracking-widest uppercase text-mc-text-dim">on MC</span>
              </>
            ) : (
              <span className="mc-wordmark text-lg font-bold tracking-widest uppercase whitespace-nowrap">🥛 Milkcrate</span>
            )}
          </Link>
          <div className="flex items-center gap-2 flex-shrink-0">
            {discogsUsername && (
              <a
                href={`https://www.discogs.com/seller/${discogsUsername}/profile`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-mc-text-dim hover:text-mc-text transition-colors select-none"
                aria-label="View store on Discogs"
              >
                Store ↗
              </a>
            )}
            <button
              type="button"
              onClick={toggle}
              className="w-8 h-8 flex items-center justify-center rounded-full text-lg text-mc-text-dim hover:text-mc-text hover:bg-mc-bg-raised transition-colors select-none"
              aria-label="Toggle light/dark mode"
            >
              {theme === "dark" ? "☀︎" : "☾"}
            </button>
          </div>
        </motion.header>
      ) : (
        <header className="mc-header flex items-center justify-between px-4 py-2 sm:py-3 border-b mc-border sticky top-0 z-30 bg-mc-bg/95 backdrop-blur-sm">
          <Link href="/" className="flex flex-col leading-none min-w-0">
            {storeName ? (
              <>
                <span className="text-base font-bold tracking-wide mc-text truncate">{storeName}</span>
                <span className="text-[9px] sm:text-[10px] tracking-widest uppercase text-mc-text-dim">
                  on Milkcrate
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
                Discogs ↗
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
      )}

      {flash?.notice && (
        <div className="px-4 py-2 text-sm mc-notice" role="alert">
          {flash.notice}
        </div>
      )}

      <main
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        style={{
          paddingTop: isCompact ? 48 : undefined,
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: isCompact ? 56 : undefined,
        }}
      >
        {children}
      </main>

      {!isCompact && (
        <footer className="px-4 py-4 border-t mc-border text-center">
          <span className="text-[11px] text-mc-text-dim tracking-wide">
            Powered by <span className="font-semibold tracking-widest uppercase">🥛 Milkcrate</span>
          </span>
        </footer>
      )}

      {isCompact && (
        <MobileTabBar activeTab={activeTab} pileOpen={pileOpen} onSelect={handleTabSelect} />
      )}

      <PileSheet open={pileOpen} onClose={handlePileClose} />
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
