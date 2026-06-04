import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import MilkcrateShell from "./milkcrate_shell";

const EXPECTED_CHILDREN_COUNT = 3;

describe("MilkcrateShell", () => {
  it("renders a skip link targeting #main-content", () => {
    render(
      <MilkcrateShell header={<div>Header</div>}>
        <div>Content</div>
      </MilkcrateShell>,
    );

    const skipLink = screen.getByText("Skip to content");
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  it("renders the skip link with sr-only focus classes", () => {
    render(
      <MilkcrateShell header={<div>Header</div>}>
        <div>Content</div>
      </MilkcrateShell>,
    );

    const skipLink = screen.getByText("Skip to content");
    // sr-only hides until focused
    expect(skipLink.className).toContain("sr-only");
    // focus:not-sr-only reveals on focus
    expect(skipLink.className).toContain("focus:not-sr-only");
  });

  it("renders header content", () => {
    render(
      <MilkcrateShell header={<div data-testid="header-content">Header Area</div>}>
        <div>Content</div>
      </MilkcrateShell>,
    );

    expect(screen.getByTestId("header-content")).toBeInTheDocument();
    expect(screen.getByText("Header Area")).toBeInTheDocument();
  });

  it("renders children inside a main landmark with id main-content", () => {
    render(
      <MilkcrateShell header={<div>Header</div>}>
        <div>Page Content</div>
      </MilkcrateShell>,
    );

    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute("id", "main-content");
    expect(main).toContainElement(screen.getByText("Page Content"));
  });

  it("renders footer when provided", () => {
    render(
      <MilkcrateShell
        header={<div>Header</div>}
        footer={<div data-testid="footer-content">Footer Area</div>}
      >
        <div>Content</div>
      </MilkcrateShell>,
    );

    expect(screen.getByTestId("footer-content")).toBeInTheDocument();
    expect(screen.getByText("Footer Area")).toBeInTheDocument();
  });

  it("does not render footer element when footer prop is omitted", () => {
    render(
      <MilkcrateShell header={<div>Header</div>}>
        <div>Content</div>
      </MilkcrateShell>,
    );

    // No footer element should exist in the DOM
    expect(document.querySelector("footer")).not.toBeInTheDocument();
  });

  it("renders afterHeader content between header and main", () => {
    render(
      <MilkcrateShell
        header={<div>Header</div>}
        afterHeader={<div data-testid="after-header">Flash Notice</div>}
      >
        <div>Content</div>
      </MilkcrateShell>,
    );

    // Verify it exists
    expect(screen.getByTestId("after-header")).toBeInTheDocument();
    expect(screen.getByText("Flash Notice")).toBeInTheDocument();

    // Verify DOM order: header -> afterHeader -> main
    const shell = document.querySelector(".min-h-screen.flex.flex-col");
    expect(shell).toBeInTheDocument();
    const children = Array.from(shell!.children);
    // children[0] = skip link (a), [1] = header div, [2] = afterHeader div, [3] = main
    const indices = children.map((c) => c.tagName);
    // skip link (A), header (DIV), afterHeader (DIV), main (MAIN)
    expect(indices[0]).toBe("A"); // skip link
    expect(indices[1]).toBe("DIV"); // header
    const AFTER_HEADER_INDEX = 2;
    expect(indices[AFTER_HEADER_INDEX]).toBe("DIV"); // afterHeader
  });

  it("applies default content width class", () => {
    render(
      <MilkcrateShell header={<div>Header</div>}>
        <div>Content</div>
      </MilkcrateShell>,
    );

    const main = screen.getByRole("main");
    const contentDiv = main.querySelector("div");
    expect(contentDiv).toHaveClass("max-w-6xl");
  });

  it("applies custom contentWidth class", () => {
    render(
      <MilkcrateShell header={<div>Header</div>} contentWidth="max-w-4xl">
        <div>Content</div>
      </MilkcrateShell>,
    );

    const main = screen.getByRole("main");
    const contentDiv = main.querySelector("div");
    expect(contentDiv).toHaveClass("max-w-4xl");
  });

  it("applies custom contentPadding class", () => {
    render(
      <MilkcrateShell header={<div>Header</div>} contentPadding="p-8">
        <div>Content</div>
      </MilkcrateShell>,
    );

    const main = screen.getByRole("main");
    const contentDiv = main.querySelector("div");
    expect(contentDiv).toHaveClass("p-8");
  });

  it("renders without afterHeader when not provided", () => {
    render(
      <MilkcrateShell header={<div>Header</div>}>
        <div>Content</div>
      </MilkcrateShell>,
    );

    // There should be exactly one A (skip link), one DIV (header), and one MAIN
    const shell = document.querySelector(".min-h-screen.flex.flex-col");
    const children = Array.from(shell!.children);
    // Without afterHeader: A, header div, MAIN (3 elements)
    // With afterHeader: A, header div, afterHeader div, MAIN (4 elements)
    expect(children.length).toBe(EXPECTED_CHILDREN_COUNT);
  });
});
