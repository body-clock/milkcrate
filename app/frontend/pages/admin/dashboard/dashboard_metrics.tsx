import Metric from "@/components/ui/metric";
import type { AdminDashboardProps } from "@/types/inertia";

const metricClass = "rounded-lg border border-mc-border bg-mc-bg-card px-3 py-2";

export function DashboardMetrics({
  active_stores,
}: {
  active_stores: AdminDashboardProps["active_stores"];
}) {
  const healthyCount = active_stores.filter((store) => store.health.key === "healthy").length;
  const attentionCount = active_stores.filter((store) =>
    ["failed", "stale", "partial"].includes(store.health.key),
  ).length;
  const processingCount = active_stores.filter((store) => store.health.key === "processing").length;

  return (
    <dl className="grid grid-cols-3 gap-2 sm:min-w-80">
      <Metric label="Healthy" value={healthyCount} className={metricClass} />
      <Metric label="Processing" value={processingCount} className={metricClass} />
      <Metric label="Attention" value={attentionCount} className={metricClass} />
    </dl>
  );
}
