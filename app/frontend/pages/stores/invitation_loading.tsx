import Spinner from "@/components/spinner";
import FeedbackMessage from "@/components/ui/feedback_message";

export default function InvitationLoading() {
  return (
    <FeedbackMessage
      tone="progress"
      live="polite"
      className="flex flex-col items-center border-0 bg-transparent"
    >
      <Spinner size="lg" className="mb-4" />
      <p>Checking if this URL is available...</p>
    </FeedbackMessage>
  );
}
