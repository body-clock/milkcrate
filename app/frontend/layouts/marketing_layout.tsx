import React from "react"
import { Link, usePage } from "@inertiajs/react"
import { useTheme } from "@/hooks/use_theme"
import BrandMark from "@/components/brand_mark"
import FeedbackMessage from "@/components/ui/feedback_message"
import { actionClassName } from "@/components/ui/action"
import MilkcrateShell from "@/layouts/milkcrate_shell"
import StorefrontMotionConfig from "@/components/storefront_motion_config"
import { ViewportProvider } from "@/contexts/viewport_context"
import { useViewport } from "@/hooks/use_viewport"

export function MarketingLayoutContent({ children }: { children: React.ReactNode }) {
  const { alert: alertMsg, notice: noticeMsg } = usePage<{ alert?: string; notice?: string }>().props
  const flashMsg = noticeMsg || alertMsg
  const { theme, toggle } = useTheme()
  const { isCompact } = useViewport()

  const header = (
    <header className="mc-header border-b mc-border sticky top-0 z-30 bg-mc-bg-raised/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3 mx-auto w-full max-w-6xl">
        <Link
          href="/"
          className="flex items-center gap-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
          aria-label="Milkcrate home"
        >
          <BrandMark />
        </Link>
        {!isCompact && (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/philadelphiamusic"
              className={actionClassName({ variant: "ghost", size: "sm" })}
            >
              Demo
            </Link>
            <Link
              href="/apply"
              className={actionClassName({ variant: "ghost", size: "sm" })}
            >
              Apply
            </Link>
            <button
              type="button"
              onClick={toggle}
              className="w-10 h-10 flex items-center justify-center rounded-full text-xl text-mc-text-dim hover:text-mc-text hover:bg-mc-bg-raised transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
              aria-label="Toggle light/dark mode"
            >
              {theme === "dark" ? "☀︎" : "☾"}
            </button>
          </div>
        )}
      </div>
    </header>
  )

  return (
    <MilkcrateShell
      header={header}
      afterHeader={flashMsg ? (
        <FeedbackMessage
          tone={noticeMsg ? "success" : "danger"}
          live={noticeMsg ? "polite" : "assertive"}
          className="rounded-none border-x-0 px-4 py-2"
        >
          {flashMsg}
        </FeedbackMessage>
      ) : undefined}
      contentWidth="max-w-6xl"
    >
      {children}
    </MilkcrateShell>
  )
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <StorefrontMotionConfig>
      <ViewportProvider>
        <MarketingLayoutContent>{children}</MarketingLayoutContent>
      </ViewportProvider>
    </StorefrontMotionConfig>
  )
}
