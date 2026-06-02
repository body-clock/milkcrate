import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import InspectionHint from "./inspection_hint";
import StorefrontMotionConfig from "@/components/storefront_motion_config";

function renderHint(discovered: boolean) {
  return render(
    <StorefrontMotionConfig>
      <InspectionHint discovered={discovered} />
    </StorefrontMotionConfig>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("InspectionHint", () => {
  describe("happy path", () => {
    it("renders hint text when not yet discovered", () => {
      renderHint(false);

      expect(screen.getByText("Tap card to inspect")).toBeInTheDocument();
    });

    it("renders with role=status for screen reader announcement", () => {
      renderHint(false);

      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("does not render when flip has been discovered", () => {
      renderHint(true);

      expect(screen.queryByText("Tap card to inspect")).not.toBeInTheDocument();
    });
  });

  describe("integration: CardStack hides hint after flip", () => {
    it("renders null when discovered=true — hint will not reappear", () => {
      const { container } = renderHint(true);

      expect(container).toBeEmptyDOMElement();
    });
  });
});
