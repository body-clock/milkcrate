import FeedbackMessage from "@/components/ui/feedback_message";
import type { Copy, ErrorEntry } from "./types";

export default function ApplyErrors({
  errorCount,
  fieldErrors,
  copy,
}: {
  errorCount: number;
  fieldErrors: ErrorEntry[];
  copy: Copy;
}) {
  if (errorCount === 0) {return null}

  return (
    <FeedbackMessage tone="danger" live="assertive" className="px-4 py-3">
      <p className="font-semibold mb-1">
        {errorCount === 1
          ? "There's a problem with your submission."
          : `There are ${errorCount} problems with your submission.`}
      </p>
      <ul className="list-disc list-inside text-xs text-mc-text-dim space-y-0.5">
        {fieldErrors.map(([field, errs]) =>
          errs.map((e, i) => {
            const label = copy.fields[field as keyof typeof copy.fields];
            return (
              <li key={`${field}-${i}`}>
                {label ? `${label} ` : ""}
                {e.error}
              </li>
            );
          }),
        )}
      </ul>
    </FeedbackMessage>
  );
}
