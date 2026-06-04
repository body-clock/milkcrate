import FeedbackMessage from "@/components/ui/feedback_message";

export function FlashBanner({ notice, alert }: { notice?: string | null; alert?: string | null }) {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-2 px-4 pt-6 sm:px-6 lg:px-8">
      {notice && (
        <FeedbackMessage tone="success" live="polite">
          {notice}
        </FeedbackMessage>
      )}
      {alert && (
        <FeedbackMessage tone="danger" live="assertive">
          {alert}
        </FeedbackMessage>
      )}
    </div>
  );
}
