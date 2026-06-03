import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { ActionLink } from "./action";
import Badge from "./badge";
import Button from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import EmptyState from "./empty_state";
import FeedbackMessage from "./feedback_message";
import Field from "./field";
import JobProgressBar from "./job_progress_bar";
import Metric from "./metric";
import SectionHeader from "./section_header";
import StatusDot from "./status_dot";

describe("UI primitives", () => {
  it("renders badge text with semantic health variant classes", () => {
    render(<Badge variant="danger">Needs attention</Badge>);

    const badge = screen.getByText("Needs attention");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("text-mc-feedback-danger");
    expect(badge.className).not.toMatch(/red-|amber-|emerald-|sky-/);
  });

  it("shares semantic action styling while retaining native button and link semantics", () => {
    render(
      <>
        <Button variant="danger">Remove</Button>
        <ActionLink href="/apply" variant="danger">
          Apply
        </ActionLink>
      </>,
    );

    const button = screen.getByRole("button", { name: "Remove" });
    const link = screen.getByRole("link", { name: "Apply" });
    expect(button.className).toContain("text-mc-feedback-danger");
    expect(link.className).toContain("text-mc-feedback-danger");
    expect(button.className).toContain("ring-mc-focus");
    expect(link.className).toContain("ring-mc-focus");
    expect(link).toHaveAttribute("href", "/apply");
  });

  it("communicates busy and disabled action states programmatically", () => {
    render(
      <>
        <Button busy>Onboarding</Button>
        <ActionLink href="/apply" busy tabIndex={0}>
          Checking
        </ActionLink>
      </>,
    );

    const button = screen.getByRole("button", { name: "Onboarding" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    const link = screen.getByRole("link", { name: "Checking" });
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).toHaveAttribute("aria-busy", "true");
    expect(link).toHaveAttribute("tabindex", "-1");
  });

  it("renders action variants and sizes with shared canonical styling", () => {
    render(
      <>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <ActionLink href="/apply" variant="ghost" size="sm">
          Ghost Link
        </ActionLink>
      </>,
    );

    const small = screen.getByRole("button", { name: "Small" });
    expect(small.className).toContain("ring-mc-focus");
    expect(small.className).toContain("rounded-md");

    const large = screen.getByRole("button", { name: "Large" });
    expect(large.className).toContain("ring-mc-focus");

    const secondary = screen.getByRole("button", { name: "Secondary" });
    expect(secondary.className).toContain("ring-mc-focus");
    expect(secondary.className).not.toMatch(/red-|amber-|emerald-|sky-/);

    const ghost = screen.getByRole("button", { name: "Ghost" });
    expect(ghost.className).toContain("ring-mc-focus");
    expect(ghost.className).toContain("rounded-md");

    const ghostLink = screen.getByRole("link", { name: "Ghost Link" });
    expect(ghostLink.className).toContain("ring-mc-focus");
    expect(ghostLink).toHaveAttribute("href", "/apply");
  });

  it("renders ActionLink disabled (non-busy) as aria-disabled with tabindex -1", () => {
    render(
      <ActionLink href="/apply" disabled>
        Disabled Link
      </ActionLink>,
    );

    const link = screen.getByRole("link", { name: "Disabled Link" });
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).toHaveAttribute("tabindex", "-1");
    expect(link).not.toHaveAttribute("aria-busy");
  });

  it("renders card structure without forcing nested interactive markup", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Live stores</CardTitle>
        </CardHeader>
        <CardContent>Store content</CardContent>
      </Card>,
    );

    expect(screen.getByRole("heading", { name: "Live stores" })).toBeInTheDocument();
    expect(screen.getByText("Store content")).toBeInTheDocument();
  });

  it("renders a section header with optional description and landmark target", () => {
    render(
      <SectionHeader
        id="applicants-heading"
        title="Applicants"
        description="Stores waiting to be onboarded"
      />,
    );

    expect(screen.getByRole("heading", { name: "Applicants" })).toHaveAttribute(
      "id",
      "applicants-heading",
    );
    expect(screen.getByText("Stores waiting to be onboarded")).toBeInTheDocument();
  });

  it("associates labels, hints, and errors through the canonical field contract", () => {
    render(
      <Field id="seller-email" label="Email" hint="Used for updates" error="Email is required">
        <input type="email" />
      </Field>,
    );

    const field = screen.getByRole("textbox", { name: "Email" });
    expect(field).toHaveAttribute("id", "seller-email");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAttribute("aria-describedby", "seller-email-hint seller-email-error");
    expect(field.className).toContain("focus:border-mc-focus");
    expect(screen.getByRole("alert")).toHaveClass("text-mc-feedback-danger");
  });

  it("auto-generates field id from useId when no id prop is given", () => {
    render(
      <Field label="Name">
        <input />
      </Field>,
    );

    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input).toHaveAttribute("id");
    expect(input.getAttribute("id")).toBeTruthy();
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(screen.getByText("Name").closest("label")).toHaveAttribute("for", input.id);
  });

  it("propagates disabled and busy state to child control through Field", () => {
    const { rerender } = render(
      <Field label="Email" disabled>
        <input />
      </Field>,
    );

    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toBeDisabled();

    rerender(
      <Field label="Email" busy>
        <input />
      </Field>,
    );

    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("aria-busy", "true");
  });

  it("renders semantic feedback and status without raw palette ownership", () => {
    const { container } = render(
      <>
        <FeedbackMessage tone="danger" live="assertive">
          Sync failed
        </FeedbackMessage>
        <FeedbackMessage tone="success" live="polite">
          Saved
        </FeedbackMessage>
        <StatusDot variant="working" label="Processing" />
        <JobProgressBar label="Sync" status="completed" />
      </>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Sync failed");
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Processing")).toBeInTheDocument();
    expect(container.innerHTML).toContain("mc-feedback-danger");
    expect(container.innerHTML).toContain("mc-feedback-progress");
    expect(container.innerHTML).toContain("mc-feedback-success");
    expect(container.innerHTML).not.toMatch(/red-|amber-|emerald-|sky-/);
  });

  it("renders reusable metric and empty-state composition", () => {
    render(
      <>
        <dl>
          <Metric label="Inventory" value="12 listings" />
        </dl>
        <EmptyState action={<Button>Retry</Button>}>No stores online yet.</EmptyState>
      </>,
    );

    expect(screen.getByText("Inventory")).toBeInTheDocument();
    expect(screen.getByText("12 listings")).toBeInTheDocument();
    expect(screen.getByText("No stores online yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("renders empty state without action slot when no action provided", () => {
    const { container } = render(<EmptyState>No items</EmptyState>);

    expect(screen.getByText("No items")).toBeInTheDocument();
    expect(container.querySelector("button")).not.toBeInTheDocument();
  });
});
