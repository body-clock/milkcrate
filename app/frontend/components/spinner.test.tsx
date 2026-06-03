import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import Spinner from "./spinner";

describe("Spinner", () => {
  it("renders an SVG with aria-hidden", () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector("svg");
    expect(svg).toBeDefined();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("accepts size prop", () => {
    const { container } = render(<Spinner size="lg" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("h-8");
    expect(svg?.getAttribute("class")).toContain("w-8");
  });
});
