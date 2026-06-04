import StatusDot from "@/components/ui/status_dot";

import Row from "./row";

export default function SyncStatusRow({
  variant,
  label,
}: {
  variant: "danger" | "working" | "neutral";
  label: string;
}) {
  return (
    <Row dt="Sync status">
      <StatusDot variant={variant} label={label} />
    </Row>
  );
}
