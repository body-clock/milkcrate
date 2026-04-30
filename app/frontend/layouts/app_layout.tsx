import React from "react"
import { Link, usePage } from "@inertiajs/react"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const page = usePage()
  const flash = (page.props as any).flash as { notice?: string; alert?: string } | undefined

  return (
    <div className="min-h-screen flex flex-col">
      <header className="mc-header flex items-center justify-between px-4 py-3 border-b mc-border">
        <Link href="/" className="mc-wordmark text-xl font-bold tracking-widest uppercase">
          🥛 Milkcrate
        </Link>
      </header>

      {flash?.notice && (
        <div className="px-4 py-2 text-sm mc-notice" role="alert">
          {flash.notice}
        </div>
      )}

      <main className="flex-1 px-4 py-6">{children}</main>
    </div>
  )
}
