import React from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import Badge from "./badge"
import Button from "./button"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import EmptyState from "./empty_state"
import FeedbackMessage from "./feedback_message"
import Field from "./field"
import JobProgressBar from "./job_progress_bar"
import Metric from "./metric"
import SectionHeader from "./section_header"
import StatusDot from "./status_dot"
import { ActionLink } from "./action"

describe("UI primitives", () => {
  it("renders badge text with semantic health variant classes", () => {
    render(<Badge variant="danger">Needs attention</Badge>)

    const badge = screen.getByText("Needs attention")
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain("text-mc-feedback-danger")
    expect(badge.className).not.toMatch(/red-|amber-|emerald-|sky-/)
  })

  it("shares semantic action styling while retaining native button and link semantics", () => {
    render(
      <>
        <Button variant="danger">Remove</Button>
        <ActionLink href="/apply" variant="danger">Apply</ActionLink>
      </>,
    )

    const button = screen.getByRole("button", { name: "Remove" })
    const link = screen.getByRole("link", { name: "Apply" })
    expect(button.className).toContain("text-mc-feedback-danger")
    expect(link.className).toContain("text-mc-feedback-danger")
    expect(button.className).toContain("ring-mc-focus")
    expect(link.className).toContain("ring-mc-focus")
    expect(link).toHaveAttribute("href", "/apply")
  })

  it("communicates busy and disabled action states programmatically", () => {
    render(
      <>
        <Button busy>Onboarding</Button>
        <ActionLink href="/apply" busy tabIndex={0}>Checking</ActionLink>
      </>,
    )

    const button = screen.getByRole("button", { name: "Onboarding" })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute("aria-busy", "true")

    const link = screen.getByRole("link", { name: "Checking" })
    expect(link).toHaveAttribute("aria-disabled", "true")
    expect(link).toHaveAttribute("aria-busy", "true")
    expect(link).toHaveAttribute("tabindex", "-1")
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

  it("renders a section header with optional description and landmark target", () => {
    render(<SectionHeader id="applicants-heading" title="Applicants" description="Stores waiting to be onboarded" />)

    expect(screen.getByRole("heading", { name: "Applicants" })).toHaveAttribute("id", "applicants-heading")
    expect(screen.getByText("Stores waiting to be onboarded")).toBeInTheDocument()
  })

  it("associates labels, hints, and errors through the canonical field contract", () => {
    render(
      <Field id="seller-email" label="Email" hint="Used for updates" error="Email is required">
        <input type="email" />
      </Field>,
    )

    const field = screen.getByRole("textbox", { name: "Email" })
    expect(field).toHaveAttribute("id", "seller-email")
    expect(field).toHaveAttribute("aria-invalid", "true")
    expect(field).toHaveAttribute("aria-describedby", "seller-email-hint seller-email-error")
    expect(field.className).toContain("focus:border-mc-focus")
    expect(screen.getByRole("alert")).toHaveClass("text-mc-feedback-danger")
  })

  it("renders semantic feedback and status without raw palette ownership", () => {
    const { container } = render(
      <>
        <FeedbackMessage tone="danger" live="assertive">Sync failed</FeedbackMessage>
        <StatusDot variant="working" label="Processing" />
        <JobProgressBar label="Sync" status="completed" />
      </>,
    )

    expect(screen.getByRole("alert")).toHaveTextContent("Sync failed")
    expect(screen.getByText("Processing")).toBeInTheDocument()
    expect(container.innerHTML).toContain("mc-feedback-danger")
    expect(container.innerHTML).toContain("mc-feedback-progress")
    expect(container.innerHTML).toContain("mc-feedback-success")
    expect(container.innerHTML).not.toMatch(/red-|amber-|emerald-|sky-/)
  })

  it("renders reusable metric and empty-state composition", () => {
    render(
      <>
        <dl>
          <Metric label="Inventory" value="12 listings" />
        </dl>
        <EmptyState action={<Button>Retry</Button>}>No stores online yet.</EmptyState>
      </>,
    )

    expect(screen.getByText("Inventory")).toBeInTheDocument()
    expect(screen.getByText("12 listings")).toBeInTheDocument()
    expect(screen.getByText("No stores online yet.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument()
  })
})
