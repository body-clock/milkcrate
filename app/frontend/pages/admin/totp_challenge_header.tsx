import BrandMark from "@/components/brand_mark"

interface TotpChallengeHeaderProps {
  title: string
  subtitle: string
}

export function TotpChallengeHeader({ title, subtitle }: TotpChallengeHeaderProps) {
  return (
    <div className="mb-8 text-center">
      <BrandMark className="mb-2" />
      <h1 className="text-xl font-semibold text-mc-text">{title}</h1>
      <p className="mt-1 text-sm text-mc-text-dim">{subtitle}</p>
    </div>
  )
}
