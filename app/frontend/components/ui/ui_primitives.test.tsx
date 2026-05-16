import React from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import Badge from "./badge"
import Button from "./button"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import SectionHeader from "./section_header"
import StatusDot from "./status_dot"

describe("UI primitives", () => {
  it("renders badge text with health variant classes", () => {
    render(<Badge variant="danger">Needs attention</Badge>)

    const badge = screen.getByText("Needs attention")
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain("border")
  })

  it("renders a disabled button with native disabled semantics", () => {
    render(<Button disabled>Onboarding</Button>)

    const button = screen.getByRole("button", { name: "Onboarding" })
    expect(button).toBeDisabled()
  })

  it("renders card structure without forcing nested interactive markup", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Live stores</CardTitle>
        </CardHeader>
        <CardContent>Store content</CardContent>
      </Card>
    )

    expect(screen.getByRole("heading", { name: "Live stores" })).toBeInTheDocument()
    expect(screen.getByText("Store content")).toBeInTheDocument()
  })

  it("renders a section header with optional description", () => {
    render(<SectionHeader title="Applicants" description="Stores waiting to be onboarded" />)

    expect(screen.getByRole("heading", { name: "Applicants" })).toBeInTheDocument()
    expect(screen.getByText("Stores waiting to be onboarded")).toBeInTheDocument()
  })

  it("does not rely on color-only status meaning", () => {
    render(<StatusDot variant="working" label="Processing" />)

    expect(screen.getByText("Processing")).toBeInTheDocument()
  })
})
