import { Link } from "@inertiajs/react";

const linkClass =
  "rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg";

export function StoreNameLink({ username }: { username: string }) {
  return (
    <Link href={`/${username}`} className={linkClass}>
      <span className="mc-brand-title block truncate text-base font-bold text-mc-text">
        {username}
      </span>
    </Link>
  );
}
