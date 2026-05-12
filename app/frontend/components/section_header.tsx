import Text from "@/components/text"

export type SectionHeaderVariant = "hero" | "default"

interface Props {
  title: string
  count?: string | number
  variant?: SectionHeaderVariant
  className?: string
}

const variantClasses: Record<SectionHeaderVariant, string> = {
  hero: "border-t-2 border-t-mc-accent border-b-2 border-b-mc-accent py-3",
  default: "border-b border-mc-border",
}

export default function SectionHeader({ title, count, variant = "default", className = "" }: Props) {
  const variantClass = variantClasses[variant]

  return (
    <div className={`flex items-center justify-between gap-2 py-2 mb-4 ${variantClass} ${className}`}>
      <Text variant="section-name" className={variant === "hero" ? "!text-mc-display" : ""}>
        {title}
      </Text>
      {count !== undefined && <Text variant="section-count">{count}</Text>}
    </div>
  )
}
