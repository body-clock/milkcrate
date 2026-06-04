import { Link } from "@inertiajs/react";

const linkClass =
  "rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg";

export function StoreSubLink({ isCompact }: { isCompact: boolean }) {
  return (
    <Link href="/" className={linkClass}>
      <span className="text-[10px] tracking-widest uppercase text-mc-text-dim">
        {isCompact ? "on MC" : "on Milkcrate"}
      </span>
    </Link>
  );
}
