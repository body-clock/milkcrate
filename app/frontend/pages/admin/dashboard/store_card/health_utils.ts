export function severityVariant(severity: string) {
  return severity as "good" | "working" | "warning" | "danger" | "neutral";
}
