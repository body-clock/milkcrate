function formatDate(dateStr: string | null, options: Intl.DateTimeFormatOptions): string {
  if (!dateStr) {
    return "—";
  }
  return new Intl.DateTimeFormat(undefined, options).format(new Date(dateStr));
}

export function formatLastSynced(dateStr: string | null): string {
  if (!dateStr) {
    return "Never";
  }
  return formatDate(dateStr, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
