import React from "react"

export interface MilkcrateShellProps {
  header: React.ReactNode
  afterHeader?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  contentWidth?: string
  contentPadding?: string
}

export default function MilkcrateShell({ header, afterHeader, children, footer, contentWidth = "max-w-6xl", contentPadding = "px-4 sm:px-6 lg:px-8 py-6 sm:py-12" }: MilkcrateShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded focus:bg-mc-accent focus:text-mc-on-accent focus:text-sm focus:font-medium">Skip to content</a>
      {header}
      {afterHeader}
      <main className="flex-1" id="main-content">
        <div className={`mx-auto w-full ${contentWidth} ${contentPadding}`}>{children}</div>
      </main>
      {footer}
    </div>
  )
}
