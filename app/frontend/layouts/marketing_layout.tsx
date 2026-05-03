import React from "react"
import { Link } from "@inertiajs/react"
import { useTheme } from "@/hooks/use_theme"

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggle } = useTheme()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="mc-header flex items-center justify-between px-4 py-3 border-b mc-border">
        <Link href="/" className="flex items-center gap-2">
          <span className="mc-wordmark text-xl font-bold tracking-widest uppercase">🥛 Milkcrate</span>
        </Link>
        <button
          type="button"
          onClick={toggle}
          className="w-10 h-10 flex items-center justify-center rounded-full text-xl text-mc-text-dim hover:text-mc-text hover:bg-mc-bg-raised transition-colors select-none"
          aria-label="Toggle light/dark mode"
        >
          {theme === "dark" ? "☀︎" : "☾"}
        </button>
      </header>

      <main className="flex-1 px-4 py-6">{children}</main>

    </div>
  )
}
