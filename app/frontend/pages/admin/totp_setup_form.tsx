import React, { useState } from "react"
import { router } from "@inertiajs/react"
import Button from "@/components/ui/button"
import { TotpCodeInput, TOTP_CODE_LENGTH } from "@/pages/admin/totp_code_input"
import { TotpQrSection } from "@/pages/admin/totp_qr_section"
import { TotpManualEntry } from "@/pages/admin/totp_manual_entry"

interface TotpSetupFormProps {
  qrCode: string
  secret: string
  error?: string
}

export function TotpSetupForm({ qrCode, secret, error }: TotpSetupFormProps) {
  const [code, setCode] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = code.trim()
    if (trimmed.length < TOTP_CODE_LENGTH) {return}
    setSubmitting(true)
    router.post("/admin/totp/setup", { code: trimmed }, { onFinish: () => setSubmitting(false), preserveState: true })
  }

  return <div className="w-full max-w-sm">
    <TotpQrSection qrCode={qrCode} />
    <TotpManualEntry secret={secret} />
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-center text-mc-text-dim">After scanning, enter the {TOTP_CODE_LENGTH}-digit code from your app to confirm it&apos;s set up correctly.</p>
      <TotpCodeInput value={code} onChange={setCode} error={error} />
      <Button type="submit" className="w-full" disabled={code.length < TOTP_CODE_LENGTH} busy={submitting}>{submitting ? "Verifying..." : "Enable two-factor authentication"}</Button>
    </form>
  </div>
}
