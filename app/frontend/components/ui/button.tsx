import React from "react"
import { cn } from "./class_names"

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"

const variants: Record<ButtonVariant, string> = {
  primary: "bg-mc-accent text-mc-on-accent hover:opacity-90",
  secondary: "border border-mc-border bg-mc-bg-card text-mc-text hover:bg-mc-bg-raised",
  ghost: "text-mc-text-dim hover:bg-mc-bg-raised hover:text-mc-text",
  danger: "border border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/15",
}

export default function Button({
  variant = "primary",
  className,
  children,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
