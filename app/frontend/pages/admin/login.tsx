import React, { useState } from "react"
import { router } from "@inertiajs/react"
import Button from "@/components/ui/button"
import Field from "@/components/ui/field"
import FeedbackMessage from "@/components/ui/feedback_message"
import BrandMark from "@/components/brand_mark"

interface LoginErrors {
  email?: string[]
  password?: string[]
}

interface LoginPageProps {
  errors?: LoginErrors
  notice?: string
  alert?: string
  allow_dev_login?: boolean
}

export default function AdminLogin({ errors, notice, alert, allow_dev_login }: LoginPageProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    router.post(
      "/admin/login",
      { session: { email, password } },
      {
        onFinish: () => setSubmitting(false),
        preserveState: true,
      }
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-mc-bg px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <BrandMark className="mb-2" />
          <h1 className="text-xl font-semibold text-mc-text">Sign in to admin</h1>
          <p className="mt-1 text-sm text-mc-text-dim">
            Milkcrate store operations dashboard
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

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            id="admin-email"
            label="Email"
            error={errors?.email?.[0]}
          >
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@milkcrate.fm"
              autoComplete="email"
              autoFocus
              required
            />
          </Field>

          <Field
            id="admin-password"
            label="Password"
            error={errors?.password?.[0]}
          >
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </Field>

          <Button
            type="submit"
            className="w-full"
            busy={submitting}
          >
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        {allow_dev_login && (
          <div className="mt-8 border-t border-mc-border pt-6 text-center">
            <p className="mb-3 text-xs text-mc-text-dim">
              Development environment
            </p>
            <Button
              variant="secondary"
              onClick={() => router.get("/dev/admin-login")}
            >
              Dev sign-in
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
