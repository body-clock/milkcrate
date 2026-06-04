import { Link } from "@inertiajs/react";

interface DashboardHeaderProps {
  storefrontUrl: string;
}

const linkClasses =
  "rounded text-xs text-mc-text-dim transition-colors hover:text-mc-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus";

const storeLinkClasses =
  "rounded text-xs text-mc-accent transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus";

export default function DashboardHeader({ storefrontUrl }: DashboardHeaderProps) {
  return (
    <header className="mc-header flex items-center justify-between border-b border-mc-border px-4 py-3 sticky top-0 z-30 bg-mc-bg-raised/95 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <Link href="/" className={linkClasses}>
          ← Home
        </Link>
        <h1 className="text-sm font-bold tracking-wider uppercase text-mc-text">Store Dashboard</h1>
      </div>
      <a href={storefrontUrl} className={storeLinkClasses}>
        View storefront ↗
      </a>
    </header>
  );
}
