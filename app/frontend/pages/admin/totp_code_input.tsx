import { forwardRef, type KeyboardEvent } from "react";

import Field from "@/components/ui/field";

export const TOTP_CODE_LENGTH = 6;

export function handleTotpKeyDown(e: KeyboardEvent<HTMLInputElement>) {
  // Allow only digits, backspace, delete, tab, arrows
  if (
    /^\d$/.test(e.key) ||
    ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
  ) {
    return;
  }
  e.preventDefault();
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "").slice(0, TOTP_CODE_LENGTH);
}

interface TotpCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: string;
}

export const TotpCodeInput = forwardRef<HTMLInputElement, TotpCodeInputProps>(
  ({ value, onChange, error, autoComplete = "off" }, ref) => (
    <Field id="totp-code-input" label="Authentication code" error={error}>
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        name="code"
        value={value}
        onChange={(e) => onChange(digitsOnly(e.target.value))}
        onKeyDown={handleTotpKeyDown}
        placeholder="000000"
        autoComplete={autoComplete}
        autoFocus
        required
        className="text-center text-2xl tracking-[0.5em] font-mono"
        maxLength={TOTP_CODE_LENGTH}
      />
    </Field>
  ),
);
