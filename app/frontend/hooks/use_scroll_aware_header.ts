import { useMotionValueEvent, useScroll, useTransform } from "framer-motion"
import { useRef, useState } from "react"

/**
 * Tracks scroll direction and returns a y-transform for the header.
 * Header hides when scrolling down past the threshold, shows on any upward scroll.
 */
export function useScrollAwareHeader(threshold = 60) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll({ container: containerRef })
  const [visible, setVisible] = useState(true)

  const prevScrollY = useRef(0)

  useMotionValueEvent(scrollY, "change", (latest: number) => {
    const delta = latest - prevScrollY.current
    prevScrollY.current = latest

    if (latest <= 0) {
      setVisible(true)
      return
    }

    if (delta > 0 && latest > threshold) {
      // Scrolling down past threshold → hide
      setVisible(false)
    } else if (delta < 0) {
      // Scrolling up → show
      setVisible(true)
    }
  })

  const headerY = useTransform(() => (visible ? "0%" : "-100%"))

  return { containerRef, headerY }
}
