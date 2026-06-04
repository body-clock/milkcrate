import Button from "../ui/button";
import FeedbackMessage from "../ui/feedback_message";

export function WantlistErrorView({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <FeedbackMessage tone="danger" live="assertive" className="flex flex-col gap-2">
      <p className="text-xs font-medium">{message || "Something went wrong."}</p>
      <Button onClick={onRetry} variant="secondary" size="lg" className="w-full">
        Try again
      </Button>
    </FeedbackMessage>
  );
}
