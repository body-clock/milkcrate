

import FeedbackMessage from "@/components/ui/feedback_message";

interface ExploreErrorStateProps {
  message: string;
  onRetry?: () => void;
}

/**
 * Error state for the explore page.
 *
 * Displays the error message in a feedback banner with an optional retry action.
 */
export default function ExploreErrorState({ message, onRetry }: ExploreErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-8" role="alert">
      <FeedbackMessage tone="danger" live="assertive" className="max-w-md text-center">
        {message}
      </FeedbackMessage>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-medium text-mc-accent underline underline-offset-2 transition-colors hover:text-mc-accent/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus/40 rounded"
        >
          Try again
        </button>
      )}
    </div>
  );
}
