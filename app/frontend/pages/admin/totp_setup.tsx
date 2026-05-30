import React, { useState, type KeyboardEvent } from "react";
import { router } from "@inertiajs/react";
import Button from "@/components/ui/button";
import Field from "@/components/ui/field";
import FeedbackMessage from "@/components/ui/feedback_message";
import BrandMark from "@/components/brand_mark";

interface TotpSetupErrors {
  code?: string[];
}

interface TotpSetupPageProps {
  qr_code: string;
  secret: string;
  already_enabled: boolean;
  errors?: TotpSetupErrors;
  notice?: string;
  alert?: string;
}

export default function AdminTotpSetup({
  qr_code,
  secret,
  already_enabled,
  errors,
  notice,
  alert,
}: TotpSetupPageProps) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length < 6) return;

    setSubmitting(true);
    router.post(
      "/admin/totp/setup",
      { code: trimmed },
      {
        onFinish: () => setSubmitting(false),
        preserveState: true,
      },
    );
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (
      /^\d$/.test(e.key) ||
      ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
    ) {
      return;
    }
    e.preventDefault();
  }

  // Already set up — admins should not be re-prompted to set up
  if (already_enabled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mc-bg px-4">
        <div className="w-full max-w-sm text-center">
          <BrandMark className="mb-2" />
          <h1 className="text-xl font-semibold text-mc-text">Already set up</h1>
          <p className="mt-2 text-sm text-mc-text-dim">
            Two-factor authentication is already active on this account.
          </p>
          <div className="mt-6">
            <Button onClick={() => router.get("/admin/totp")}>Enter authentication code</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-mc-bg px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <BrandMark className="mb-2" />
          <h1 className="text-xl font-semibold text-mc-text">Set up two-factor authentication</h1>
          <p className="mt-1 text-sm text-mc-text-dim">
            Scan this QR code with your authenticator app
          </p>
        </div>

        {/* Flash messages */}
        {notice && (
          <div className="mb-4">
            <FeedbackMessage tone="success" live="polite">
              {notice}
            </FeedbackMessage>
          </div>
        )}
        {alert && (
          <div className="mb-4">
            <FeedbackMessage tone="danger" live="assertive">
              {alert}
            </FeedbackMessage>
          </div>
        )}

        {/* QR Code */}
        <div className="mb-6 flex justify-center">
          <div className="rounded-lg border border-mc-border bg-white p-4">
            <img src={qr_code} alt="QR code for authenticator app setup" className="h-48 w-48" />
          </div>
        </div>

        {/* Manual entry fallback */}
        <div className="mb-6 text-center">
          <p className="text-xs text-mc-text-dim">
            Can&apos;t scan the code? Manually enter this key:
          </p>
          <code className="mt-1 block rounded bg-mc-bg-card px-3 py-2 text-xs font-mono tracking-wider text-mc-text select-all">
            {secret.match(/.{1,4}/g)?.join(" ") ?? secret}
          </code>
        </div>

        {/* Verification */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-center text-mc-text-dim">
            After scanning, enter the 6-digit code from your app to confirm it&apos;s set up
            correctly.
          </p>

          <Field id="totp-setup-code" label="Verification code" error={errors?.code?.[0]}>
            <input
              type="text"
              inputMode="numeric"
              name="code"
              value={code}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(digitsOnly);
              }}
              onKeyDown={handleKeyDown}
              placeholder="000000"
              autoComplete="off"
              autoFocus
              required
              className="text-center text-2xl tracking-[0.5em] font-mono"
              maxLength={6}
            />
          </Field>

          <Button type="submit" className="w-full" disabled={code.length < 6} busy={submitting}>
            {submitting ? "Verifying..." : "Enable two-factor authentication"}
          </Button>
        </form>
      </div>
    </div>
  );
}
