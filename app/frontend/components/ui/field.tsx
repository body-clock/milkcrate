import React, { useId } from "react"
import { cn } from "./class_names"

type FieldControlProps = {
  "aria-busy"?: boolean | "true" | "false"
  "aria-describedby"?: string
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling"
  className?: string
  disabled?: boolean
  id?: string
}

export const fieldControlClassName =
  "min-h-10 w-full rounded-md border border-mc-border bg-mc-bg px-3 py-2 text-sm text-mc-text outline-none transition-colors placeholder:text-mc-text-dim focus:border-mc-focus focus:ring-2 focus:ring-mc-focus/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-mc-feedback-danger-border aria-invalid:focus:ring-mc-feedback-danger/40"

export default function Field({
  id,
  label,
  hint,
  error,
  busy = false,
  disabled = false,
  className,
  children,
}: {
  id?: string
  label: string
  hint?: string
  error?: string
  busy?: boolean
  disabled?: boolean
  className?: string
  children: React.ReactElement<FieldControlProps>
}) {
  const generatedId = useId()
  const controlId = children.props.id ?? id ?? generatedId
  const hintId = hint ? `${controlId}-hint` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const describedBy = [children.props["aria-describedby"], hintId, errorId].filter(Boolean).join(" ") || undefined

  const control = React.cloneElement(children, {
    id: controlId,
    className: cn(fieldControlClassName, children.props.className),
    disabled: children.props.disabled || disabled || busy,
    "aria-busy": busy || children.props["aria-busy"],
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : children.props["aria-invalid"],
  })

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline gap-2">
        <label htmlFor={controlId} className="text-xs font-normal uppercase tracking-widest text-mc-text-dim">
          {label}
        </label>
        {hint && <span id={hintId} className="text-[10px] text-mc-text-dim">{hint}</span>}
      </div>
      {control}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-mc-feedback-danger">
          {error}
        </p>
      )}
    </div>
  )
}
