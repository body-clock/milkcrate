import React from "react"
import { Link } from "@inertiajs/react"
import { useTheme } from "@/hooks/use_theme"
import Text from "@/components/text"

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggle } = useTheme()

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded focus:bg-mc-accent focus:text-mc-on-accent focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>
      <header className="mc-header border-b mc-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto w-full">
          <Link
            href="/"
            className="flex items-center gap-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
          >
            <Text variant="display">🥛 Milkcrate</Text>
          </Link>
          <button
            type="button"
            onClick={toggle}
            className="w-10 h-10 flex items-center justify-center rounded-full text-xl text-mc-text-dim hover:text-mc-text hover:bg-mc-bg-raised transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
            aria-label="Toggle light/dark mode"
          >
            {theme === "dark" ? "☀︎" : "☾"}
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-6" id="main-content">{children}</main>

    </div>
  )
}
