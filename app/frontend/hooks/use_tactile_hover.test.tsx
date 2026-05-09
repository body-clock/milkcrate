import React from "react"
import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useTactileHover } from "./use_tactile_hover"
import StorefrontMotionConfig from "@/components/storefront_motion_config"

// Pointer event stub matching the shape useTactileHover expects
const pointerEvent = {} as React.PointerEvent

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <StorefrontMotionConfig>{children}</StorefrontMotionConfig>
)

describe("useTactileHover", () => {
  it("returns default state initially", () => {
    const { result } = renderHook(() => useTactileHover(), { wrapper })

    expect(result.current.isHovered).toBe(false)
    expect(result.current.isPressed).toBe(false)
    expect(result.current.transform).toEqual({ rotate: 0, scale: 1, y: 0 })
    expect(result.current.transition).toBeDefined()
  })

  it("sets isHovered on pointer enter", () => {
    const { result } = renderHook(() => useTactileHover(), { wrapper })

    act(() => result.current.handlers.onPointerEnter(pointerEvent))

    expect(result.current.isHovered).toBe(true)
    expect(result.current.transform.scale).toBeGreaterThan(1) // SCALE_HOVER
    expect(result.current.transform.y).toBeLessThan(0) // lifted
  })

  it("resets on pointer leave", () => {
    const { result } = renderHook(() => useTactileHover(), { wrapper })

    act(() => result.current.handlers.onPointerEnter(pointerEvent))
    act(() => result.current.handlers.onPointerLeave(pointerEvent))

    expect(result.current.isHovered).toBe(false)
    expect(result.current.transform).toEqual({ rotate: 0, scale: 1, y: 0 })
  })

  it("sets isPressed on pointer down", () => {
    const { result } = renderHook(() => useTactileHover(), { wrapper })

    act(() => result.current.handlers.onPointerDown(pointerEvent))

    expect(result.current.isPressed).toBe(true)
    // SCALE_PRESS < 1
    expect(result.current.transform.scale).toBeLessThan(1)
  })

  it("resets isPressed on pointer up", () => {
    const { result } = renderHook(() => useTactileHover(), { wrapper })

    act(() => result.current.handlers.onPointerDown(pointerEvent))
    act(() => result.current.handlers.onPointerUp(pointerEvent))

    expect(result.current.isPressed).toBe(false)
  })

  it("hover + press uses press scale (press dominates)", () => {
    const { result } = renderHook(() => useTactileHover(), { wrapper })

    act(() => result.current.handlers.onPointerEnter(pointerEvent))
    act(() => result.current.handlers.onPointerDown(pointerEvent))

    expect(result.current.isHovered).toBe(true)
    expect(result.current.isPressed).toBe(true)
    // Press scale should win when both are active
    expect(result.current.transform.scale).toBeLessThan(1)
  })

  it("disables tilt when disableTilt is true", () => {
    const { result } = renderHook(() => useTactileHover({ disableTilt: true }), {
      wrapper,
    })

    // Idle: no tilt
    expect(result.current.transform.rotate).toBe(0)

    act(() => result.current.handlers.onPointerEnter(pointerEvent))
    // Hovered: still no tilt
    expect(result.current.transform.rotate).toBe(0)
  })

  it("provides snappier press transition when pressed", () => {
    const { result } = renderHook(() => useTactileHover(), { wrapper })

    // Idle: tactile spring
    const idleTransition = result.current.transition

    act(() => result.current.handlers.onPointerDown(pointerEvent))
    // Pressed: snappier press spring
    expect(result.current.transition).not.toEqual(idleTransition)
  })

  it("applies restingTilt when idle", () => {
    const { result } = renderHook(
      () => useTactileHover({ restingTilt: 3 }),
      { wrapper },
    )

    // Idle: should have resting tilt (nonzero)
    expect(result.current.transform.rotate).not.toBe(0)

    act(() => result.current.handlers.onPointerEnter(pointerEvent))
    // Hovered: straightens out
    expect(result.current.transform.rotate).toBe(0)
  })
})
