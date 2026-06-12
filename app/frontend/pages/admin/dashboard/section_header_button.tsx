import Badge from "@/components/ui/badge";

export function SectionHeaderButton({
  label,
  severity,
  count,
  expanded,
  onClick,
}: {
  label: string;
  severity: "danger" | "working" | "good";
  count: number;
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2 text-left">
      <span
        className={`text-mc-text-dim transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
      >
        ›
      </span>
      <span className="text-lg font-bold text-mc-text">{label}</span>
      <Badge variant={severity}>{count}</Badge>
    </button>
  );
}
