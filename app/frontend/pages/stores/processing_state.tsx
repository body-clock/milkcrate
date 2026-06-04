import Spinner from "@/components/spinner";
import FeedbackMessage from "@/components/ui/feedback_message";
import type { StoreShowProps } from "@/types/inertia";

interface Props {
  store: StoreShowProps["store"];
}

export default function ProcessingState({ store }: Props) {
  return (
    <FeedbackMessage
      tone="progress"
      live="polite"
      className="border-0 bg-transparent py-16 text-center"
    >
      <Spinner size="lg" className="mx-auto mb-4" />
      <p className="text-sm">
        {store.sync_status === "syncing"
          ? "Syncing inventory… check back in a moment."
          : "Setting up your store… check back in a moment."}
      </p>
    </FeedbackMessage>
  );
}
