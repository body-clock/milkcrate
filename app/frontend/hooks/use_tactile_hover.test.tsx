import React from "react"
import { describe, it, expect, vi, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useTactileHover } from "./use_tactile_hover"
import StorefrontMotionConfig from "@/components/storefront_motion_config"

// Minimal pointer event stub
function pointerEvent(
  overrides: Partial<React.PointerEvent> = {},
): React.PointerEvent {
  return {
    pointerType: "mouse",
    clientX: 0,
    clientY: 0,
    currentTarget: {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        right: 100,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    },
    ...overrides,
  } as unknown as React.PointerEvent
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <StorefrontMotionConfig>{children}</StorefrontMotionConfig>
)

describe("useTactileHover", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns idle state initially", () => {
    const { result } = renderHook(() => useTactileHover(), { wrapper })

    expect(result.current.isHovered).toBe(false)
    expect(result.current.isPressed).toBe(false)
    expect(result.current.proximity).toBe(0)
    expect(result.current.transform).toEqual({ rotate: 0, scale: 1, y: 0 })
  })

  it("computes proximity on pointer enter (mouse) from enter event position", () => {
    const { result } = renderHook(() => useTactileHover(), { wrapper })

    // Enter at element center (50, 50) — should get high proximity immediately
    act(() =>
      result.current.handlers.onPointerEnter(
        pointerEvent({ pointerType: "mouse", clientX: 50, clientY: 50 }),
      ),
    )

    // At center: proximity should be near 1 without needing a move event
    expect(result.current.proximity).toBeGreaterThan(0.9)
    expect(result.current.isHovered).toBe(true)
  })

  it("sets proximity=1 on pointer enter (touch — binary fallback)", () => {
    const { result } = renderHook(() => useTactileHover(), { wrapper })

    act(() =>
      result.current.handlers.onPointerEnter(
        pointerEvent({ pointerType: "touch" }),
      ),
    )

    expect(result.current.proximity).toBe(1)
    expect(result.current.isHovered).toBe(true)
  })

  it("resets to idle on pointer leave", () => {
    const { result } = renderHook(() => useTactileHover(), { wrapper })

    act(() =>
      result.current.handlers.onPointerEnter(
        pointerEvent({ pointerType: "touch" }),
      ),
    )
    expect(result.current.proximity).toBe(1)

    act(() => result.current.handlers.onPointerLeave(pointerEvent()))

    expect(result.current.proximity).toBe(0)
    expect(result.current.isHovered).toBe(false)
    expect(result.current.isPressed).toBe(false)
  })

  it("computes proximity from cursor position on pointer move", () => {
    // Mock rAF to fire synchronously for testing
    const rafSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0)
        return 1
      })
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {})

    const { result } = renderHook(() => useTactileHover(), { wrapper })

    // Enter as mouse first so isTouchRef is false
    act(() =>
      result.current.handlers.onPointerEnter(
        pointerEvent({ pointerType: "mouse" }),
      ),
    )

    // Move cursor to element center (50, 50) — should be max proximity
    act(() =>
      result.current.handlers.onPointerMove(
        pointerEvent({ clientX: 50, clientY: 50 }),
      ),
    )

    // At center: dist=0, proximity = 1 - 0/maxDist = 1
    expect(result.current.proximity).toBeCloseTo(1, 1)
    // isHovered derived: proximity > 0
    expect(result.current.isHovered).toBe(true)

    rafSpy.mockRestore()
  })

  it("lowers proximity as cursor moves away from center", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(
      (cb: FrameRequestCallback) => {
        cb(0)
        return 1
      },
    )
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {})

    const { result } = renderHook(() => useTactileHover(), { wrapper })

    act(() =>
      result.current.handlers.onPointerEnter(
        pointerEvent({ pointerType: "mouse" }),
      ),
    )

    // Move cursor to the element edge (0, 50) — far from center
    act(() =>
      result.current.handlers.onPointerMove(
        pointerEvent({ clientX: 0, clientY: 50 }),
      ),
    )

    // dist=50, maxDist = hypot(100,100)*0.6 ≈ 84.9, proximity ≈ 0.41
    expect(result.current.proximity).toBeGreaterThan(0)
    expect(result.current.proximity).toBeLessThan(0.6)

    vi.restoreAllMocks()
  })

  it("sets isPressed on pointer down", () => {
    const { result } = renderHook(() => useTactileHover(), { wrapper })

    act(() => result.current.handlers.onPointerDown(pointerEvent()))

    expect(result.current.isPressed).toBe(true)
    expect(result.current.transform.scale).toBeLessThan(1) // SCALE_PRESS
  })

  it("uses snappier transition when pressed", () => {
    const { result } = renderHook(() => useTactileHover(), { wrapper })

    const idleTransition = result.current.transition

    act(() => result.current.handlers.onPointerDown(pointerEvent()))

    // Pressed transition should differ from idle
    expect(result.current.transition).not.toEqual(idleTransition)
  })

  it("disables tilt when disableTilt is true", () => {
    const { result } = renderHook(() => useTactileHover({ disableTilt: true }), {
      wrapper,
    })

    expect(result.current.transform.rotate).toBe(0)

    // Touch enter sets proximity=1
    act(() =>
      result.current.handlers.onPointerEnter(
        pointerEvent({ pointerType: "touch" }),
      ),
    )
    // Still 0 because disableTilt
    expect(result.current.transform.rotate).toBe(0)
  })

  it("applies restingTilt when idle, straightens on approach", () => {
    // Mock rAF sync
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(
      (cb: FrameRequestCallback) => {
        cb(0)
        return 1
      },
    )
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {})

    const { result } = renderHook(
      () => useTactileHover({ restingTilt: 3 }),
      { wrapper },
    )

    // Idle: full resting tilt
    expect(result.current.transform.rotate).toBe(3)

    // Enter + move to center
    act(() =>
      result.current.handlers.onPointerEnter(
        pointerEvent({ pointerType: "mouse" }),
      ),
    )
    act(() =>
      result.current.handlers.onPointerMove(
        pointerEvent({ clientX: 50, clientY: 50 }),
      ),
    )

    // Centered: proximity ≈ 1 → straightens
    expect(result.current.transform.rotate).toBeCloseTo(0, 1)

    vi.restoreAllMocks()
  })

  it("proximity drives continuous scale interpolation", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(
      (cb: FrameRequestCallback) => {
        cb(0)
        return 1
      },
    )
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {})

    const { result } = renderHook(() => useTactileHover(), { wrapper })

    act(() =>
      result.current.handlers.onPointerEnter(
        pointerEvent({ pointerType: "mouse" }),
      ),
    )

    // Edge hover → low proximity → small scale bump
    act(() =>
      result.current.handlers.onPointerMove(
        pointerEvent({ clientX: 0, clientY: 50 }),
      ),
    )
    const edgeScale = result.current.transform.scale

    // Center hover → high proximity → full SCALE_HOVER
    act(() =>
      result.current.handlers.onPointerMove(
        pointerEvent({ clientX: 50, clientY: 50 }),
      ),
    )
    const centerScale = result.current.transform.scale

    // Center should scale up more than edge
    expect(centerScale).toBeGreaterThan(edgeScale)

    vi.restoreAllMocks()
  })
})
