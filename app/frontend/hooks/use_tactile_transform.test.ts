import { describe, expect, it } from "vitest"
import { renderHook } from "@testing-library/react"
import { useTactileTransform } from "./use_tactile_transform"

describe("useTactileTransform", () => {
  it("returns identity transform when proximity is 0", () => {
    const { result } = renderHook(() => useTactileTransform(0, false))

    expect(result.current.transform.rotate).toBe(0)
    expect(result.current.transform.scale).toBe(1)
    expect(result.current.transform.y).toBe(0)
  })

  it("returns reduced-motion identity when reducedMotion is true", () => {
    const { result } = renderHook(() =>
      useTactileTransform(0.8, false, { reducedMotion: true }),
    )

    expect(result.current.transform.rotate).toBe(0)
    expect(result.current.transform.scale).toBe(1)
    expect(result.current.transform.y).toBe(0)
  })

  it("scales down when pressed", () => {
    const { result: notPressed } = renderHook(() => useTactileTransform(0.8, false))
    const { result: pressed } = renderHook(() => useTactileTransform(0.8, true))

    expect(pressed.current.transform.scale).toBeLessThan(
      notPressed.current.transform.scale as number,
    )
  })

  it("computes tilt inversely to proximity", () => {
    const hovertiltNorm = 1.5 // TILT_HOVER / 1.5 from the hook

    const { result: far } = renderHook(() => useTactileTransform(0, false))
    const { result: near } = renderHook(() => useTactileTransform(0.9, false))

    // Far from center = more tilt; near center = less tilt
    expect(Math.abs(far.current.transform.rotate as number)).toBeGreaterThanOrEqual(
      Math.abs(near.current.transform.rotate as number),
    )
  })
})
