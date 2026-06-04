import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useTactileTransform } from "./use_tactile_transform";

const IDLE_PROXIMITY = 0;
const PRESSED_PROXIMITY = 0.8;
const NEAR_PROXIMITY = 0.9;

describe("useTactileTransform", () => {
  it("returns identity transform when proximity is 0", () => {
    const { result } = renderHook(() => useTactileTransform(IDLE_PROXIMITY, false));

    expect(result.current.transform.rotate).toBe(0);
    expect(result.current.transform.scale).toBe(1);
    expect(result.current.transform.y).toBe(0);
  });

  it("returns reduced-motion identity when reducedMotion is true", () => {
    const { result } = renderHook(() =>
      useTactileTransform(PRESSED_PROXIMITY, false, { reducedMotion: true }),
    );

    expect(result.current.transform.rotate).toBe(0);
    expect(result.current.transform.scale).toBe(1);
    expect(result.current.transform.y).toBe(0);
  });

  it("scales down when pressed", () => {
    const { result: notPressed } = renderHook(() => useTactileTransform(PRESSED_PROXIMITY, false));
    const { result: pressed } = renderHook(() => useTactileTransform(PRESSED_PROXIMITY, true));

    expect(pressed.current.transform.scale).toBeLessThan(
      notPressed.current.transform.scale as number,
    );
  });

  it("computes tilt inversely to proximity", () => {
    void IDLE_PROXIMITY; // hovertiltNorm was here

    const { result: far } = renderHook(() => useTactileTransform(IDLE_PROXIMITY, false));
    const { result: near } = renderHook(() => useTactileTransform(NEAR_PROXIMITY, false));

    // Far from center = more tilt; near center = less tilt
    expect(Math.abs(far.current.transform.rotate as number)).toBeGreaterThanOrEqual(
      Math.abs(near.current.transform.rotate as number),
    );
  });
});
