import { useCallback, useRef, useState } from "react"
import { SWIPE_THRESHOLD } from "@/lib/gesture_tokens"

type SwipeDirection = "up" | "down" | "left" | "right"

interface UseSwipeableOptions {
  direction?: SwipeDirection
  threshold?: number
  onSwipe: () => void
}

interface UseSwipeableResult {
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: () => void
  }
  isSwiping: boolean
  offset: number
}

export function useSwipeable({
  direction = "down",
  threshold = SWIPE_THRESHOLD,
  onSwipe,
}: UseSwipeableOptions): UseSwipeableResult {
  const [isSwiping, setIsSwiping] = useState(false)
  const [offset, setOffset] = useState(0)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const firedRef = useRef(false)

  const reset = useCallback(() => {
    startRef.current = null
    setIsSwiping(false)
    setOffset(0)
    firedRef.current = false
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startRef.current = { x: e.clientX, y: e.clientY }
    firedRef.current = false
  }, [])

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startRef.current) return
      const dx = e.clientX - startRef.current.x
      const dy = e.clientY - startRef.current.y

      let currentOffset = 0
      switch (direction) {
        case "up":
          currentOffset = -dy
          break
        case "down":
          currentOffset = dy
          break
        case "left":
          currentOffset = -dx
          break
        case "right":
          currentOffset = dx
          break
      }

      setOffset(Math.max(0, currentOffset))
      setIsSwiping(currentOffset > 0)

      if (currentOffset >= threshold && !firedRef.current) {
        firedRef.current = true
        onSwipe()
      }
    },
    [direction, threshold, onSwipe],
  )

  const onPointerUp = useCallback(() => {
    reset()
  }, [reset])

  const onPointerCancel = useCallback(() => {
    reset()
  }, [reset])

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    isSwiping,
    offset,
  }
}
