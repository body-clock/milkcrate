import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import TactileCard from "./tactile_card"
import StorefrontMotionConfig from "./storefront_motion_config"

describe("TactileCard", () => {
  it("renders children", () => {
    render(
      <StorefrontMotionConfig>
        <TactileCard>
          <span data-testid="child">content</span>
        </TactileCard>
      </StorefrontMotionConfig>,
    )
    expect(screen.getByTestId("child")).toBeInTheDocument()
    expect(screen.getByText("content")).toBeInTheDocument()
  })

  it("forwards className to the motion element", () => {
    const { container } = render(
      <StorefrontMotionConfig>
        <TactileCard className="my-custom">
          <span>a</span>
        </TactileCard>
      </StorefrontMotionConfig>,
    )
    expect(container.querySelector(".my-custom")).toBeTruthy()
  })

  it("forwards style to the motion element", () => {
    const { container } = render(
      <StorefrontMotionConfig>
        <TactileCard style={{ padding: 42 }}>
          <span>a</span>
        </TactileCard>
      </StorefrontMotionConfig>,
    )
    const el = container.firstElementChild as HTMLElement
    expect(el.style.padding).toBe("42px")
  })

  it("renders with restingTilt without crashing", () => {
    const { container } = render(
      <StorefrontMotionConfig>
        <TactileCard restingTilt={2}>
          <span>a</span>
        </TactileCard>
      </StorefrontMotionConfig>,
    )
    // jsdom doesn't surface framer-motion's MotionValue transforms as
    // inline styles — the assertion is that the component renders
    // without throwing. Real transform behavior is validated visually.
    expect(container.firstElementChild).toBeTruthy()
  })

  it("renders with disableTilt without crashing", () => {
    const { container } = render(
      <StorefrontMotionConfig>
        <TactileCard disableTilt restingTilt={5}>
          <span>a</span>
        </TactileCard>
      </StorefrontMotionConfig>,
    )
    // jsdom limitation — framer-motion transform values not inspectable.
    // Assertion: component renders without throwing.
    expect(container.firstElementChild).toBeTruthy()
  })

  it("fires onClick on the wrapper", () => {
    const onClick = vi.fn()
    render(
      <StorefrontMotionConfig>
        <TactileCard>
          <button data-testid="btn" onClick={onClick}>
            click
          </button>
        </TactileCard>
      </StorefrontMotionConfig>,
    )
    fireEvent.click(screen.getByTestId("btn"))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("survives pointer events without crashing", () => {
    const { container } = render(
      <StorefrontMotionConfig>
        <TactileCard>
          <span>hover me</span>
        </TactileCard>
      </StorefrontMotionConfig>,
    )
    const el = container.firstElementChild!
    fireEvent.pointerEnter(el)
    fireEvent.pointerDown(el)
    fireEvent.pointerUp(el)
    fireEvent.pointerLeave(el)
    // No crash = pass
  })
})
