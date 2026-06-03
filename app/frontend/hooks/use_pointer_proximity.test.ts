import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { usePointerProximity } from "./use_pointer_proximity";

const ELEMENT_WIDTH = 200;
const ELEMENT_HEIGHT = 200;
const POINTER_X = 100;
const POINTER_Y = 100;
const EDGE_DIVISOR = 2;
const ELEMENT_RIGHT = POINTER_X * EDGE_DIVISOR;
const ELEMENT_BOTTOM = POINTER_Y * EDGE_DIVISOR;
const RAF_TIMEOUT = 16;

function makePointerEvent(type: string, opts: Partial<PointerEventInit> = {}): React.PointerEvent {
  return new PointerEvent(type, {
    pointerType: "mouse",
    clientX: POINTER_X,
    clientY: POINTER_Y,
    bubbles: true,
    ...opts,
  }) as unknown as React.PointerEvent;
}

function makeElement(configurable = false) {
  const el = document.createElement("div");
  Object.defineProperty(el, "getBoundingClientRect", {
    value: () => ({
      left: 0,
      top: 0,
      width: ELEMENT_WIDTH,
      height: ELEMENT_HEIGHT,
      right: ELEMENT_RIGHT,
      bottom: ELEMENT_BOTTOM,
    }),
    configurable,
  });
  return el;
}

describe("usePointerProximity", () => {
  it("returns proximity 0 initially", () => {
    const { result } = renderHook(() => usePointerProximity());
    expect(result.current.proximity).toBe(0);
  });

  it("updates proximity on pointer enter", () => {
    const { result } = renderHook(() => usePointerProximity());

    const el = makeElement();
    const event = makePointerEvent("pointerenter", { clientX: POINTER_X, clientY: POINTER_Y });
    Object.defineProperty(event, "currentTarget", { value: el });

    act(() => {
      result.current.handlers.onPointerEnter(event);
    });

    expect(result.current.proximity).toBeGreaterThan(0);
  });

  it("resets proximity on pointer leave", () => {
    const { result } = renderHook(() => usePointerProximity());

    const el = makeElement();
    const enterEvent = makePointerEvent("pointerenter", { clientX: POINTER_X, clientY: POINTER_Y });
    Object.defineProperty(enterEvent, "currentTarget", { value: el });

    act(() => {
      result.current.handlers.onPointerEnter(enterEvent);
    });

    expect(result.current.proximity).toBeGreaterThan(0);

    act(() => {
      result.current.handlers.onPointerLeave(makePointerEvent("pointerleave"));
    });

    expect(result.current.proximity).toBe(0);
  });

  it("sets proximity to 0 on touch devices", () => {
    const { result } = renderHook(() => usePointerProximity());

    const el = makeElement();
    const event = makePointerEvent("pointerenter", {
      clientX: POINTER_X,
      clientY: POINTER_Y,
      pointerType: "touch",
    });
    Object.defineProperty(event, "currentTarget", { value: el });

    act(() => {
      result.current.handlers.onPointerEnter(event);
    });

    expect(result.current.proximity).toBe(0);
  });

  it("returns proximity 0 when disabled", () => {
    const { result } = renderHook(() => usePointerProximity({ disabled: true }));

    const el = makeElement();
    const event = makePointerEvent("pointerenter", { clientX: POINTER_X, clientY: POINTER_Y });
    Object.defineProperty(event, "currentTarget", { value: el });

    act(() => {
      result.current.handlers.onPointerEnter(event);
    });

    expect(result.current.proximity).toBe(0);
  });

  it("uses snapshotted pointer data when the rAF callback runs later", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => usePointerProximity());

    const el = makeElement(true);
    const event = makePointerEvent("pointermove", { clientX: POINTER_X, clientY: POINTER_Y });
    Object.defineProperty(event, "currentTarget", { value: el, configurable: true });

    act(() => {
      result.current.handlers.onPointerMove(event);
      Object.defineProperty(event, "currentTarget", { value: null, configurable: true });
      vi.advanceTimersByTime(RAF_TIMEOUT);
    });

    expect(result.current.proximity).toBeGreaterThan(0);
    vi.useRealTimers();
  });

  it("cancels queued animation frames on unmount", () => {
    vi.useFakeTimers();
    const cancelAnimationFrameSpy = vi.spyOn(window, "cancelAnimationFrame");
    const { result, unmount } = renderHook(() => usePointerProximity());

    const el = makeElement();
    const event = makePointerEvent("pointermove", { clientX: POINTER_X, clientY: POINTER_Y });
    Object.defineProperty(event, "currentTarget", { value: el });

    act(() => {
      result.current.handlers.onPointerMove(event);
    });

    unmount();

    expect(cancelAnimationFrameSpy).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
