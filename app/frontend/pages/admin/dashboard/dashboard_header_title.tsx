import { router } from "@inertiajs/react";

export function DashboardHeaderTitle() {
  return (
    <div className="flex items-baseline gap-4">
      <div>
        <p className="text-xs font-medium tracking-wide text-mc-text-dim">
          Milkcrate admin
        </p>
        <h1 className="mt-2 text-2xl font-bold text-mc-text sm:text-3xl">
          Store operations
        </h1>
      </div>
      <button
        onClick={() => router.delete("/admin/logout")}
        className="shrink-0 text-xs text-mc-text-dim underline hover:text-mc-text transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
