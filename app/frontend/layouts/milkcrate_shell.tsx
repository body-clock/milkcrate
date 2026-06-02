import React from "react";

export interface MilkcrateShellProps {
  /** Header content — brand mark, navigation, theme toggle, store attribution, etc. */
  header: React.ReactNode;
  /** Optional content rendered between header and main (e.g. flash notices). */
  afterHeader?: React.ReactNode;
  /** Main page content. Wrapped in <main id="main-content">. */
  children: React.ReactNode;
  /** Optional footer content (attribution, links). */
  footer?: React.ReactNode;
  /** Tailwind max-width class for the main content container. Default: "max-w-6xl". */
  contentWidth?: string;
  /** Tailwind padding classes for the main content container. Default: "px-4 sm:px-6 lg:px-8 py-6 sm:py-12". */
  contentPadding?: string;
}

/**
 * Thin shared shell contract for Milkcrate surfaces.
 *
 * Provides the consistent layout skeleton — skip link, header region,
 * main content wrapper, and optional footer — while letting each surface
 * own its specific header actions, providers, and page-level decisions.
 *
 * This is NOT a mega-layout. It is a regional container. Each consumer
 * (MarketingLayout, AppLayout) passes its own header content, flash
 * notices, page children, and footer through the slot props.
 */
export default function MilkcrateShell({
  header,
  afterHeader,
  children,
  footer,
  contentWidth = "max-w-6xl",
  contentPadding = "px-4 sm:px-6 lg:px-8 py-6 sm:py-12",
}: MilkcrateShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Skip-to-content link — exactly matches existing pattern from both layouts */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded focus:bg-mc-accent focus:text-mc-on-accent focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>

      {header}

      {afterHeader}

      <main className="flex-1" id="main-content">
        <div className={`mx-auto w-full ${contentWidth} ${contentPadding}`}>{children}</div>
      </main>

      {footer}
    </div>
  );
}
