import { useEffect, useRef } from "react"

interface UseDialogFocusTrapOptions {
  /** Ref to the element that should receive focus when the dialog closes. */
  returnFocusRef?: React.RefObject<HTMLElement | null>
}

interface UseDialogFocusTrapResult {
  dialogRef: React.RefObject<HTMLDivElement | null>
  titleRef: React.RefObject<HTMLSpanElement | null>
}

/**
 * Manages focus trapping inside a dialog: stores previous focus, cycles Tab
 * within the dialog, handles Escape, and returns focus on close.
 */
export function useDialogFocusTrap(
  open: boolean,
  onClose: () => void,
  options: UseDialogFocusTrapOptions = {},
): UseDialogFocusTrapResult {
  const { returnFocusRef } = options
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLSpanElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) {return}

    previousFocusRef.current = document.activeElement as HTMLElement | null
    titleRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== "Tab") {return}

      const dialog = dialogRef.current
      if (!dialog) {return}

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )

      if (focusable.length === 0) {
        event.preventDefault()
        titleRef.current?.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (
        event.shiftKey &&
        (active === first || active === titleRef.current || !dialog.contains(active))
      ) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    const previousFocus = previousFocusRef.current
    const returnFocus = returnFocusRef?.current

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      if (previousFocus?.isConnected) {
        previousFocus.focus()
      } else if (returnFocus) {
        returnFocus.focus()
      }
    }
  }, [open, onClose, returnFocusRef])

  return { dialogRef, titleRef }
}
