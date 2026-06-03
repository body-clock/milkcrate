import type { Copy, ErrorEntry } from "./types";

import ApplyErrorsList from "./apply_errors_list";

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
  return <ApplyErrorsList errorCount={errorCount} fieldErrors={fieldErrors} copy={copy} />;
}
