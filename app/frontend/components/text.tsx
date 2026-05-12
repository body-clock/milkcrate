import React from "react"

// ── Types ─────────────────────────────────────────────────────────────────

export type TextVariant =
  | "display"       // h1 — wordmark, main heading
  | "section-name"  // h2 — crate names, section titles (accent color)
  | "section-count" // span — count/dim metadata next to section name
  | "body"          // p — prose, descriptions, extended reading
  | "label"         // span — form labels, nav links, metadata chips
  | "dim"           // span — secondary text, hints, placeholders

type TextElement = "h1" | "h2" | "h3" | "h4" | "p" | "span" | "label" | "div"

interface TextProps {
  variant: TextVariant
  as?: TextElement
  className?: string
  children: React.ReactNode
  [key: string]: unknown
}

// ── Variant → Tailwind classes ────────────────────────────────────────────

const variantClasses: Record<TextVariant, string> = {
  display:
    "font-mc-display text-mc-display font-bold tracking-mc-display uppercase",
  "section-name":
    "font-mc-display text-mc-section font-bold tracking-mc-section uppercase text-mc-accent",
  "section-count":
    "font-mc-display text-mc-label tracking-mc-label uppercase text-mc-text-dim",
  body:
    "font-mc-body text-mc-body leading-mc-body",
  label:
    "font-mc-display text-mc-label tracking-mc-label uppercase text-mc-text-dim",
  dim:
    "text-mc-label text-mc-text-dim",
}

const defaultElement: Record<TextVariant, TextElement> = {
  display:        "h1",
  "section-name": "h2",
  "section-count": "span",
  body:            "p",
  label:           "span",
  dim:             "span",
}

// ── Component ─────────────────────────────────────────────────────────────

/**
 * Single typography primitive. Every text string in the app routes through
 * this component so font, size, tracking, and color are locked to the
 * DESIGN.md scale. Use `as` to change the HTML element without changing the
 * visual style.
 *
 * @example
 *   <Text variant="display">🥛 Milkcrate</Text>
 *   <Text variant="section-name">Featured Crates</Text>
 *   <Text variant="section-count">12 crates</Text>
 *   <Text variant="body">A record store at golden hour.</Text>
 *   <Text variant="label" as="label" htmlFor="email">Email</Text>
 *   <Text variant="dim">Last synced 2 hours ago</Text>
 */
export default function Text({
  variant,
  as,
  className = "",
  children,
  ...rest
}: TextProps) {
  const Component = as ?? defaultElement[variant]

  return (
    <Component className={`${variantClasses[variant]} ${className}`} {...rest}>
      {children}
    </Component>
  )
}
