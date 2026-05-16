import React, { useEffect, useRef } from "react"
import { useForm } from "@inertiajs/react"
import { motion } from "framer-motion"
import MarketingLayout from "@/layouts/marketing_layout"
import BrandMark from "@/components/brand_mark"
import { springTactile } from "@/lib/motion_tokens"

type TurnstileWidgetId = string | number

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          "expired-callback": () => void
          "error-callback": () => void
        }
      ) => TurnstileWidgetId
      remove?: (widgetId: TurnstileWidgetId) => void
    }
  }
}

type Props = {
  submitted?: boolean
  errors?: Record<string, { error: string; value: string }[]>
  turnstile?: {
    enabled: boolean
    site_key: string | null
  }
  initial_discogs_username?: string
  copy: {
    headline: string
    subhead: string
    submit: string
    submitting: string
    confirmation_headline: string
    confirmation_body: string
    context_title: string
    context_discogs_why: string
    context_what_happens: string
    context_no_commitment: string
    field_hint_discogs: string
    field_hint_email: string
    fields: {
      name: string
      discogs_username: string
      email: string
      inventory_size: string
      notes: string
    }
  }
}

export default function Apply({ submitted = false, errors = {}, turnstile, copy, initial_discogs_username }: Props) {
  const { data, setData, post, processing } = useForm({
    name: "",
    discogs_username: initial_discogs_username || "",
    email: "",
    inventory_size: "",
    notes: "",
    turnstile_token: "",
  })
  const widgetRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<TurnstileWidgetId | null>(null)
  const turnstileEnabled = turnstile?.enabled === true
  const turnstileSiteKey = turnstile?.site_key

  useEffect(() => {
    if (!turnstileEnabled || !turnstileSiteKey || !widgetRef.current) return

    const renderWidget = () => {
      if (!window.turnstile || !widgetRef.current || widgetIdRef.current !== null) return

      widgetIdRef.current = window.turnstile.render(widgetRef.current, {
        sitekey: turnstileSiteKey,
        callback: (token: string) => setData("turnstile_token", token),
        "expired-callback": () => setData("turnstile_token", ""),
        "error-callback": () => setData("turnstile_token", ""),
      })
    }

    const existingScript = document.querySelector<HTMLScriptElement>("script[data-turnstile-script]")
    if (existingScript) {
      if (window.turnstile) {
        renderWidget()
      } else {
        existingScript.addEventListener("load", renderWidget, { once: true })
      }
    } else {
      const script = document.createElement("script")
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      script.async = true
      script.defer = true
      script.dataset.turnstileScript = "true"
      script.onload = renderWidget
      document.head.appendChild(script)
    }

    return () => {
      existingScript?.removeEventListener("load", renderWidget)
      if (widgetIdRef.current !== null) {
        window.turnstile?.remove?.(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [setData, turnstileEnabled, turnstileSiteKey])

  if (submitted) {
    return (
      <MarketingLayout>
        <div className="flex flex-col items-center text-center pb-16 max-w-lg mx-auto">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springTactile}
            className="mb-6"
          >
            <BrandMark size="large" showWordmark={false} />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="text-2xl font-bold mc-text mb-3"
          >
            {copy.confirmation_headline}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="text-sm text-mc-text-dim leading-relaxed max-w-sm"
          >
            {copy.confirmation_body}
          </motion.p>
        </div>
      </MarketingLayout>
    )
  }

  const errorCount = Object.keys(errors).length
  const fieldErrors = Object.entries(errors).filter(([key]) => key !== "turnstile")

  return (
    <MarketingLayout>
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mc-text mb-2">{copy.headline}</h1>
        <p className="text-sm text-mc-text-dim mb-6 leading-relaxed">
          {copy.subhead}
        </p>

        {/* Vendor context panel — explains what we're asking and why */}
        <section
          aria-labelledby="apply-context-title"
          className="mb-8 px-5 py-4 rounded-lg bg-mc-bg-card border border-mc-border"
        >
          <h2 id="apply-context-title" className="text-xs font-semibold uppercase tracking-widest text-mc-text-dim mb-3">
            {copy.context_title}
          </h2>
          <ul className="flex flex-col gap-2.5 text-xs text-mc-text-dim leading-relaxed list-none">
            <li className="flex gap-2">
              <span className="text-mc-accent flex-shrink-0 select-none mt-px" aria-hidden="true">•</span>
              <span>{copy.context_discogs_why}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-mc-accent flex-shrink-0 select-none mt-px" aria-hidden="true">•</span>
              <span>{copy.context_what_happens}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-mc-accent flex-shrink-0 select-none mt-px" aria-hidden="true">•</span>
              <span>{copy.context_no_commitment}</span>
            </li>
          </ul>
        </section>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            post("/apply")
          }}
          className="flex flex-col gap-6"
          noValidate
        >
          {errorCount > 0 && (
            <div
              role="alert"
              className="px-4 py-3 rounded bg-mc-notice border border-mc-border text-sm mc-text"
            >
              <p className="font-semibold mb-1">
                {errorCount === 1 ? "There's a problem with your submission." : `There are ${errorCount} problems with your submission.`}
              </p>
              <ul className="list-disc list-inside text-xs text-mc-text-dim space-y-0.5">
                {fieldErrors.map(([field, errs]) =>
                  errs.map((e, i) => {
                    const label = copy.fields[field as keyof typeof copy.fields]
                    return <li key={`${field}-${i}`}>{label ? `${label} ` : ""}{e.error}</li>
                  })
                )}
              </ul>
            </div>
          )}

          <Field
            label={copy.fields.name}
            name="name"
            error={errors.name?.[0]?.error}
          >
            <input
              id="apply-name"
              type="text"
              value={data.name}
              onChange={(e) => setData("name", e.target.value)}
              placeholder="Philadelphia Music"
              className="mc-input"
              required
              aria-required="true"
              aria-describedby={errors.name?.[0]?.error ? "name-error" : undefined}
              aria-invalid={errors.name?.[0]?.error ? true : undefined}
            />
          </Field>

          <Field
            label={copy.fields.discogs_username}
            name="discogs_username"
            hint={copy.field_hint_discogs}
            error={errors.discogs_username?.[0]?.error}
          >
            <input
              id="apply-discogs_username"
              type="text"
              value={data.discogs_username}
              onChange={(e) => setData("discogs_username", e.target.value)}
              placeholder="philadelphiamusic"
              className="mc-input"
              required
              aria-required="true"
              aria-describedby={errors.discogs_username?.[0]?.error ? "discogs_username-error" : undefined}
              aria-invalid={errors.discogs_username?.[0]?.error ? true : undefined}
            />
          </Field>

          <Field
            label={copy.fields.email}
            name="email"
            hint={copy.field_hint_email}
            error={errors.email?.[0]?.error}
          >
            <input
              id="apply-email"
              type="email"
              value={data.email}
              onChange={(e) => setData("email", e.target.value)}
              placeholder="you@yourstore.com"
              className="mc-input"
              required
              aria-required="true"
              aria-describedby={errors.email?.[0]?.error ? "email-error" : undefined}
              aria-invalid={errors.email?.[0]?.error ? true : undefined}
            />
          </Field>

          <Field
            label={copy.fields.inventory_size}
            name="inventory_size"
            hint="Optional"
          >
            <select
              id="apply-inventory_size"
              value={data.inventory_size}
              onChange={(e) => setData("inventory_size", e.target.value)}
              className="mc-input"
            >
              <option value="">Select one</option>
              <option value="under_500">Under 500 records</option>
              <option value="500_2000">500 – 2,000 records</option>
              <option value="2000_10000">2,000 – 10,000 records</option>
              <option value="over_10000">Over 10,000 records</option>
            </select>
          </Field>

          <Field
            label={copy.fields.notes}
            name="notes"
            hint="Optional"
          >
            <textarea
              id="apply-notes"
              value={data.notes}
              onChange={(e) => setData("notes", e.target.value)}
              placeholder="Tell us about your store, what you specialize in, or any questions you have."
              rows={3}
              className="mc-input resize-none"
            />
          </Field>

          {turnstileEnabled && turnstileSiteKey && (
            <div className="flex flex-col gap-1">
              <div
                ref={widgetRef}
                data-testid="turnstile-widget"
                data-sitekey={turnstileSiteKey}
                className="min-h-[65px]"
                role="presentation"
              />
              {errors.turnstile?.[0]?.error && (
                <p
                  id="apply-turnstile-error"
                  role="alert"
                  className="text-xs text-mc-accent"
                >
                  {errors.turnstile[0].error}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={processing}
            aria-busy={processing}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-mc-accent text-mc-on-accent font-semibold text-sm tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing && (
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
            )}
            <span>{processing ? copy.submitting : copy.submit}</span>
          </button>
        </form>
      </div>
    </MarketingLayout>
  )
}

function Field({
  label,
  name,
  hint,
  error,
  children,
}: {
  label: string
  name: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  const errorId = `${name}-error`
  const inputId = `apply-${name}`

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <label
          htmlFor={inputId}
          className="text-xs font-normal uppercase tracking-widest mc-text-dim"
        >
          {label}
        </label>
        {hint && (
          <span className="text-[10px] text-mc-text-dim">{hint}</span>
        )}
      </div>
      {children}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-mc-accent font-medium">
          {error}
        </p>
      )}
    </div>
  )
}
