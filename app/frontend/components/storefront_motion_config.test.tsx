import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import StorefrontMotionConfig, { useReducedMotionContext } from "./storefront_motion_config"

// Component that consumes the context so we can assert behavior
function ContextReader() {
  const reduced = useReducedMotionContext()
  return <span data-testid="result">{String(reduced)}</span>
}

describe("StorefrontMotionConfig", () => {
  it("renders children without error", () => {
    render(
      <StorefrontMotionConfig>
        <p>hello</p>
      </StorefrontMotionConfig>,
    )
    expect(screen.getByText("hello")).toBeInTheDocument()
  })

  it("provides reduced-motion context to descendants", () => {
    render(
      <StorefrontMotionConfig>
        <ContextReader />
      </StorefrontMotionConfig>,
    )
    // In jsdom, prefers-reduced-motion defaults to false
    expect(screen.getByTestId("result").textContent).toBe("false")
  })

  it("returns true (reduced motion) when used outside the provider", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    let value: boolean | undefined
    function Outside() {
      value = useReducedMotionContext()
      return null
    }

    render(<Outside />)
    expect(value).toBe(true)

    warnSpy.mockRestore()
  })

  it("wraps children in framer-motion MotionConfig without errors", () => {
    // Verify that MotionConfig's reducedMotion="user" doesn't crash render
    const { container } = render(
      <StorefrontMotionConfig>
        <div data-testid="inner" />
      </StorefrontMotionConfig>,
    )
    expect(container.querySelector('[data-testid="inner"]')).toBeTruthy()
  })
})
