import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import BrandMark from "./brand_mark";

// Characters we must NOT render — emoji glyphs
const emojiChars = ["🥛", "📀", "👀", "📦", "♪"];

describe("BrandMark", () => {
  describe("default rendering", () => {
    it("renders the wordmark text so the brand is identifiable", () => {
      render(<BrandMark />);

      expect(screen.getByText("Milkcrate.")).toBeInTheDocument();
    });

    it("does not render any SVG element (text-only identity)", () => {
      render(<BrandMark />);

      expect(document.querySelector("svg")).not.toBeInTheDocument();
    });
  });

  describe("emoji regression", () => {
    it("does not render any emoji glyphs in the accessible output", () => {
      render(<BrandMark />);

      const textContent = document.body.textContent || "";

      for (const emoji of emojiChars) {
        expect(textContent).not.toContain(emoji);
      }
    });
  });

  describe("props", () => {
    it("accepts and applies a className prop", () => {
      render(<BrandMark className="test-custom-class" />);

      const container = document.querySelector(".test-custom-class");
      expect(container).toBeInTheDocument();
      expect(container).toContainElement(screen.getByText("Milkcrate."));
    });

    it("renders small variant with smaller wordmark text", () => {
      render(<BrandMark size="small" />);

      const wordmark = screen.getByText("Milkcrate.");
      expect(wordmark.className).toContain("text-lg");
      expect(wordmark.className).toContain("font-medium");
    });

    it("renders large variant with larger wordmark text", () => {
      render(<BrandMark size="large" />);

      const wordmark = screen.getByText("Milkcrate.");
      expect(wordmark.className).toContain("text-3xl");
      expect(wordmark.className).toContain("font-semibold");
    });
  });
});
