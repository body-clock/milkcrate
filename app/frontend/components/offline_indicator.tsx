import { useCallback, useEffect, useState } from "react"

export default function OfflineIndicator() {
  const [offline, setOffline] = useState(() => {
    return typeof navigator !== "undefined" && !navigator.onLine
  })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const goOffline = () => setOffline(true)
    const goOnline = () => {
      setOffline(false)
      setDismissed(false)
    }

    window.addEventListener("offline", goOffline)
    window.addEventListener("online", goOnline)

    // Also detect fetch failures as a fallback (captive portals, etc.).
    const handleFetchError = () => {
      if (navigator.onLine) return // false positive
      setOffline(true)
    }
    window.addEventListener("unhandledrejection", handleFetchError)

    return () => {
      window.removeEventListener("offline", goOffline)
      window.removeEventListener("online", goOnline)
      window.removeEventListener("unhandledrejection", handleFetchError)
    }
  }, [])

  const handleDismiss = useCallback(() => {
    setDismissed(true)
  }, [])

  if (!offline || dismissed) return null

  return (
    <div
      className="sticky top-12 z-20 bg-mc-notice border-b border-mc-border/50 px-4 py-1.5 text-center"
      role="status"
    >
      <span className="text-xs text-mc-text-dim">
        You're offline — showing cached records.
      </span>
      <button
        type="button"
        onClick={handleDismiss}
        className="ml-2 text-mc-text-dim hover:text-mc-text text-xs"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}
