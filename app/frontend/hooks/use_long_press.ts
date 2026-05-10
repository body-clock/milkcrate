import { useCallback, useRef, useState } from "react"
import { LONG_PRESS_DURATION, TAP_MOVE_THRESHOLD } from "@/lib/gesture_tokens"

interface UseLongPressOptions {
  duration?: number
  moveThreshold?: number
  haptic?: boolean
  onLongPress: () => void
}

interface UseLongPressResult {
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: () => void
  }
  isPressed: boolean
  isLongPressing: boolean
}

export function useLongPress({
  duration = LONG_PRESS_DURATION,
  moveThreshold = TAP_MOVE_THRESHOLD,
  haptic = true,
  onLongPress,
}: UseLongPressOptions): UseLongPressResult {
  const [isPressed, setIsPressed] = useState(false)
  const [isLongPressing, setIsLongPressing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const firedRef = useRef(false)

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    clear()
    startRef.current = null
    setIsPressed(false)
    setIsLongPressing(false)
    firedRef.current = false
  }, [clear])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      startRef.current = { x: e.clientX, y: e.clientY }
      setIsPressed(true)
      firedRef.current = false

      timerRef.current = setTimeout(() => {
        if (haptic && typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate(10)
        }
        setIsLongPressing(true)
        firedRef.current = true
        onLongPress()
      }, duration)
    },
    [duration, haptic, onLongPress],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startRef.current) return
      const dx = Math.abs(e.clientX - startRef.current.x)
      const dy = Math.abs(e.clientY - startRef.current.y)
      if (dx > moveThreshold || dy > moveThreshold) {
        clear()
        setIsPressed(false)
        setIsLongPressing(false)
      }
    },
    [clear, moveThreshold],
  )

  const onPointerUp = useCallback(() => {
    if (!firedRef.current) {
      clear()
    }
    setIsPressed(false)
    setIsLongPressing(false)
  }, [clear])

  const onPointerCancel = useCallback(() => {
    reset()
  }, [reset])

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    isPressed,
    isLongPressing,
  }
}
