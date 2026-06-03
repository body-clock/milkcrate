import { router } from "@inertiajs/react";
import React, { useState } from "react";

import Button from "@/components/ui/button";
import { TotpCodeInput, TOTP_CODE_LENGTH } from "@/pages/admin/totp_code_input";
import { TotpManualEntry } from "@/pages/admin/totp_manual_entry";
import { TotpQrSection } from "@/pages/admin/totp_qr_section";

interface TotpSetupFormProps {
  qrCode: string;
  secret: string;
  error?: string;
}

// eslint-disable-next-line react/no-multi-comp
function useTotpSubmit(path: string) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length < TOTP_CODE_LENGTH) {
      return;
    }
    setSubmitting(true);
    router.post(
      path,
      { code: trimmed },
      { onFinish: () => setSubmitting(false), preserveState: true },
    );
  };

  return { code, setCode, submitting, handleSubmit };
}

// eslint-disable-next-line react/no-multi-comp
function SetupInstructions({ codeLength }: { codeLength: number }) {
  return (
    <p className="text-xs text-center text-mc-text-dim">
      After scanning, enter the {codeLength}-digit code from your app to confirm it&apos;s set up
      correctly.
    </p>
  );
}

// eslint-disable-next-line max-lines-per-function, react/no-multi-comp
export function TotpSetupForm({ qrCode, secret, error }: TotpSetupFormProps) {
  const { code, setCode, submitting, handleSubmit } = useTotpSubmit("/admin/totp/setup");

  return (
    <div className="w-full max-w-sm">
      <TotpQrSection qrCode={qrCode} />
      <TotpManualEntry secret={secret} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <SetupInstructions codeLength={TOTP_CODE_LENGTH} />
        <TotpCodeInput value={code} onChange={setCode} error={error} />
        <Button
          type="submit"
          className="w-full"
          disabled={code.length < TOTP_CODE_LENGTH}
          busy={submitting}
        >
          {submitting ? "Verifying..." : "Enable two-factor authentication"}
        </Button>
      </form>
    </div>
  );
}
