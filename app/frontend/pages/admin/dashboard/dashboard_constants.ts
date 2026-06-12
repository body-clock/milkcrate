import type { AdminStoreSummary } from "@/types/inertia";

/** Health keys that map to the "Attention" section on the dashboard. */
export const ATTENTION_HEALTH_KEYS = new Set(["failed", "stale", "partial"]);

/** Health keys that allow a resync action. */
export const RESYNCABLE_HEALTH_KEYS = new Set(["failed", "stale", "processing"]);

/** Filter key type — the set of valid health filter values. */
export type HealthFilterKey =
  | "healthy"
  | "processing"
  | "attention"
  | "failed"
  | "stale"
  | "partial";

/** Array of active health filter keys. Empty means show all. */
export type HealthFilter = HealthFilterKey[];

/** Whether a store can be resynced based on its health state. */
export function canResync(store: AdminStoreSummary): boolean {
  return RESYNCABLE_HEALTH_KEYS.has(store.health.key);
}

/**
 * Format an ISO 8601 timestamp for display.
 * Returns null when value is null (caller decides how to handle).
 */
export function formatAdminTime(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
