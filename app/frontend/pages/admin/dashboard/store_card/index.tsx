import type { AdminStoreSummary } from "@/types/inertia";
import Badge from "@/components/ui/badge";
import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card_header";
import CardContent from "@/components/ui/card_content";
import FeedbackMessage from "@/components/ui/feedback_message";
import StoreHealthBar from "./health_bar";
import { severityVariant } from "./health_bar";
import StoreInfo from "./store_info";

export default function StoreCard({ store }: { store: AdminStoreSummary }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <StoreInfo store={store} />
        <Badge variant={severityVariant(store.health.severity)}>{store.health.label}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <StoreHealthBar store={store} />
        {store.health.last_sync_error_summary && (
          <FeedbackMessage tone="danger" live="assertive">
            {store.health.last_sync_error_summary}
          </FeedbackMessage>
        )}
      </CardContent>
    </Card>
  );
}
