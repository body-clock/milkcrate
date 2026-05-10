import { motion } from "framer-motion"
import { usePileContext } from "@/contexts/pile_context"
import { springTactile } from "@/lib/motion_tokens"

export type TabId = "browse" | "genres" | "pile"

interface Props {
  activeTab: TabId
  pileOpen: boolean
  onSelect: (tab: TabId) => void
}

export default function MobileTabBar({ activeTab, pileOpen, onSelect }: Props) {
  const { pile } = usePileContext()
  const pileCount = pile.length

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-mc-bg/95 backdrop-blur-sm border-t border-mc-border flex items-stretch"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", height: "calc(56px + env(safe-area-inset-bottom, 0px))" }}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <TabButton id="browse" label="Browse" active={activeTab === "browse"} onClick={() => onSelect("browse")} />
      <TabButton id="genres" label="Genres" active={activeTab === "genres"} onClick={() => onSelect("genres")} />
      <TabButton
        id="pile"
        label="Pile"
        active={activeTab === "pile" || pileOpen}
        badge={pileCount > 0 ? pileCount : undefined}
        onClick={() => onSelect("pile")}
      />
    </nav>
  )
}

function TabButton({
  id,
  label,
  active,
  badge,
  onClick,
}: {
  id: TabId
  label: string
  active: boolean
  badge?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 flex flex-col items-center justify-center gap-0.5 relative text-[10px] font-medium select-none transition-colors"
      style={{ color: active ? "var(--mc-accent)" : "var(--mc-text-dim)", WebkitTapHighlightColor: "transparent" }}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      {active && (
        <motion.div
          layoutId="tab-indicator"
          className="absolute top-0 left-4 right-4 h-0.5 bg-mc-accent rounded-full"
          transition={springTactile}
        />
      )}
      <span className="text-lg leading-none">{
        id === "browse" ? "🏠" :
        id === "genres" ? "🎸" :
        "📦"
      }</span>
      <span className="leading-tight">{label}</span>
      {badge !== undefined && (
        <span className="absolute top-1 right-1/4 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-mc-accent text-white text-[9px] font-bold leading-none px-1">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  )
}
