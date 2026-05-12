export type SectionHeaderVariant = "hero" | "feature" | "compact"
export type SectionHeaderAccent = "top" | "left"

interface Props {
  title: string
  count?: string | number
  variant?: SectionHeaderVariant
  borderAccent?: SectionHeaderAccent
  className?: string
}

const variantClasses: Record<SectionHeaderVariant, string> = {
  hero: "text-xl border-b-2 border-mc-accent",
  feature: "text-base border-b border-mc-border",
  compact: "text-sm border-b border-mc-border",
}

const accentClasses: Record<SectionHeaderAccent, string> = {
  top: "border-t-2 border-mc-accent py-3",
  left: "border-l-[3px] border-l-mc-accent pl-3",
}

export default function SectionHeader({ title, count, variant = "feature", borderAccent, className = "" }: Props) {
  const variantClass = variantClasses[variant]
  const accentClass = borderAccent ? accentClasses[borderAccent] : ""

  return (
    <div className={`flex items-center justify-between gap-2 py-2 mb-4 ${variantClass} ${accentClass} ${className}`}>
      <span className="mc-section-name font-semibold">{title}</span>
      {count !== undefined && <span className="mc-section-count">{count}</span>}
    </div>
  )
}
