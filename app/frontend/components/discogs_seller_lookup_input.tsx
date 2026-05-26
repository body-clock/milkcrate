import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { springTactile } from "@/lib/motion_tokens"
import Button from "@/components/ui/button"
import FeedbackMessage from "@/components/ui/feedback_message"
import Field from "@/components/ui/field"
import type { DiscogsLookupResult } from "@/types/inertia"

type SuccessfulLookup = DiscogsLookupResult & { found: true }

type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "preview"; result: SuccessfulLookup }
  | { status: "error_not_found" }
  | { status: "error_active_store"; result: SuccessfulLookup }
  | { status: "error_applicant"; result: SuccessfulLookup }
  | { status: "error_api" }

interface Props {
  copy: {
    seller_input_label: string
    seller_input_placeholder: string
    seller_submit: string
    seller_preview_claim: string
    seller_not_found: string
    seller_already_active: string
    seller_applicant_exists: string
    seller_waitlist_fallback: string
    seller_min_listings: string
    seller_lookup_error: string
  }
}

function csrfToken() {
  return document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content ?? ""
}

const easeOut = [0.25, 0.46, 0.45, 0.94] as const

export default function DiscogsSellerLookupInput({ copy }: Props) {
  const [username, setUsername] = useState("")
  const [state, setState] = useState<LookupState>({ status: "idle" })
  const [validationError, setValidationError] = useState<string | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const announcerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  // Announce state changes to screen readers
  const announce = useCallback((message: string) => {
    if (announcerRef.current) {
      announcerRef.current.textContent = message
    }
  }, [])

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault()

      const trimmed = username.trim()
      if (!trimmed) {
        setValidationError("Enter a Discogs username.")
        return
      }

      if (trimmed.length < 3) {
        setValidationError("Username must be at least 3 characters.")
        return
      }

      setValidationError(null)

      // Abort any in-flight request
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setState({ status: "loading" })
      announce("Checking Discogs availability...")

      const url = `/api/discogs/lookup/${encodeURIComponent(trimmed)}`

      fetch(url, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`Lookup failed: ${res.status}`)
          return res.json() as Promise<DiscogsLookupResult>
        })
        .then((data) => {
          if (controller.signal.aborted) return

          if (!data.found) {
            setState({ status: "error_not_found" })
            announce("Username not found on Discogs.")
            return
          }

          switch (data.store_status) {
            case "active_store":
              setState({ status: "error_active_store", result: data })
              announce("This store is already on Milkcrate.")
              break
            case "active_applicant":
              setState({ status: "error_applicant", result: data })
              announce("This seller has already applied.")
              break
            default:
              setState({ status: "preview", result: data })
              announce(`Found ${data.seller_name} on Discogs.`)
          }

          // Move focus to result container
          requestAnimationFrame(() => {
            resultRef.current?.focus()
          })
        })
        .catch((err) => {
          if (controller.signal.aborted) return
          if (err instanceof DOMException && err.name === "AbortError") return

          setState({ status: "error_api" })
          announce("Something went wrong. Please try again.")
        })
    },
    [username, announce],
  )

  const handleUsernameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setUsername(event.target.value)
      setValidationError(null)
      if (state.status !== "idle") {
        setState({ status: "idle" })
      }
    },
    [state.status],
  )

  const isSubmitting = state.status === "loading"

  return (
    <div className="w-full">
      {/* Screen reader announcement region */}
      <div
        ref={announcerRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
        <Field
          id="seller-discogs-username"
          label={copy.seller_input_label}
          error={validationError ?? undefined}
          busy={isSubmitting}
          className="min-w-0 flex-1"
        >
          <input
            ref={inputRef}
            type="text"
            value={username}
            onChange={handleUsernameChange}
            placeholder={copy.seller_input_placeholder}
            className="min-h-11"
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        <Button
          type="submit"
          busy={isSubmitting}
          size="lg"
          className="tracking-wide"
        >
          {isSubmitting ? (
            <>
              <svg
                className="motion-safe:animate-spin h-4 w-4 text-mc-on-accent/80"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Checking...</span>
            </>
          ) : (
            <span>{copy.seller_submit}</span>
          )}
        </Button>
      </form>

      {/* Result area */}
      <div
        ref={resultRef}
        tabIndex={-1}
        className="outline-none mt-4"
        role="status"
      >
        <AnimatePresence mode="wait">
          {state.status === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: easeOut }}
            >
              <FeedbackMessage tone="progress" className="flex items-center gap-3 px-4 py-3">
                <div className="w-5 h-5 border-2 border-mc-feedback-progress border-t-transparent rounded-full motion-safe:animate-spin" />
                <span>Checking Discogs...</span>
              </FeedbackMessage>
            </motion.div>
          )}

          {state.status === "preview" && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={springTactile}
            >
              <FeedbackMessage tone="success" className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {state.result.avatar_url && (
                    <img
                      src={state.result.avatar_url}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-md border border-mc-feedback-success-border object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-mc-text">{state.result.seller_name}</p>
                    <p className="text-xs text-mc-text-dim">@{state.result.slug}</p>
                  </div>
                </div>
                <form action={`/${state.result.slug}/authorize`} method="POST" className="shrink-0">
                  <input type="hidden" name="authenticity_token" value={csrfToken()} />
                  <Button type="submit" size="lg">
                    {copy.seller_preview_claim}
                  </Button>
                </form>
              </FeedbackMessage>
            </motion.div>
          )}

          {state.status === "error_not_found" && (
            <motion.div
              key="not-found"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: easeOut }}
            >
              <FeedbackMessage tone="danger" live="assertive">{copy.seller_not_found}</FeedbackMessage>
            </motion.div>
          )}

          {state.status === "error_active_store" && (
            <motion.div
              key="active-store"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: easeOut }}
            >
              <FeedbackMessage tone="warning" live="assertive">
                {copy.seller_already_active}{" "}
                {state.result?.store_storefront_path && (
                  <a
                    href={state.result.store_storefront_path}
                    className="underline hover:no-underline font-medium"
                  >
                    Visit store →
                  </a>
                )}
              </FeedbackMessage>
            </motion.div>
          )}

          {state.status === "error_applicant" && (
            <motion.div
              key="applicant"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: easeOut }}
            >
              <FeedbackMessage tone="warning" live="assertive">{copy.seller_applicant_exists}</FeedbackMessage>
            </motion.div>
          )}

          {state.status === "error_api" && (
            <motion.div
              key="api-error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: easeOut }}
            >
              <FeedbackMessage tone="danger" live="assertive">
                {copy.seller_lookup_error}{" "}
                <button
                  type="button"
                  onClick={() => setState({ status: "idle" })}
                  className="rounded font-medium underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus"
                >
                  Try again
                </button>
              </FeedbackMessage>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
