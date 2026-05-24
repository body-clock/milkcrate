import { useState, useRef, useEffect } from "react"
import { usePage } from "@inertiajs/react"

function DiscogsIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mc-text-dim"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
    </svg>
  )
}

export default function DiscogsAuthIcon() {
  const page = usePage<{ shopper?: { discogs_username: string } | null; store?: { discogs_username?: string } | null }>()
  const shopper = page.props.shopper
  const storeSlug = page.props.store?.discogs_username
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const handleClick = () => {
    if (!storeSlug) return
    if (!shopper) {
      // Initiate OAuth via form POST
      const form = document.createElement("form")
      form.method = "POST"
      form.action = "/auth/discogs/shopper/authorize"
      const csrfToken = document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content
      if (csrfToken) {
        const tokenInput = document.createElement("input")
        tokenInput.type = "hidden"
        tokenInput.name = "authenticity_token"
        tokenInput.value = csrfToken
        form.appendChild(tokenInput)
      }
      const slugInput = document.createElement("input")
      slugInput.type = "hidden"
      slugInput.name = "store_slug"
      slugInput.value = storeSlug
      form.appendChild(slugInput)
      document.body.appendChild(form)
      form.submit()
    }
  }

  const handleMouseEnter = () => {
    clearTimeout(tooltipTimeoutRef.current)
    setShowTooltip(true)
  }

  const handleMouseLeave = () => {
    tooltipTimeoutRef.current = setTimeout(() => setShowTooltip(false), 200)
  }

  useEffect(() => {
    return () => clearTimeout(tooltipTimeoutRef.current)
  }, [])

  // Only show on store pages where we have a discogs_username
  if (!storeSlug) return null

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative flex items-center justify-center w-8 h-8 rounded-full text-mc-text-dim hover:text-mc-text hover:bg-mc-bg-raised transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
        aria-label={shopper ? `Connected to Discogs as @${shopper.discogs_username}` : "Connect with Discogs"}
      >
        <DiscogsIcon />
        {shopper && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-mc-bg" />
        )}
      </button>

      {showTooltip && (
        <div
          className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-3 py-1.5 text-xs whitespace-nowrap rounded-md bg-mc-text text-mc-bg shadow-lg z-50 pointer-events-none"
          role="tooltip"
        >
          {shopper ? `Connected as @${shopper.discogs_username}` : "Connect with Discogs"}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-mc-text rotate-45" />
        </div>
      )}
    </div>
  )
}
