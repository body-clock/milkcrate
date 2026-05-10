import { useCallback, useRef, useState } from "react"
import { PULL_THRESHOLD } from "@/lib/gesture_tokens"

interface UsePullToActionOptions {
  threshold?: number
  onPull: () => void
}

interface UsePullToActionResult {
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: () => void
  }
  pullProgress: number
}

export function usePullToAction({
  threshold = PULL_THRESHOLD,
  onPull,
}: UsePullToActionOptions): UsePullToActionResult {
  const [pullProgress, setPullProgress] = useState(0)
  const startRef = useRef<{ y: number } | null>(null)
  const firedRef = useRef(false)

  const reset = useCallback(() => {
    startRef.current = null
    setPullProgress(0)
    firedRef.current = false
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startRef.current = { y: e.clientY }
    firedRef.current = false
  }, [])

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startRef.current) return
      const dy = e.clientY - startRef.current.y

      // Only track downward pull (pull-to-refresh pattern).
      if (dy <= 0) return

      const progress = Math.min(1, dy / threshold)
      setPullProgress(progress)

      if (progress >= 1 && !firedRef.current) {
        firedRef.current = true
        onPull()
        reset()
      }
    },
    [threshold, onPull, reset],
  )

  const onPointerUp = useCallback(() => {
    reset()
  }, [reset])

  const onPointerCancel = useCallback(() => {
    reset()
  }, [reset])

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    pullProgress,
  }
}
