import React from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import BrandMark from "./brand_mark"

// Characters we must NOT render — emoji glyphs
const emojiChars = ["🥛", "📀", "👀", "📦", "♪"]

describe("BrandMark", () => {
  describe("default rendering", () => {
    it("renders the wordmark text so the brand is identifiable", () => {
      render(<BrandMark />)

      // Default: wordmark visible, SVG is decorative (aria-hidden).
      // The visible text provides the accessible name.
      expect(screen.getByText("Milkcrate")).toBeInTheDocument()
    })

    it("renders the wordmark text by default", () => {
      render(<BrandMark />)

      // The wordmark text should be visible when showWordmark default is true
      expect(screen.getByText("Milkcrate")).toBeInTheDocument()
    })

    it("contains an SVG element for the crate-plus-record mark", () => {
      render(<BrandMark />)

      // There should be an SVG element rendered
      const svg = document.querySelector("svg")
      expect(svg).toBeInTheDocument()
      // SVG should have a viewBox for scalability
      expect(svg).toHaveAttribute("viewBox")
    })

    it("uses theme-safe identity color instead of hardcoded icon paint", () => {
      render(<BrandMark />)

      const svg = document.querySelector("svg")
      expect(svg).toHaveClass("text-mc-text")
      expect(svg?.innerHTML).not.toContain('stroke="white"')
      expect(svg?.innerHTML).not.toContain('fill="white"')
    })
  })

  describe("emoji regression", () => {
    it("does not render any emoji glyphs in the accessible output", () => {
      render(<BrandMark />)

      const textContent = document.body.textContent || ""

      for (const emoji of emojiChars) {
        expect(textContent).not.toContain(emoji)
      }
    })

    it("does not render emoji when showWordmark is false", () => {
      render(<BrandMark showWordmark={false} />)

      const textContent = document.body.textContent || ""

      for (const emoji of emojiChars) {
        expect(textContent).not.toContain(emoji)
      }
    })
  })

  describe("props", () => {
    it("hides wordmark when showWordmark is false", () => {
      render(<BrandMark showWordmark={false} />)

      // The SVG should still be present...
      expect(document.querySelector("svg")).toBeInTheDocument()
      // ...but the wordmark text should not be visible
      expect(screen.queryByText("Milkcrate")).not.toBeInTheDocument()
    })

    it("renders wordmark when showWordmark is true", () => {
      render(<BrandMark showWordmark={true} />)

      expect(screen.getByText("Milkcrate")).toBeInTheDocument()
    })

    it("accepts and applies a className prop", () => {
      render(<BrandMark className="test-custom-class" />)

      // The className should appear on the outer wrapper
      const container = document.querySelector(".test-custom-class")
      expect(container).toBeInTheDocument()
      // It should still contain the wordmark
      expect(container).toContainElement(screen.getByText("Milkcrate"))
    })

    it("renders small variant with appropriate dimensions", () => {
      render(<BrandMark size="small" showWordmark={false} />)

      const svg = document.querySelector("svg")
      expect(svg).toHaveAttribute("width", "24")
      expect(svg).toHaveAttribute("height", "24")
    })

    it("renders large variant without clipping", () => {
      render(<BrandMark size="large" />)

      const svg = document.querySelector("svg")
      expect(svg).toHaveAttribute("width", "40")
      expect(svg).toHaveAttribute("height", "40")
      expect(svg).toHaveAttribute("viewBox")
    })
  })

  describe("accessibility", () => {
    it("uses aria-hidden on the SVG when wordmark provides the name", () => {
      render(<BrandMark showWordmark={true} />)

      const svg = document.querySelector("svg")
      // When wordmark is shown, SVG should be decorative
      expect(svg).toHaveAttribute("aria-hidden", "true")
    })

    it("uses aria-label on the SVG when wordmark is hidden", () => {
      render(<BrandMark showWordmark={false} />)

      const img = screen.getByRole("img", { name: "Milkcrate" })
      expect(img.tagName).toBe("svg")
    })
  })
})
