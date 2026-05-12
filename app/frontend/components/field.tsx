import React from "react"
import Text from "@/components/text"

// ── Types ─────────────────────────────────────────────────────────────────

interface FieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> {
  /** Visible label above the input. */
  label: string
  /** Error message displayed below the input in accent color. */
  error?: string
  className?: string
}

// ── Component ─────────────────────────────────────────────────────────────

/**
 * Form field primitive — composes a DESIGN.md label + input. The input
 * inherits the `.mc-input` styling (serif body font, 2px radius, border
 * focus accent shift).
 *
 * @example
 *   <Field label="Store name" name="store_name" placeholder="My Record Shop" />
 *   <Field label="Email" type="email" required error="Email is required" />
 */
export default function Field({
  label,
  error,
  className = "",
  id,
  ...inputProps
}: FieldProps) {
  const fieldId = id ?? inputProps.name

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Text
        variant="label"
        as="label"
        htmlFor={fieldId}
      >
        {label}
      </Text>
      <input id={fieldId} className="mc-input" {...inputProps} />
      {error && (
        <Text variant="dim" className="!text-mc-accent !text-mc-label-sm">
          {error}
        </Text>
      )}
    </div>
  )
}
