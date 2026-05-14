import React from "react"
import { Link } from "@inertiajs/react"
import { useTheme } from "@/hooks/use_theme"
import BrandMark from "@/components/brand_mark"
import MilkcrateShell from "@/layouts/milkcrate_shell"

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggle } = useTheme()

  const header = (
    <header className="mc-header border-b mc-border">
      <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto w-full">
        <Link
          href="/"
          className="flex items-center gap-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
          aria-label="Milkcrate home"
        >
          <BrandMark />
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
  )

  return (
    <MilkcrateShell header={header} contentWidth="max-w-6xl">
      {children}
    </MilkcrateShell>
  )
}
