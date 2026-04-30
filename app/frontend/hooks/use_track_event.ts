import { useCallback } from "react"

export type TrackableEvent = "record_view" | "discogs_click" | "pile_add"

export function useTrackEvent(storeId: number) {
  return useCallback(
    (eventType: TrackableEvent, listingId: number) => {
      const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content
      fetch("/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": token ?? "",
        },
        body: JSON.stringify({ store_id: storeId, listing_id: listingId, event_type: eventType }),
      }).catch(() => {})
    },
    [storeId]
  )
}
