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

export function errorHeading(count: number): string {
  return count === 1
    ? "There's a problem with your submission."
    : `There are ${count} problems with your submission.`;
}

export default function ApplyErrorsList({
  errorCount,
  fieldErrors,
  copy,
}: {
  errorCount: number;
  fieldErrors: ErrorEntry[];
  copy: Copy;
}) {
  return (
    <FeedbackMessage tone="danger" live="assertive" className="px-4 py-3">
      <p className="font-semibold mb-1">{errorHeading(errorCount)}</p>
      <ul className="list-disc list-inside text-xs text-mc-text-dim space-y-0.5">
        {renderErrors(fieldErrors, copy)}
      </ul>
    </FeedbackMessage>
  );
}
