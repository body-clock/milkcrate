import { useEffect } from "react"
import { preloadImage } from "@/lib/preload_images"

interface PreloadableRecord {
  id: number
  cover_image_url?: string | null
  thumbnail_url?: string | null
}

/**
 * Preload surrounding record images when the active index changes.
 * Adjacent slots (±1) get high-priority full-res preloads.
 * Edge slots (±2..±3) get thumbnail preloads and idle-priority full-res.
 */
export function usePreload(records: PreloadableRecord[], index: number) {
  useEffect(() => {
    const abort = new AbortController()

    for (let offset = -3; offset <= 3; offset++) {
      if (offset === 0) {continue}

      const r = records[index + offset]
      if (!r) {continue}

      const absOffset = Math.abs(offset)

      if (absOffset <= 1) {
        // Adjacent slots: preload full-res cover (cache-warming for the decode gate)
        if (r.cover_image_url) {preloadImage(r.cover_image_url, "high")}
      } else {
        // Edge slots: preload thumbnail only (full-res at idle priority)
        if (r.thumbnail_url) {
          preloadImage(r.thumbnail_url, "high")
        }
        if (r.cover_image_url) {
          preloadImage(r.cover_image_url, "low", abort.signal)
        }
      }
    }

    return () => abort.abort()
  }, [records, index])
}
