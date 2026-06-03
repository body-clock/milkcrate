import { Link } from "@inertiajs/react";

import { actionClassName } from "@/components/ui/action";

export default function PreviewFallback() {
  return (
    <div className="text-center max-w-md mx-auto">
      <p className="text-sm text-mc-text-dim mb-4">
        We&apos;ll show the full Milkcrate experience in the demo store. Start with a curated wall
        crate.
      </p>
      <Link
        href="/philadelphiamusic"
        className={actionClassName({
          variant: "ghost",
          size: "sm",
          className: "uppercase tracking-widest text-mc-accent",
        })}
      >
        Philadelphia Music →
      </Link>
    </div>
  );
}
