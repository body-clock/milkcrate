import React from "react"
import { Link } from "@inertiajs/react"
import { useTheme } from "@/hooks/use_theme"

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
            <span className="mc-wordmark text-xl font-bold tracking-widest uppercase">🥛 Milkcrate</span>
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

      <main className="flex-1" id="main-content">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
          {children}
        </div>
      </main>

    </div>
  )
}
