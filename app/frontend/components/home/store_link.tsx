import { Link } from "@inertiajs/react";

import { actionClassName } from "@/components/ui/action";

export default function StoreLink({ storeSlug }: { storeSlug: string | null }) {
  const href = storeSlug ? `/${storeSlug}` : "/philadelphiamusic";
  return (
    <div className="flex justify-center mt-6">
      <Link
        href={href}
        className={actionClassName({
          variant: "ghost",
          size: "sm",
          className: "uppercase tracking-widest text-mc-accent",
        })}
      >
        See the full store →
      </Link>
    </div>
  );
}
