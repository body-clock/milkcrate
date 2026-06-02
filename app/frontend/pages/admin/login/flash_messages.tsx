import FeedbackMessage from "@/components/ui/feedback_message";

export default function FlashMessages({ notice, alert }: { notice?: string; alert?: string }) {
  return (
    <>
      {notice && (
        <div className="mb-4">
          <FeedbackMessage tone="success" live="polite">
            {notice}
          </FeedbackMessage>
        </div>
      )}
      {alert && (
        <div className="mb-4">
          <FeedbackMessage tone="danger" live="assertive">
            {alert}
          </FeedbackMessage>
        </div>
      )}
    </>
  );
}
