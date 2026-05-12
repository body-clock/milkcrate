export type SectionHeaderVariant = "hero" | "feature" | "compact"

interface Props {
  title: string
  count?: string | number
  variant?: SectionHeaderVariant
  className?: string
}

const variantClasses: Record<SectionHeaderVariant, string> = {
  hero: "text-xl border-b-2 border-mc-accent",
  feature: "text-base border-b border-mc-border",
  compact: "text-sm border-b border-mc-border",
}

export default function SectionHeader({ title, count, variant = "feature", className = "" }: Props) {
  const variantClass = variantClasses[variant]

  return (
    <div className={`flex items-center justify-between gap-2 pb-2 mb-4 ${variantClass} ${className}`}>
      <span className="mc-section-name font-semibold">{title}</span>
      {count !== undefined && <span className="mc-section-count">{count}</span>}
    </div>
  )
}
