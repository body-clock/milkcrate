import React from "react"

interface Props {
  size?: number
  className?: string
}

// Option A: vinyl record — label-heavy proportions
export function LogoCircles({ size = 32, className = "" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Outer edge */}
      <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="2" />
      {/* Single groove ring — thin, close to edge */}
      <circle cx="16" cy="16" r="11.5" stroke="currentColor" strokeWidth="0.75" />
      {/* Label area — large inner fill */}
      <circle cx="16" cy="16" r="8" stroke="currentColor" strokeWidth="1.5" />
      {/* Spindle hole */}
      <circle cx="16" cy="16" r="1.5" fill="currentColor" />
    </svg>
  )
}

// Option B: crate side view — rectangle with lip and dividers
export function LogoCrate({ size = 32, className = "" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Outer crate body */}
      <rect x="2" y="8" width="28" height="20" rx="1.5" stroke="currentColor" strokeWidth="2" />
      {/* Top lip */}
      <line x1="2" y1="13" x2="30" y2="13" stroke="currentColor" strokeWidth="1.5" />
      {/* Vertical dividers — equal thirds */}
      <line x1="11.33" y1="13" x2="11.33" y2="28" stroke="currentColor" strokeWidth="1.5" />
      <line x1="20.67" y1="13" x2="20.67" y2="28" stroke="currentColor" strokeWidth="1.5" />
      {/* Horizontal mid divider */}
      <line x1="2" y1="20.5" x2="30" y2="20.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

// Option C: crate front-face grid — 2x2 cells with border
export function LogoCrateGrid({ size = 32, className = "" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Outer border */}
      <rect x="2" y="4" width="28" height="24" rx="1.5" stroke="currentColor" strokeWidth="2" />
      {/* Vertical center divider */}
      <line x1="16" y1="4" x2="16" y2="28" stroke="currentColor" strokeWidth="1.5" />
      {/* Horizontal center divider */}
      <line x1="2" y1="16" x2="30" y2="16" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
