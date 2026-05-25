import { useState, useRef, useEffect } from "react"
import { usePage } from "@inertiajs/react"

function DiscogsLogo() {
  // Just the record "o" from the Discogs wordmark — the recognizable icon.
  return (
    <svg
      width="20"
      height="20"
      viewBox="108 16 76 62"
      fill="currentColor"
      className="mc-text-dim"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M136,59l0.2-0.2l1.8-2l0.1-0.1l1-1.1l0.1,0.1c-2-1.8-3.1-4.5-3.1-7.4c0-5.7,4.6-10.3,10.3-10.3c1.9,0,3.6,0.5,5.1,1.4
        l2.1-3.7l0.1-0.2l2.1-3.8l0.1-0.2l2.1-3.8l0.1-0.2l1.1-2l0.8-1.4c-3.9-2.2-8.4-3.5-13.2-3.5H146c-15.3,0-27.7,12.3-27.8,27.6v0.3
        c0,8,3.4,15.2,8.8,20.2l1.4-1.5l1.4-1.5l0.2-0.2l2.9-3.2l0.2-0.2L136,59z"/>
      <path d="M165.5,28.4l-2.7,2.9l-0.2,0.2l-2.9,3.2l-0.2,0.2l-2.9,3.2l-0.2,0.2l-1.1,1.2l-1.8,1.9c1.7,1.8,2.8,4.4,2.8,7.1
        c0,5.7-4.6,10.3-10.3,10.3c-1.7,0-3.3-0.4-4.8-1.2l-2.1,3.7l-2.9,5.2l-1.5,2.7l-0.1,0.2l-2,3.5c4,2.2,8.5,3.4,13.4,3.4
        c15.4,0,27.8-12.5,27.8-27.8C174,40.5,170.7,33.5,165.5,28.4z"/>
      <path d="M146.2,46.4c-1.1,0-2,0.9-2,2c0,1.1,0.9,2,2,2s2-0.9,2-2C148.1,47.3,147.3,46.4,146.2,46.4"/>
    </svg>
  )
}

export default function DiscogsAuthIcon() {
  const page = usePage<{ shopper?: { discogs_username: string } | null; store?: { discogs_username?: string } | null }>()
  const shopper = page.props.shopper
  const storeSlug = page.props.store?.discogs_username
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const disconnectInProgress = useRef(false)

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

  const handleDisconnect = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (disconnectInProgress.current) return
    disconnectInProgress.current = true

    const form = document.createElement("form")
    form.method = "POST"
    form.action = "/auth/discogs/shopper/disconnect"

    const csrfToken = document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content
    if (csrfToken) {
      const tokenInput = document.createElement("input")
      tokenInput.type = "hidden"
      tokenInput.name = "authenticity_token"
      tokenInput.value = csrfToken
      form.appendChild(tokenInput)
    }

    // Rails needs a _method param for DELETE
    const methodInput = document.createElement("input")
    methodInput.type = "hidden"
    methodInput.name = "_method"
    methodInput.value = "delete"
    form.appendChild(methodInput)

    document.body.appendChild(form)
    form.submit()
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
        <DiscogsLogo />
        {shopper && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-mc-bg" />
        )}
      </button>

      {showTooltip && (
        <div
          className="absolute top-full mt-2 right-0 px-3 py-1.5 text-xs whitespace-nowrap rounded-md bg-mc-text text-mc-bg shadow-lg z-50"
          role="tooltip"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {shopper ? (
            <div className="flex flex-col items-stretch gap-0.5">
              <span className="px-1 py-0.5 font-medium">
                @{shopper.discogs_username}
              </span>
              <hr className="border-t border-mc-bg/20 my-0.5" />
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-1 py-0.5 text-left rounded hover:bg-mc-text/10 transition-colors text-mc-bg/70 hover:text-mc-bg"
              >
                Disconnect
              </button>
            </div>
          ) : (
            "Connect with Discogs"
          )}
          <div className="absolute -top-1 right-4 w-2 h-2 bg-mc-text rotate-45" />
        </div>
      )}
    </div>
  )
}
