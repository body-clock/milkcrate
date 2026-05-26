import React from "react"
import { actionClassName, type ActionSize, type ActionVariant } from "./action"

export default function Button({
  variant = "primary",
  size = "md",
  busy = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ActionVariant
  size?: ActionSize
  busy?: boolean
}) {
  return (
    <button
      type={type}
      className={actionClassName({ variant, size, className })}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {children}
    </button>
  )
}
