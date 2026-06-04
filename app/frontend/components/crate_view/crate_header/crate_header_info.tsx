import type { Crate } from "../../../types/inertia";

export function CrateHeaderInfo({
  activeCrate,
  total,
}: {
  activeCrate: Crate | undefined;
  total: number;
}) {
  return (
    <div className="min-w-0 flex-1">
      <h1 className="truncate text-base font-semibold leading-tight">{activeCrate?.name}</h1>
      <div className="text-[11px] uppercase tracking-[0.12em] text-mc-text-dim">
        {total === 1 ? "1 record" : `${total} records`}
      </div>
    </div>
  );
}
