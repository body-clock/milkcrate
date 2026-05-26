import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import MarketingLayout, { MarketingLayoutContent } from "./marketing_layout"
import { renderWithTier } from "@/test/viewport-test-utils"
import type { ViewportTier } from "@/contexts/viewport_context"

vi.mock("@inertiajs/react", () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
  ),
  usePage: () => ({ props: {} }),
}))

function renderAtWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  })

  return render(
    <MarketingLayout>
      <p>Public content</p>
    </MarketingLayout>,
  )
}

function renderContentAtTier(tier: ViewportTier) {
  return renderWithTier(
    tier,
    <MarketingLayoutContent>
      <p>Public content</p>
    </MarketingLayoutContent>,
  )
}

describe("MarketingLayout header policy", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it.each([
    "comfy",
    "wide",
  ] as const)("preserves public utilities at the %s tier", (tier) => {
    renderContentAtTier(tier)

    const header = screen.getByRole("banner")
    expect(within(header).getByRole("link", { name: "Milkcrate home" })).toBeInTheDocument()
    expect(within(header).getByRole("link", { name: "Demo" })).toBeInTheDocument()
    expect(within(header).getByRole("link", { name: "Apply" })).toBeInTheDocument()
    expect(within(header).getByRole("button", { name: "Toggle light/dark mode" })).toBeInTheDocument()
    expect(within(header).getByRole("link", { name: "Apply" }).className).toContain("ring-mc-focus")
  })

  it("renders only the Milkcrate home link in compact public header chrome", () => {
    renderContentAtTier("compact")

    const header = screen.getByRole("banner")
    expect(within(header).getByRole("link", { name: "Milkcrate home" })).toBeInTheDocument()
    expect(within(header).queryByRole("link", { name: "Demo" })).not.toBeInTheDocument()
    expect(within(header).queryByRole("link", { name: "Apply" })).not.toBeInTheDocument()
    expect(within(header).queryByRole("button", { name: "Toggle light/dark mode" })).not.toBeInTheDocument()
  })

  it("applies compact policy through the production viewport provider", () => {
    renderAtWidth(390)

    const header = screen.getByRole("banner")
    expect(within(header).queryByRole("link", { name: "Demo" })).not.toBeInTheDocument()
  })
})
