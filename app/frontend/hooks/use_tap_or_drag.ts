import { useCallback, useRef, useState } from "react"
import { TAP_MOVE_THRESHOLD } from "@/lib/gesture_tokens"

interface UseTapOrDragOptions {
  moveThreshold?: number
  onTap: () => void
  onDrag: (info: { dx: number; dy: number }) => void
}

interface UseTapOrDragResult {
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: () => void
  }
  isDragging: boolean
}

export function useTapOrDrag({
  moveThreshold = TAP_MOVE_THRESHOLD,
  onTap,
  onDrag,
}: UseTapOrDragOptions): UseTapOrDragResult {
  const [isDragging, setIsDragging] = useState(false)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const draggedRef = useRef(false)

  const reset = useCallback(() => {
    startRef.current = null
    setIsDragging(false)
    draggedRef.current = false
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startRef.current = { x: e.clientX, y: e.clientY }
    draggedRef.current = false
  }, [])

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startRef.current) return
      const dx = e.clientX - startRef.current.x
      const dy = e.clientY - startRef.current.y

      if (Math.abs(dx) > moveThreshold || Math.abs(dy) > moveThreshold) {
        if (!draggedRef.current) {
          draggedRef.current = true
          setIsDragging(true)
          onDrag({ dx, dy })
        }
      }
    },
    [moveThreshold, onDrag],
  )

  const onPointerUp = useCallback(() => {
    if (!draggedRef.current && startRef.current) {
      onTap()
    }
    reset()
  }, [onTap, reset])

  const onPointerCancel = useCallback(() => {
    reset()
  }, [reset])

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    isDragging,
  }
}
