import FeedbackMessage from "@/components/ui/feedback_message";

import type { Copy, ErrorEntry } from "./types";

function renderErrors(fieldErrors: ErrorEntry[], copy: Copy) {
  return fieldErrors.flatMap(([field, errs]) =>
    errs.map((e) => {
      const fieldKey = `${field}-${e.error}`;
      const label = copy.fields[field as keyof typeof copy.fields];
      return (
        <li key={fieldKey}>
          {label ? `${label} ` : ""}
          {e.error}
        </li>
      );
    }),
  );
}

// eslint-disable-next-line max-lines-per-function
export default function ApplyErrors({
  errorCount,
  fieldErrors,
  copy,
}: {
  errorCount: number;
  fieldErrors: ErrorEntry[];
  copy: Copy;
}) {
  if (errorCount === 0) {
    return null;
  }
  const heading =
    errorCount === 1
      ? "There's a problem with your submission."
      : `There are ${errorCount} problems with your submission.`;
  return (
    <FeedbackMessage tone="danger" live="assertive" className="px-4 py-3">
      <p className="font-semibold mb-1">{heading}</p>
      <ul className="list-disc list-inside text-xs text-mc-text-dim space-y-0.5">
        {renderErrors(fieldErrors, copy)}
      </ul>
    </FeedbackMessage>
  );
}
