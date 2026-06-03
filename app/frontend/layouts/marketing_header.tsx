import React from "react";

import BrandMark from "@/components/brand_mark";
import { useTheme } from "@/hooks/use_theme";
import { useViewport } from "@/hooks/use_viewport";

// eslint-disable-next-line max-lines-per-function
export default function MarketingHeader() {
  const { theme, toggle } = useTheme();
  const { isCompact } = useViewport();

  return (
    <header className="mc-header border-b border-mc-border sticky top-0 z-30 bg-mc-bg-raised/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3 mx-auto w-full max-w-6xl">
        <a href="/" className="flex items-center gap-2 rounded" aria-label="Milkcrate home">
          <BrandMark />
        </a>
        {!isCompact && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggle}
              className="w-10 h-10 flex items-center justify-center rounded-full text-xl"
              aria-label="Toggle light/dark mode"
            >
              {theme === "dark" ? "☀︎" : "☾"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
