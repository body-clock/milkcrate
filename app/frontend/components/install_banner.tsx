import { useCallback, useEffect, useState } from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISSED_KEY = "pwa-install-dismissed"

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === "1"
    } catch {
      return false
    }
  })

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const handleInstall = useCallback(() => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    deferredPrompt.userChoice.then(() => {
      setDeferredPrompt(null)
    })
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISSED_KEY, "1")
    } catch {
      // localStorage unavailable — just hide for this session.
    }
  }, [])

  if (!deferredPrompt || dismissed) return null

  return (
    <div
      className="fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px))] left-0 right-0 z-50 bg-mc-bg-raised border-t border-mc-border px-4 py-3 flex items-center justify-between gap-3"
      role="alert"
    >
      <span className="text-xs text-mc-text leading-tight">
        Add to Home Screen — browse records anytime.
      </span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleInstall}
          className="mc-btn mc-btn-primary text-xs px-3 py-1.5"
        >
          Install
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-mc-text-dim hover:text-mc-text text-sm leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  )
}
