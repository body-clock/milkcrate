import React, { type ReactNode } from "react"
import { render, type RenderOptions } from "@testing-library/react"
import { ViewportContext, type ViewportTier } from "@/contexts/viewport_context"

/**
 * Wrap children in a ViewportContext with a fixed tier, bypassing matchMedia.
 * Use in tests to render a component at a specific viewport tier.
 *
 * @example
 *   const { container } = renderWithTier("comfy", <StoreFloor ... />)
 */
export function renderWithTier(tier: ViewportTier, ui: ReactNode, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <ViewportContext.Provider value={{ tier }}>{children}</ViewportContext.Provider>
    ),
    ...options,
  })
}

/**
 * Return a wrapper component that injects a fixed viewport tier.
 * Useful with renderHook or when you need the wrapper separately.
 */
export function TierWrapper(tier: ViewportTier) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ViewportContext.Provider value={{ tier }}>{children}</ViewportContext.Provider>
  }
}
