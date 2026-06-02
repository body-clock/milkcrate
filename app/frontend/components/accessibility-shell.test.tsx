import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import MilkcrateShell from "../layouts/milkcrate_shell";

describe("shell landmarks", () => {
  it("renders a main landmark with id=main-content and a skip-link targeting it", () => {
    render(<MilkcrateShell header={<div>Header</div>}><div>Page content</div></MilkcrateShell>)
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content")
    expect(screen.getByText("Skip to content")).toHaveAttribute("href", "#main-content")
  })

  it("renders exactly one main landmark", () => {
    render(<MilkcrateShell header={<div>Header</div>}><div>Page content</div></MilkcrateShell>)
    expect(screen.getAllByRole("main")).toHaveLength(1)
  })

  it("skip-link is sr-only until focused", () => {
    render(<MilkcrateShell header={<div>Header</div>}><div>Page content</div></MilkcrateShell>)
    const skipLink = screen.getByText("Skip to content")
    expect(skipLink.className).toContain("sr-only")
    expect(skipLink.className).toContain("focus:not-sr-only")
  })
})
