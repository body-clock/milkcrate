import React from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import LeadScoreBadge, { scoreTier } from "@/components/admin/lead-score-badge"

describe("LeadScoreBadge", () => {
  it("renders the score value", () => {
    render(<LeadScoreBadge score={85} />)
    expect(screen.getByText("85")).toBeDefined()
  })

  it("renders em dash for null score", () => {
    render(<LeadScoreBadge score={null} />)
    expect(screen.getByText("—")).toBeDefined()
  })

  it("rounds decimal scores", () => {
    render(<LeadScoreBadge score={78.9} />)
    expect(screen.getByText("79")).toBeDefined()
  })
})

describe("scoreTier", () => {
  it("returns high for score >= 60", () => {
    expect(scoreTier(60)).toBe("high")
    expect(scoreTier(85)).toBe("high")
  })

  it("returns medium for score 30-59", () => {
    expect(scoreTier(30)).toBe("medium")
    expect(scoreTier(45)).toBe("medium")
  })

  it("returns low for score < 30", () => {
    expect(scoreTier(0)).toBe("low")
    expect(scoreTier(15)).toBe("low")
  })

  it("returns none for null score", () => {
    expect(scoreTier(null)).toBe("none")
  })
})
