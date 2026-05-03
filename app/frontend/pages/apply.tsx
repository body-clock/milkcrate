import React, { useState } from "react"
import { useForm } from "@inertiajs/react"
import MarketingLayout from "@/layouts/marketing_layout"

interface Props {
  submitted?: boolean
  errors?: Record<string, { error: string; value: string }[]>
}

export default function Apply({ submitted = false, errors = {} }: Props) {
  const { data, setData, post, processing } = useForm({
    name: "",
    discogs_username: "",
    email: "",
    inventory_size: "",
    notes: "",
  })

  if (submitted) {
    return (
      <MarketingLayout>
        <div className="flex flex-col items-center text-center px-4 py-16 max-w-lg mx-auto">
          <h1 className="text-2xl font-bold mc-text mb-3">You're on the list.</h1>
          <p className="text-sm text-mc-text-dim leading-relaxed max-w-sm">
            We'll review your store and reach out to you directly.
          </p>
        </div>
      </MarketingLayout>
    )
  }

  return (
    <MarketingLayout>
      <div className="max-w-md mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mc-text mb-1">Get your store on Milkcrate</h1>
        <p className="text-sm text-mc-text-dim mb-8 leading-relaxed">
          We're onboarding stores one at a time. Fill this out and we'll be in touch —
          this isn't automatic, we review every store personally.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            post("/waitlist")
          }}
          className="flex flex-col gap-5"
        >
          <Field label="Store name" error={errors.name?.[0]?.error}>
            <input
              type="text"
              value={data.name}
              onChange={(e) => setData("name", e.target.value)}
              placeholder="Philadelphia Music"
              className="mc-input"
              required
            />
          </Field>

          <Field label="Discogs username" error={errors.discogs_username?.[0]?.error}>
            <input
              type="text"
              value={data.discogs_username}
              onChange={(e) => setData("discogs_username", e.target.value)}
              placeholder="philadelphiamusic"
              className="mc-input"
              required
            />
          </Field>

          <Field label="Email" error={errors.email?.[0]?.error}>
            <input
              type="email"
              value={data.email}
              onChange={(e) => setData("email", e.target.value)}
              placeholder="you@yourstore.com"
              className="mc-input"
              required
            />
          </Field>

          <Field label="Approximate inventory size" hint="Optional">
            <select
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

          <Field label="Anything else?" hint="Optional">
            <textarea
              value={data.notes}
              onChange={(e) => setData("notes", e.target.value)}
              placeholder="Tell us about your store, what you specialize in, or any questions you have."
              rows={3}
              className="mc-input resize-none"
            />
          </Field>

          <button
            type="submit"
            disabled={processing}
            className="px-6 py-3 rounded-lg bg-mc-accent text-white font-semibold text-sm tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {processing ? "Submitting…" : "Submit"}
          </button>
        </form>
      </div>
    </MarketingLayout>
  )
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider mc-text">{label}</label>
        {hint && <span className="text-xs text-mc-text-dim">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
