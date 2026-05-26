import React, { useState, useRef, type KeyboardEvent } from "react"
import { router } from "@inertiajs/react"
import Button from "@/components/ui/button"
import Field from "@/components/ui/field"
import FeedbackMessage from "@/components/ui/feedback_message"
import BrandMark from "@/components/brand_mark"

interface TotpChallengeErrors {
  code?: string[]
}

interface TotpChallengePageProps {
  errors?: TotpChallengeErrors
  notice?: string
  alert?: string
}

export default function AdminTotpChallenge({ errors, notice, alert }: TotpChallengePageProps) {
  const [code, setCode] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim()
    if (trimmed.length < 6) return

    setSubmitting(true)
    router.post(
      "/admin/totp",
      { code: trimmed },
      {
        onFinish: () => setSubmitting(false),
        preserveState: true,
      }
    )
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Allow only digits, backspace, delete, tab, arrows
    if (
      /^\d$/.test(e.key) ||
      ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
    ) {
      return
    }
    e.preventDefault()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-mc-bg px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <BrandMark className="mb-2" />
          <h1 className="text-xl font-semibold text-mc-text">Two-factor authentication</h1>
          <p className="mt-1 text-sm text-mc-text-dim">
            Enter the code from your authenticator app
          </p>
        </div>

        {/* Flash messages */}
        {notice && (
          <div className="mb-4">
            <FeedbackMessage tone="success" live="polite">{notice}</FeedbackMessage>
          </div>
        )}
        {alert && (
          <div className="mb-4">
            <FeedbackMessage tone="danger" live="assertive">{alert}</FeedbackMessage>
          </div>
        )}

        {/* TOTP code form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            id="totp-code"
            label="Authentication code"
            error={errors?.code?.[0]}
          >
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              name="code"
              value={code}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 6)
                setCode(digitsOnly)
              }}
              onKeyDown={handleKeyDown}
              placeholder="000000"
              autoComplete="one-time-code"
              autoFocus
              required
              className="text-center text-2xl tracking-[0.5em] font-mono"
              maxLength={6}
            />
          </Field>

          <Button
            type="submit"
            className="w-full"
            disabled={code.length < 6}
            busy={submitting}
          >
            {submitting ? "Verifying..." : "Verify"}
          </Button>

          <div className="text-center">
            <a
              href="/admin/logout"
              className="text-xs text-mc-text-dim hover:text-mc-text underline"
              onClick={(e) => {
                e.preventDefault()
                router.delete("/admin/logout")
              }}
            >
              Sign out and try a different account
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
