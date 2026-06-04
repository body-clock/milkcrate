import Button from "../ui/button";
import FeedbackMessage from "../ui/feedback_message";

export function WantlistInProgressView({ count }: { count: number }) {
  return (
    <FeedbackMessage tone="progress" live="polite" className="flex flex-col gap-2">
      <Button busy size="lg" className="w-full">
        Adding to Wantlist…
      </Button>
      <p className="text-[11px] text-mc-text-dim text-center">
        Adding {count} {count === 1 ? "release" : "releases"} to your Wantlist
      </p>
    </FeedbackMessage>
  );
}
