import React from "react"
import { motion } from "framer-motion"
import { useTactileHover } from "@/hooks/use_tactile_hover"
import {
  springTactile,
  springPress,
  SCALE_HOVER,
  SCALE_PRESS,
} from "@/lib/motion_tokens"

// ── Types ─────────────────────────────────────────────────────────────────

export type ButtonVariant = "primary" | "ghost"
export type ButtonSize = "default" | "icon"

interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  /** Render as an anchor instead of a button. */
  href?: string
  /** When true and href is set, opens in a new tab. */
  external?: boolean
  type?: "button" | "submit" | "reset"
  onClick?: (e: React.MouseEvent) => void
  className?: string
  children: React.ReactNode
  "aria-label"?: string
  "aria-expanded"?: boolean
  "aria-controls"?: string
}

// ── Style maps ────────────────────────────────────────────────────────────

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    "bg-mc-accent text-mc-on-accent rounded-mc-gentle",
    "font-mc-display text-mc-btn-lg font-semibold",
    "tracking-mc-label uppercase",
  ].join(" "),
  ghost: [
    "bg-transparent text-mc-text-dim rounded-mc-sharp",
    "font-mc-display text-mc-btn",
    "tracking-mc-label uppercase",
    "border border-transparent",
  ].join(" "),
}

const sizeStyles: Record<ButtonSize, string> = {
  default: "px-6 py-3",
  icon: "w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full",
}

// ── Component ─────────────────────────────────────────────────────────────

/**
 * Single interactive trigger primitive. Renders a `<button>` by default or
 * an `<a>` when `href` is provided. Includes tactile hover/press animation
 * via Framer Motion. Respects `prefers-reduced-motion` automatically.
 *
 * @example
 *   <Button variant="primary">Dig In</Button>
 *   <Button variant="ghost" href="https://discogs.com" external>Discogs ↗</Button>
 *   <Button variant="ghost" size="icon" aria-label="Toggle theme">☀︎</Button>
 */
export default function Button({
  variant = "ghost",
  size = "default",
  disabled = false,
  href,
  external,
  type = "button",
  onClick,
  className = "",
  children,
  ...aria
}: ButtonProps) {
  const { isHovered, isPressed, handlers } = useTactileHover()

  const baseClasses = [
    "inline-flex items-center justify-center",
    "select-none",
    "transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg",
    disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
    variantStyles[variant],
    sizeStyles[size],
    className,
  ]
    .filter(Boolean)
    .join(" ")

  const animate = disabled
    ? {}
    : {
        scale:
          isPressed
            ? SCALE_PRESS
            : isHovered && size !== "icon"
              ? SCALE_HOVER
              : 1,
        y: isHovered && size !== "icon" ? -2 : 0,
        borderColor:
          variant === "ghost" && isHovered
            ? "var(--mc-accent)"
            : "transparent",
        color:
          variant === "ghost" && isHovered
            ? "var(--mc-accent)"
            : undefined,
      }

  const transition = isPressed ? springPress : springTactile

  // ── Anchor variant ──────────────────────────────────────────────

  if (href) {
    return (
      <motion.a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={baseClasses}
        animate={animate}
        transition={transition}
        onClick={onClick}
        {...handlers}
        {...aria}
      >
        {children}
      </motion.a>
    )
  }

  // ── Button variant ──────────────────────────────────────────────

  return (
    <motion.button
      type={type}
      disabled={disabled}
      className={baseClasses}
      animate={animate}
      transition={transition}
      onClick={onClick}
      {...handlers}
      {...aria}
    >
      {children}
    </motion.button>
  )
}
