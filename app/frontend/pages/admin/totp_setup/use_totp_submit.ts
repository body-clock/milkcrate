import { router } from "@inertiajs/react";
import { useState } from "react";

import { TOTP_CODE_LENGTH } from "@/pages/admin/totp_code_input";

export function useTotpSubmit(path: string) {
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
