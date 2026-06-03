import { router } from "@inertiajs/react";
import React, { useState, useRef } from "react";

import Button from "@/components/ui/button";
import { TotpCodeInput, TOTP_CODE_LENGTH } from "@/pages/admin/totp_code_input";
import { TotpLogoutLink } from "@/pages/admin/totp_logout_link";

interface TotpChallengeFormProps {
  error?: string;
}

function useTotpChallengeSubmit() {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length < TOTP_CODE_LENGTH) {
      return;
    }
    setSubmitting(true);
    router.post(
      "/admin/totp",
      { code: trimmed },
      { onFinish: () => setSubmitting(false), preserveState: true },
    );
  };

  return { code, setCode, submitting, inputRef, handleSubmit };
}

// eslint-disable-next-line max-lines-per-function
export function TotpChallengeForm({ error }: TotpChallengeFormProps) {
  const { code, setCode, submitting, inputRef, handleSubmit } = useTotpChallengeSubmit();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TotpCodeInput
        ref={inputRef}
        value={code}
        onChange={setCode}
        error={error}
        autoComplete="one-time-code"
      />
      <Button
        type="submit"
        className="w-full"
        disabled={code.length < TOTP_CODE_LENGTH}
        busy={submitting}
      >
        {submitting ? "Verifying..." : "Verify"}
      </Button>
      <TotpLogoutLink />
    </form>
  );
}
