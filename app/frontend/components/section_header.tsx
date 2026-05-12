export type SectionHeaderVariant = "hero" | "default"

interface Props {
  title: string
  count?: string | number
  variant?: SectionHeaderVariant
  className?: string
}

const variantClasses: Record<SectionHeaderVariant, string> = {
  hero: "text-xl border-t-2 border-t-mc-accent border-b-2 border-b-mc-accent py-3",
  default: "text-base border-b border-mc-border",
}

export default function SectionHeader({ title, count, variant = "default", className = "" }: Props) {
  const variantClass = variantClasses[variant]

  return (
    <div className={`flex items-center justify-between gap-2 py-2 mb-4 ${variantClass} ${className}`}>
      <span className="mc-section-name font-semibold">{title}</span>
      {count !== undefined && <span className="mc-section-count">{count}</span>}
    </div>
  )
}
